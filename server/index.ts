import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { documentsRouter } from './routes/documents';
import { chatRouter } from './routes/chat';
import { sessionsRouter } from './routes/sessions';
import { chartsRouter } from './routes/charts';
import { WebSocketHandler } from './websocket/WebSocketHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for larger document payloads

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/charts', chartsRouter);

// Create HTTP server
const httpServer = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const wsHandler = new WebSocketHandler(wss);
wsHandler.initialize();

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
