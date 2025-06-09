const express = require('express');
const router = express.Router();
const {
  getGallerySummary,
  getPhotosByTag,
  updatePhotoTag
} = require('../controllers/gallery.controller');

// 📁 요약 정보 (썸네일 + 개수)
router.get('/gallery/summary', getGallerySummary);

// 🖼️ 특정 태그 사진 전체 보기
router.get('/gallery/:tag', getPhotosByTag);

router.put('/gallery/:photo_idx/move', updatePhotoTag);

module.exports = router;
