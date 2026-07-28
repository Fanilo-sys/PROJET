import http from 'http';

let io: any = null;

export const initSocket = (server: http.Server) => {
  if (io) return io;
  let IOServer: any;
  try {
    // require dynamically so the code remains compilable even if the
    // dependency isn't installed yet in the developer environment.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    IOServer = require('socket.io').Server || require('socket.io');
  } catch (err) {
    console.warn('⚠️ socket.io non installé — fonctionnalités temps réel désactivées');
    return null;
  }

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  io = new IOServer(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.on('connection', (socket: any) => {
    console.log('🔔 Socket client connecté :', socket.id);
    socket.on('disconnect', (reason: any) => {
      console.log('🔕 Socket client déconnecté :', socket.id, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io non initialisé');
  return io;
};
