const express = require("express");
const path = require("path");
const multer = require("multer");
const router = express.Router();

const {
  generateDiaryFromImage,
  getDiaryById,
  getDiaryByPhotoIdx,
  getAllDiariesByUser,
  getRandomDiariesByUser,
  deleteDiary,
  getTimelineByUser
} = require("../controllers/diary.controller");

const authenticateToken = require("../middleware/authenticateToken");

// Multer 셋업 (최대 5장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// 1) GPT 일기 생성
router.post("/image-generate", authenticateToken, upload.array("photos", 5), generateDiaryFromImage);

// 2) 랜덤 일기 조회
router.get("/randomlist", authenticateToken, getRandomDiariesByUser);

// 3) 특정 일기 조회
router.get("/:id", authenticateToken, getDiaryById);

// 4) 사진 클릭 시 일기 조회
router.get("/photo/:photoIdx", authenticateToken, getDiaryByPhotoIdx);

// 5) 전체 일기 목록
router.get("/", authenticateToken, getAllDiariesByUser);

// 6) 일기 삭제
router.delete("/:id", authenticateToken, deleteDiary);

// ✅ 7) 타임라인 조회 (user_email 기반)
router.get("/timeline", getTimelineByUser);

module.exports = router;
