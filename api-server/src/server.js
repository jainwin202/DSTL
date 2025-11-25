import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import userRoutes from "./routes/user.routes.js";
app.use("/api/user", userRoutes);


const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  const server = http.createServer(app);
  server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Another process is listening on this port.`);
      process.exit(1);
    }
    console.error('Server error', err);
    process.exit(1);
  });
}

startServer();
