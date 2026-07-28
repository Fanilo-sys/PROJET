"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
let io = null;
const initSocket = (server) => {
    if (io)
        return io;
    let IOServer;
    try {
        // require dynamically so the code remains compilable even if the
        // dependency isn't installed yet in the developer environment.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        IOServer = require('socket.io').Server || require('socket.io');
    }
    catch (err) {
        console.warn('⚠️ socket.io non installé — fonctionnalités temps réel désactivées');
        return null;
    }
    io = new IOServer(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });
    io.on('connection', (socket) => {
        console.log('🔔 Socket client connecté :', socket.id);
        socket.on('disconnect', (reason) => {
            console.log('🔕 Socket client déconnecté :', socket.id, reason);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.io non initialisé');
    return io;
};
exports.getIO = getIO;
