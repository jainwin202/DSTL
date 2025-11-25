import jwt from "jsonwebtoken";
import User from "../models/User.js";

const requireAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authorization.split(" ")[1];

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);

    // CRITICAL FIX: Explicitly select all fields needed by downstream controllers.
    // The '.select("-password")' was implicitly excluding 'blockchainPrivateKeyEnc'.
    // By selecting the fields directly, we ensure they are always present on req.user.
    req.user = await User.findOne({ _id: id }).select(
      "_id name email role blockchainPublicKey blockchainPrivateKeyEnc"
    );
    
    if (!req.user) {
        return res.status(401).json({ error: "User not found." });
    }

    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Request is not authorized" });
  }
};

export default requireAuth;
