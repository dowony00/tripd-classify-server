// server/middleware/authenticateToken.js
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "secret123";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error("❌ JWT 검증 실패:", err);
      return res.sendStatus(403); // Forbidden
    }
    req.user = user; // ✅ 이후 라우터에서 req.user.user_id 로 접근
    next();
  });
}

module.exports = authenticateToken;
