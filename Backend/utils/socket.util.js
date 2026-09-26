const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { verifyToken: verifyJWT } = require('./jwt.util');
const { pool } = require('./db.util');
const { verifyAdminAccessToken } = require('../middleware/adminAuth.middleware');

let io = null;

/**
 * Initialize Socket.io Server attached to HTTP Server
 */
function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow mobile apps (no origin/exp://) or any allowed domain
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Socket Authentication & Room Assignment Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
                    socket.handshake.query?.token;
      const requestedRole = String(socket.handshake.auth?.role || socket.handshake.query?.role || 'USER').toUpperCase();

      if (requestedRole === 'ADMIN' || requestedRole === 'SUPPORT') {
        if (!token) return next(new Error('Admin authentication required'));
        try {
          const admin = verifyAdminAccessToken(token);
          socket.userId = String(admin.sub);
          socket.role = requestedRole;
          socket.adminId = String(admin.sub);
          return next();
        } catch {
          return next(new Error('Invalid admin access token'));
        }
      }

      let explicitUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

      if (!token && !explicitUserId) {
        // Guest / anonymous socket connection allowed
        socket.userId = null;
        socket.userAuthenticated = false;
        return next();
      }

      let resolvedUserId = explicitUserId ? String(explicitUserId).trim() : null;
      socket.userAuthenticated = false;

      if (token) {
        try {
          // 1. First attempt: standard verify with jwt.util
          const decoded = verifyJWT(token);
          if (decoded) {
            resolvedUserId = decoded.key || decoded.id || decoded.userId || decoded.userKey || decoded.sub || resolvedUserId;
            socket.userAuthenticated = true;
          }
        } catch (verifyErr) {
          // 2. Second attempt: direct verify with secret fallbacks
          try {
            const secret = process.env.JWTSecret || process.env.JWT_SECRET || 'hackcelestial-super-secret-jwt-key';
            const decoded = jwt.verify(token, secret);
            if (decoded) {
              resolvedUserId = decoded.key || decoded.id || decoded.userId || decoded.userKey || decoded.sub || resolvedUserId;
              socket.userAuthenticated = true;
            }
          } catch (secErr) {
            console.warn('[Socket.io] User socket token could not be verified:', secErr.message);
          }
        }
      }

      // If token is short (e.g. plain UUID or username), treat as direct ID fallback
      if (!resolvedUserId && token && typeof token === 'string' && token.length < 50 && !token.includes('.')) {
        resolvedUserId = token.trim();
      }

      socket.userId = resolvedUserId;
      socket.role = requestedRole;
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (userId && socket.userAuthenticated) {
      socket.join(`user:${userId}`);
      socket.join(`user_${userId}`);
      socket.join(String(userId));
      console.log(`⚡ [Socket.io] Client connected: ${socket.id} (User: ${userId}) -> Joined Rooms: user:${userId}, user_${userId}`);
    } else {
      console.log(`⚡ [Socket.io] Guest/Anonymous Client connected (ID: ${socket.id})`);
    }

    // Explicit room registration from mobile/web client
    socket.on('join:user', (userKey) => {
      if (socket.userAuthenticated && socket.userId && userKey && String(userKey).trim() === String(socket.userId)) {
        const cleanKey = String(userKey).trim();
        socket.join(`user:${cleanKey}`);
        socket.join(`user_${cleanKey}`);
        socket.join(cleanKey);
        console.log(`[Socket.io] Socket ${socket.id} explicitly joined user rooms for: ${cleanKey}`);
      }
    });

    // Join specific trip workspace room
    socket.on('join:group', (groupId) => {
      if (groupId) {
        const cleanGroup = String(groupId).trim();
        const groupRoom = `group:${cleanGroup}`;
        socket.join(groupRoom);
        socket.join(cleanGroup);
        console.log(`[Socket.io] Socket ${socket.id} joined ${groupRoom}`);
      }
    });

    // Leave trip workspace room
    socket.on('leave:group', (groupId) => {
      if (groupId) {
        const cleanGroup = String(groupId).trim();
        const groupRoom = `group:${cleanGroup}`;
        socket.leave(groupRoom);
        socket.leave(cleanGroup);
        console.log(`[Socket.io] Socket ${socket.id} left ${groupRoom}`);
      }
    });

    // Auto-join universal broadcast rooms
    socket.join('broadcast');
    socket.join('all');
    socket.join('global');

    // Direct Admin Broadcast socket handlers
    socket.on('broadcast', (data) => {
      console.log(`[Socket.io] Direct "broadcast" event from client ${socket.id}`);
      broadcastNotification(data);
    });

    socket.on('admin:broadcast', (data) => {
      console.log(`[Socket.io] Direct "admin:broadcast" event from client ${socket.id}`);
      broadcastNotification(data);
    });

    socket.on('broadcast_notification', (data) => {
      console.log(`[Socket.io] Direct "broadcast_notification" event from client ${socket.id}`);
      broadcastNotification(data);
    });

    socket.on('send_notification', (data) => {
      if (data?.userId && data.userId !== 'ALL' && data.userId !== 'all') {
        emitToUser(data.userId, 'notification', data);
      } else {
        broadcastNotification(data);
      }
    });

    // ==========================================
    // Real-Time Support Ticket & Concierge Chat
    // ==========================================

    // A ticket room is private to its owner and authenticated support staff.
    socket.on('join:ticket', async (ticketNumber, acknowledge) => {
      const respond = typeof acknowledge === 'function' ? acknowledge : () => {};
      const cleanTicket = String(ticketNumber || '').trim();
      if (!cleanTicket || (!socket.adminId && (!socket.userAuthenticated || !socket.userId))) {
        return respond({ success: false, error: 'Ticket access denied' });
      }

      try {
        if (!socket.adminId) {
          const result = await pool.query(
            'SELECT 1 FROM support_tickets WHERE ticket_number = $1 AND user_id::text = $2 LIMIT 1',
            [cleanTicket, String(socket.userId)]
          );
          if (!result.rowCount) return respond({ success: false, error: 'Ticket access denied' });
        }

        await socket.join('ticket:' + cleanTicket);
        emitTicketPresence(cleanTicket);
        respond({ success: true, ticketNumber: cleanTicket });
        console.log('[Socket.io] Socket ' + socket.id + ' joined room ticket:' + cleanTicket);
      } catch (error) {
        console.error('[Socket.io] Ticket room authorization failed:', error.message);
        respond({ success: false, error: 'Unable to join ticket room' });
      }
    });

    // Leave support ticket room
    socket.on('leave:ticket', (ticketNumber) => {
      if (ticketNumber) {
        const cleanTicket = String(ticketNumber).trim();
        socket.leave('ticket:' + cleanTicket);
        emitTicketPresence(cleanTicket);
        console.log('[Socket.io] Socket ' + socket.id + ' left room ticket:' + cleanTicket);
      }
    });

    // Handle user/admin typing indicator
    socket.on('ticket:typing', (data) => {
      if (data && data.ticketNumber) {
        const cleanTicket = String(data.ticketNumber).trim();
        if (socket.rooms.has('ticket:' + cleanTicket)) {
          socket.to('ticket:' + cleanTicket).emit('ticket:typing', data);
        }
      }
    });

    // Handle ticket status change broadcast
    socket.on('ticket:status_change', (data) => {
      if (data && data.ticketNumber && (socket.role === 'ADMIN' || socket.role === 'SUPPORT')) {
        const cleanTicket = String(data.ticketNumber).trim();
        if (socket.rooms.has('ticket:' + cleanTicket)) {
          socket.to('ticket:' + cleanTicket).emit('ticket:status_change', data);
        }
      }
    });

    // Health ping/pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      for (const room of socket.rooms) {
        if (room.startsWith('ticket:')) emitTicketPresence(room.slice('ticket:'.length));
      }
      console.log(`❌ [Socket.io] Client disconnected (ID: ${socket.id}) Reason: ${reason}`);
    });
  });

  console.log('⚡ [Socket.io] Real-time WebSocket server initialized successfully.');
  return io;
}

/**
 * Get active Socket.io instance
 */
function getIO() {
  return io;
}

/**
 * Broadcast real-time event to a specific user by userId
 */
function emitToUser(userId, event, data) {
  if (!io || !userId) return false;
  const cleanId = String(userId).trim();
  const userRoom = `user:${cleanId}`;

  // Broadcast to user room, underscore variant, and direct ID room
  io.to(userRoom).to(`user_${cleanId}`).to(cleanId).emit(event, data);

  // Cross-emit notification event names for universal client support
  if (event === 'notification:new') {
    io.to(userRoom).to(`user_${cleanId}`).to(cleanId).emit('notification', data);
  } else if (event === 'notification') {
    io.to(userRoom).to(`user_${cleanId}`).to(cleanId).emit('notification:new', data);
  }

  console.log(`[Socket.io] Emitted "${event}" to user rooms (${cleanId})`);
  return true;
}

/**
 * Global Real-time Notification Dispatcher (Matching architecture guide)
 */
function sendRealTimeNotification(userId, notificationData) {
  return emitToUser(userId, 'notification', {
    ...notificationData,
    timestamp: notificationData?.timestamp || new Date().toISOString(),
  });
}

/**
 * Broadcast real-time event to all members in a group room
 */
function emitToGroup(groupId, event, data) {
  if (!io || !groupId) return false;
  const cleanGroup = String(groupId).trim();
  const groupRoom = `group:${cleanGroup}`;
  io.to(groupRoom).to(cleanGroup).emit(event, data);
  console.log(`[Socket.io] Emitted "${event}" to group room "${groupRoom}"`);
  return true;
}

/**
 * Global Broadcast Dispatcher (To All Connected Users)
 */
function broadcastNotification(notificationData) {
  if (!io) return false;
  const payload = {
    ...notificationData,
    id: notificationData?.id || `broadcast-${Date.now()}`,
    type: notificationData?.type || 'ANNOUNCEMENT',
    timestamp: notificationData?.timestamp || new Date().toISOString(),
  };
  io.emit('broadcast_notification', payload);
  io.emit('broadcast', payload);
  io.emit('notification', payload);
  io.emit('notification:new', payload);
  io.emit('admin:broadcast', payload);
  io.emit('admin:notification', payload);
  io.emit('notification:broadcast', payload);
  io.to('broadcast').to('all').to('global').emit('notification', payload);
  console.log(`⚡ [Socket.io] Broadcasted notification to ALL connected clients: "${payload.title || 'Broadcast'}"`);
  return true;
}


/**
 * Real-time Ticket Message Dispatcher
 */
function emitTicketMessage(ticketNumber, messageData) {
  if (!io || !ticketNumber) return false;
  const cleanTicket = String(ticketNumber).trim();
  const payload = Object.assign({ ticketNumber: cleanTicket }, messageData);
  io.to('ticket:' + cleanTicket).emit('ticket:message', payload);
  console.log('[Socket.io] Emitted "ticket:message" to ticket room: ' + cleanTicket);
  return true;
}

/**
 * Publish which sides of a ticket chat currently have a connected socket.
 */
function emitTicketPresence(ticketNumber) {
  if (!io || !ticketNumber) return false;
  const cleanTicket = String(ticketNumber).trim();
  const room = io.sockets.adapter.rooms.get('ticket:' + cleanTicket) || new Set();
  let userOnline = false;
  let adminOnline = false;

  for (const socketId of room) {
    const member = io.sockets.sockets.get(socketId);
    if (!member) continue;
    if (member.role === 'ADMIN' || member.role === 'SUPPORT') adminOnline = true;
    else if (member.userId) userOnline = true;
  }

  const payload = {
    ticketNumber: cleanTicket,
    userOnline,
    clientOnline: userOnline,
    adminOnline,
    timestamp: new Date().toISOString()
  };
  io.to('ticket:' + cleanTicket).emit('ticket:presence', payload);
  return true;
}

/**
 * Real-time Ticket Status Dispatcher
 */
function emitTicketStatus(ticketNumber, status) {
  if (!io || !ticketNumber) return false;
  const cleanTicket = String(ticketNumber).trim();
  const payload = { ticketNumber: cleanTicket, status: status };
  io.to('ticket:' + cleanTicket).emit('ticket:status_change', payload);
  console.log('[Socket.io] Emitted "ticket:status_change" for ' + cleanTicket + ' to ' + status);
  return true;
}

module.exports = {
  initSocketServer,
  getIO,
  emitToUser,
  sendRealTimeNotification,
  emitToGroup,
  broadcastNotification,
  emitTicketMessage,
  emitTicketPresence,
  emitTicketStatus
};
