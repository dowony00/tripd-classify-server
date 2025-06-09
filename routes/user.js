const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken'); // ✅ 추가

// ✅ 로그인된 사용자 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
  const userId = req.user.user_id; // ✅ JWT에서 추출
  try {
    const [rows] = await pool.query('SELECT * FROM user_info WHERE user_id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: '사용자 없음' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '사용자 조회 실패' });
  }
});

// ✅ 통계 정보
router.get('/stats', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const [diaryRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM ai_diary_info WHERE user_id = ?', [userId]
    );
    const [photoRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM photo_info WHERE user_id = ?', [userId]
    );

    res.json({
      diaryCount: diaryRows[0].count,
      photoCount: photoRows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '통계 정보 조회 실패' });
  }
});

// ✅ 회원 탈퇴
router.delete('/', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(`
      DELETE FROM ai_diary_photos
      WHERE diary_idx IN (SELECT diary_idx FROM ai_diary_info WHERE user_id = ?)
         OR photo_idx IN (SELECT photo_idx FROM photo_info WHERE user_id = ?)`,
      [userId, userId]
    );

    await conn.query('DELETE FROM photo_info WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM ai_diary_info WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM user_info WHERE user_id = ?', [userId]);

    await conn.commit();
    res.status(200).json({ message: '회원 탈퇴 완료' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: '회원 탈퇴 실패' });
  } finally {
    conn.release();
  }
});

module.exports = router;
