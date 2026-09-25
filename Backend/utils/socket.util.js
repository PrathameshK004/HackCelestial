const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { verifyToken: verifyJWT } = require('./jwt.util');
const { pool } = require('./db.util');

let io = null;
const ticketRoom = (ticketNumber) => `ticket:${String(ticketNumber).trim()}`;

async function canAccessTicket(socket, ticketNumber) {
  if (!socket.userId || !ticketNumber) return false;
  const cleanTicketNumber = String(ticketNumber).trim();
  const result = socket.actorRole === 'SUPPORT'
    ? await pool.query('SELECT 1 FROM support_tickets WHERE ticket_number = $1 LIMIT 1', [cleanTicketNumber])
    : await pool.query('SELECT 1 FROM support_tickets WHERE ticket_number = $1 AND user_id = $2 LIMIT 1', [cleanTicketNumber, socket.userId]);
  return result.rowCount > 0;
}

async function emitTicketPresence(room, ticketNumber) {
  if (!io) return;
  const sockets = await io.in(room).fetchSockets();
  const presence = sockets.reduce((result, socket) => {
    if (socket.data.actorRole === 'SUPPORT') result.supportOnline = true;
    if (socket.data.actorRole === 'USER') result.userOnline = true;
    return result;
  }, { supportOnline: false, userOnline: false });
  io.to(room).emit('ticket:presence', { ticketNumber, ...presence });
}

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

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        socket.handshake.query?.token;
      if (!token) {
        socket.userId = null;
        socket.actorRole = 'GUEST';
        socket.data.actorRole = 'GUEST';
        return next();
      }

      try {
        const decoded = verifyJWT(token);
        if (!decoded?.key) return next(new Error('unauthorized'));
        socket.userId = String(decoded.key);
        socket.actorRole = 'USER';
      } catch (userTokenError) {
        const adminSecret = process.env.JWT_SECRET;
        if (!adminSecret) return next(new Error('unauthorized'));
        const decoded = jwt.verify(token, adminSecret);
        if (decoded?.type !== 'access' || !decoded.sub) return next(new Error('unauthorized'));
        const admin = await pool.query('SELECT id FROM triptual_admin_users WHERE id = $1 LIMIT 1', [decoded.sub]);
        if (!admin.rowCount) return next(new Error('unauthorized'));
        socket.userId = String(admin.rows[0].id);
        socket.actorRole = 'SUPPORT';
      }

      socket.data.actorRole = socket.actorRole;
      return next();
    } catch (error) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      socket.join(`user_${userId}`);
      socket.join(String(userId));
      console.log(`⚡ [Socket.io] Client connected: ${socket.id} (User: ${userId}) -> Joined Rooms: user:${userId}, user_${userId}`);
    } else {
      console.log(`⚡ [Socket.io] Guest/Anonymous Client connected (ID: ${socket.id})`);
    }

    // Explicit room registration from mobile/web client
    socket.on('join:user', (userKey) => {
      if (socket.actorRole === 'USER' && userKey && String(userKey).trim() === socket.userId) {
        const cleanKey = socket.userId;
        socket.join(`user:${cleanKey}`);
        socket.join(`user_${cleanKey}`);
        socket.join(cleanKey);
        console.log(`[Socket.io] Socket ${socket.id} explicitly joined user rooms for: ${cleanKey}`);
      }
    });

    socket.on('admin:join', (ack) => {
      if (socket.actorRole !== 'SUPPORT') {
        if (typeof ack === 'function') ack({ ok: false, error: 'unauthorized' });
        return;
      }
      socket.join('support:admins');
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('join:ticket', async (ticketNumber, ack) => {
      const cleanTicketNumber = String(ticketNumber || '').trim();
      try {
        if (!(await canAccessTicket(socket, cleanTicketNumber))) {
          if (typeof ack === 'function') ack({ ok: false, error: 'forbidden' });
          return;
        }
        const room = ticketRoom(cleanTicketNumber);
        await socket.join(room);
        if (typeof ack === 'function') ack({ ok: true, ticketNumber: cleanTicketNumber });
        await emitTicketPresence(room, cleanTicketNumber);
      } catch (error) {
        console.error('[Socket.io] Ticket room join failed:', error.message);
        if (typeof ack === 'function') ack({ ok: false, error: 'join_failed' });
      }
    });

    socket.on('leave:ticket', async (ticketNumber) => {
      const cleanTicketNumber = String(ticketNumber || '').trim();
      const room = ticketRoom(cleanTicketNumber);
      await socket.leave(room);
      await emitTicketPresence(room, cleanTicketNumber).catch(() => {});
    });

    socket.on('ticket:typing', async (payload) => {
      const cleanTicketNumber = String(payload?.ticketNumber || '').trim();
      const room = ticketRoom(cleanTicketNumber);
      if (!socket.rooms.has(room) || socket.actorRole === 'GUEST') return;
      socket.to(room).emit('ticket:typing', {
        ticketNumber: cleanTicketNumber,
        isTyping: Boolean(payload?.isTyping),
        senderRole: socket.actorRole,
      });
    });

    socket.on('ticket:send_message', async (payload, ack) => {
      const cleanTicketNumber = String(payload?.ticketNumber || '').trim();
      if (socket.actorRole !== 'SUPPORT' || !payload?.id) {
        if (typeof ack === 'function') ack({ ok: false, error: 'unauthorized' });
        return;
      }
      try {
        const result = await pool.query(
          `SELECT m.id, m.ticket_id AS "ticketId", m.sender_id AS "senderId", m.sender_name AS "senderName",
                  m.sender_role AS "senderRole", m.message, m.attachment_url AS "attachmentUrl",
                  m.attachment_name AS "attachmentName", m.attachment_type AS "attachmentType",
                  m.attachment_size AS "attachmentSize", m.created_at AS "createdAt"
           FROM support_ticket_messages m
           JOIN support_tickets t ON t.id = m.ticket_id
           WHERE t.ticket_number = $1 AND m.id = $2 AND m.sender_role = 'SUPPORT'
           LIMIT 1`,
          [cleanTicketNumber, payload.id]
        );
        if (!result.rowCount) {
          if (typeof ack === 'function') ack({ ok: false, error: 'message_not_found' });
          return;
        }
        emitToTicket(cleanTicketNumber, 'ticket:message', { message: result.rows[0] });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) {
        console.error('[Socket.io] Support message relay failed:', error.message);
        if (typeof ack === 'function') ack({ ok: false, error: 'relay_failed' });
      }
    });

    socket.on('ticket:status_change', async (payload, ack) => {
      const cleanTicketNumber = String(payload?.ticketNumber || '').trim();
      if (socket.actorRole !== 'SUPPORT') {
        if (typeof ack === 'function') ack({ ok: false, error: 'unauthorized' });
        return;
      }
      try {
        const result = await pool.query(
          `SELECT t.status, (
             SELECT json_build_object(
               'id', m.id,
               'ticketId', m.ticket_id,
               'senderId', m.sender_id,
               'senderName', m.sender_name,
               'senderRole', m.sender_role,
               'message', m.message,
               'createdAt', m.created_at
             )
             FROM support_ticket_messages m
             WHERE m.ticket_id = t.id AND m.sender_role = 'SYSTEM'
             ORDER BY m.created_at DESC
             LIMIT 1
           ) AS "systemMessage"
           FROM support_tickets t WHERE t.ticket_number = $1 LIMIT 1`,
          [cleanTicketNumber]
        );
        if (!result.rowCount || result.rows[0].status !== payload.status) {
          if (typeof ack === 'function') ack({ ok: false, error: 'status_mismatch' });
          return;
        }
        emitToTicket(cleanTicketNumber, 'ticket:status_change', {
          ticketNumber: cleanTicketNumber,
          status: result.rows[0].status,
        });
        if (result.rows[0].systemMessage) {
          emitToTicket(cleanTicketNumber, 'ticket:message', { message: result.rows[0].systemMessage });
        }
        if (typeof ack === 'function') ack({ ok: true });
      } catch (error) {
        console.error('[Socket.io] Ticket status relay failed:', error.message);
        if (typeof ack === 'function') ack({ ok: false, error: 'relay_failed' });
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

    // Health ping/pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnecting', () => {
      const ticketRooms = [...socket.rooms].filter((room) => room.startsWith('ticket:'));
      setImmediate(() => {
        ticketRooms.forEach((room) => {
          emitTicketPresence(room, room.slice('ticket:'.length)).catch(() => {});
        });
      });
    });

    socket.on('disconnect', (reason) => {
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

function emitToTicket(ticketNumber, event, data) {
  if (!io || !ticketNumber) return false;
  const cleanTicketNumber = String(ticketNumber).trim();
  io.to(ticketRoom(cleanTicketNumber)).emit(event, {
    ticketNumber: cleanTicketNumber,
    ...data,
  });
  return true;
}

function emitToSupportAdmins(event, data) {
  if (!io) return false;
  io.to('support:admins').emit(event, data);
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

module.exports = {
  initSocketServer,
  getIO,
  emitToUser,
  sendRealTimeNotification,
  emitToGroup,
  emitToTicket,
  emitToSupportAdmins,
  broadcastNotification
};
