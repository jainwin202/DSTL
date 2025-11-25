import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Mark function as async to use await inside
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ ok: false, error: "Invalid user" });
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

// Also keep default export for backward compatibility
export default requireAuth;