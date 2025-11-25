import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import issuerRoutes from './routes/issuer.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
app.use(cors());
// Use Express built-in body parsers instead of the external body-parser package.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ ok: true, message: "EduLedger API running" }));

app.use('/api/auth', authRoutes);
app.use('/api/issuer', issuerRoutes);
app.use('/api/user', userRoutes);

export default app;
