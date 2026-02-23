import 'dotenv/config'; // Must be the first import — populates process.env from .env
import express from 'express';
import cors from 'cors';
import conversationRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`[ContextHub Server] Running on http://localhost:${PORT}`);
});
