const express = require('express');
const router = express.Router();
const pool = require('../db');

// 타임라인 가져오기 - 로그인한 사용자만 필터링
router.get('/', async (req, res) => {
  const { user_email } = req.query;
  if (!user_email) {
    return res.status(400).json({ message: 'user_email이 필요합니다.' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT d.diary_idx, d.diary_title AS title, p.taken_at, p.file_name
      FROM ai_diary_info d
      JOIN ai_diary_photos dp ON d.diary_idx = dp.diary_idx
      JOIN photo_info p ON dp.photo_idx = p.photo_idx
      WHERE d.user_id = ?
      ORDER BY d.diary_idx, p.taken_at
    `, [user_email]);

    const timeline = {};

    for (const row of rows) {
      if (!timeline[row.diary_idx]) {
        timeline[row.diary_idx] = {
          title: row.title,
          photos: [],
        };
      }

      timeline[row.diary_idx].photos.push({
        taken_at: row.taken_at,
        file_name: row.file_name,
      });
    }

    res.json(timeline);
  } catch (error) {
    console.error('타임라인 조회 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
