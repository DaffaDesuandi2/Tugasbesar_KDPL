import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import { authRouter } from './auth.js';
import { ALLOWED_ORIGINS } from './security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Mount API routes
app.use('/api/auth', authRouter);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PosTera Backend API',
    runtime: 'Node.js (Express)',
    database: 'PostgreSQL'
  });
});

export async function startServer() {
  try {
    await initDatabase();
    console.log('PostgreSQL database initialized successfully.');

    return new Promise((resolve) => {
      const server = app.listen(PORT, () => {
        console.log(`PosTera Express server running on http://localhost:${PORT}`);
      });
      resolve(server);
    });
  } catch (error) {
    console.error('Failed to initialize database/server:', error);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
