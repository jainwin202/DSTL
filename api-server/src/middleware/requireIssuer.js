export default function requireIssuer(req, res, next) {
  if (req.user?.role !== 'issuer') {
    return res.status(403).json({ ok: false, error: "Issuer role required" });
  }
  next();
}
