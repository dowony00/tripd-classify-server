// C:\Users\smhrd\Desktop\pokachip\server\db.js

require("dotenv").config();

const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // ✅ 정확히 .env 키와 일치해야 함
  database: process.env.DB_NAME,
});

module.exports = db;
