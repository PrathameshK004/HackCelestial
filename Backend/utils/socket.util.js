const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.io Server attached to HTTP Server
 */
function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket Authentication & Room Assignment Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
                    socket.handshake.query?.token;

      if (!token) {
        // Guest / anonymous socket connection allowed
        socket.userId = null;
        return next();
      }

      // Verify JWT Token if present
      try {
        const secret = process.env.JWT_SECRET || 'hackcelestial-super-secret-jwt-key';
        const decoded = jwt.verify(token, secret);
        socket.userId = decoded.id || decoded.userId || decoded.userKey || token;
      } catch (err) {
        // Fallback: treat token as userKey if un-parsable
        socket.userId = token;
      }

      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`[Socket.io] Client connected (ID: ${socket.id}) - Joined Room: ${userRoom}`);
    } else {
      console.log(`[Socket.io] Anonymous Client connected (ID: ${socket.id})`);
    }

    // Join specific trip workspace room
    socket.on('join:group', (groupId) => {
      if (groupId) {
        const groupRoom = `group:${groupId}`;
        socket.join(groupRoom);
        console.log(`[Socket.io] Socket ${socket.id} joined ${groupRoom}`);
      }
    });

    // Leave trip workspace room
    socket.on('leave:group', (groupId) => {
      if (groupId) {
        const groupRoom = `group:${groupId}`;
        socket.leave(groupRoom);
        console.log(`[Socket.io] Socket ${socket.id} left ${groupRoom}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected (ID: ${socket.id}) Reason: ${reason}`);
    });
  });

  console.log('[Socket.io] Real-time WebSocket server initialized successfully.');
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
  const userRoom = `user:${userId}`;
  io.to(userRoom).emit(event, data);
  console.log(`[Socket.io] Emitted "${event}" to room "${userRoom}"`);
  return true;
}

/**
 * Broadcast real-time event to all members in a group room
 */
function emitToGroup(groupId, event, data) {
  if (!io || !groupId) return false;
  const groupRoom = `group:${groupId}`;
  io.to(groupRoom).emit(event, data);
  console.log(`[Socket.io] Emitted "${event}" to group room "${groupRoom}"`);
  return true;
}

module.exports = {
  initSocketServer,
  getIO,
  emitToUser,
  emitToGroup
};
