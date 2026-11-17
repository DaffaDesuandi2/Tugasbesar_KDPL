import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
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

// OpenAPI 3.0 Documentation Specification
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'PosTera Backend API',
    version: '1.0.0',
    description: 'Dokumentasi interaktif API PosTera (Node.js/Express + PostgreSQL)'
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Autentikasi'],
        summary: 'Registrasi Akun Mahasiswa Baru',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Andre Prasetya' },
                  email: { type: 'string', example: 'andre@itera.ac.id' },
                  password: { type: 'string', example: 'PasswordAman123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Registrasi berhasil' },
          409: { description: 'Email sudah terdaftar' },
          422: { description: 'Validasi password / input gagal' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Autentikasi'],
        summary: 'Login Pengguna dengan Rate Limiting & Regenerasi Sesi',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'andre@itera.ac.id' },
                  password: { type: 'string', example: 'PasswordAman123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login berhasil, sesi baru diterbitkan' },
          401: { description: 'Email atau kata sandi tidak valid' },
          429: { description: 'Terlalu banyak percobaan login (Rate limit)' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Autentikasi'],
        summary: 'Melihat Profil Pengguna yang Sedang Login',
        parameters: [
          {
            name: 'Authorization',
            in: 'header',
            required: false,
            description: 'Format: Bearer <session_id>',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: { description: 'Data profil user' },
          401: { description: 'Tidak terotentikasi' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Autentikasi'],
        summary: 'Logout dan Pemusnahan Sesi',
        responses: {
          200: { description: 'Logout berhasil' },
          401: { description: 'Tidak terotentikasi' }
        }
      }
    }
  }
};

// Swagger UI Route
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount API routes
app.use('/api/auth', authRouter);

// Health route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PosTera Backend API',
    runtime: 'Node.js (Express)',
    database: 'PostgreSQL',
    docs: '/docs'
  });
});

export async function startServer() {
  try {
    await initDatabase();
    console.log('PostgreSQL database initialized successfully.');

    return new Promise((resolve) => {
      const server = app.listen(PORT, () => {
        console.log(`PosTera Express server running on http://localhost:${PORT}`);
        console.log(`Interactive API Documentation: http://localhost:${PORT}/docs`);
        resolve(server);
      });
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
