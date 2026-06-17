import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  // Extract token (remove 'Bearer ')
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // verify token
    req.user = decoded; // attach user payload (id, email, etc.)
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
