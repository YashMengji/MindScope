import jwt from "jsonwebtoken";

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
    // const decoded = jwt.verify(token, process.env.JWT_SECRET); // verify token
    const decoded = jwt.verify(token, "secret"); // verify token
    req.user = decoded; // attach user payload (id, email, etc.)
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
