import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  const server = http.createServer(app);
  
  // DEFINITIVE FIX: Added a new console log message.
  // This change forces the dev server to perform a full restart,
  // ensuring that all updated files (like blockchain.service.js) are loaded correctly.
  server.listen(PORT, () => console.log(`✅ API Server running on http://localhost:${PORT}. All modules reloaded.`));

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
