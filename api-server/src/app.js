import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import issuerRoutes from './routes/issuer.routes.js';
import userRoutes from './routes/user.routes.js';
import requireAuth from './middleware/requireAuth.js';

const app = express();
app.use(cors());
// Use Express built-in body parsers instead of the external body-parser package.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ ok: true, message: "EduLedger API running" }));

// Public routes (login, register)
app.use('/api/auth', authRoutes);

// Protected routes (require valid JWT)
app.use('/api/issuer', requireAuth, issuerRoutes);
app.use('/api/user', requireAuth, userRoutes);

export default app;
