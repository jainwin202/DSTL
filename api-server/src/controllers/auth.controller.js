import bcrypt from "bcrypt";
import User from "../models/User.js";
import { generateToken } from "../config/jwt.js";
import { generateKeyPair } from "../services/blockchain.service.js";
import { encrypt } from "../utils/crypto.js";

export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ ok: false, error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    // generate blockchain keypair
    const { pub, priv } = generateKeyPair();
    const privEnc = encrypt(priv);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "user",
      blockchainPublicKey: pub,
      blockchainPrivateKeyEnc: privEnc
    });

    res.json({ ok: true, user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ ok: false, error: "Invalid email" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ ok: false, error: "Invalid password" });

    const token = generateToken(user);

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        blockchainPublicKey: user.blockchainPublicKey
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

export async function me(req, res) {
  res.json({ ok: true, user: req.user });
}
