import app from './app';

const PORT = 3001;
const HOST = '0.0.0.0'; // Bind to all interfaces for maximum reachability during debug

const server = app.listen(PORT, HOST, () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port} on ${addr?.address}`;
    console.log(`[BACKEND] Listening on ${bind}`);
    console.log(`[BACKEND] Use http://127.0.0.1:${PORT} or http://localhost:${PORT}`);
    console.log(`[BACKEND] Environment: ${process.env.NODE_ENV || 'development'}`);
});
