require("dotenv").config();
const express = require('express');
const cors = require('cors');
const path = require("path");

const authRouter = require('./routes/auth.route');         // 🔑 로그인 관련
const diaryRoutes = require('./routes/diary.route');       // 📘 일기 관련
const photoRouter = require('./routes/photoRouter');       
const galleryRouter = require('./routes/gallery.route');   // 🗺️ 지도/사진 관련
const userRouter = require('./routes/user'); 
const timelineRouter = require('./routes/timeline.route'); // 📅 타임라인 라우터 추가 ✅

const app = express();
const PORT = 5000;

// ✅ [1] 공통 미들웨어
app.use(cors());
app.use(express.json());
app.use('/api/user', userRouter);

// ✅ [2] 요청 로그
app.use((req, res, next) => {
  console.log("🛬 요청 받음:", req.method, req.url);
  next();
});

// ✅ [3] 업로드된 이미지 공개 설정
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ [4] API 테스트 (필요시만 유지)
app.get('/api/test', (req, res) => {
  res.json({ message: 'API 테스트 성공! 🎯' });
});

// ✅ [5] API 라우터 등록
app.use('/api/diary', diaryRoutes);
app.use('/api', authRouter);
app.use("/", photoRouter);
app.use('/api', galleryRouter);
app.use('/api/timeline', timelineRouter);  // ✅ 여기에 타임라인 라우터 추가

// ✅ [6] 프론트엔드 정적 파일 서빙
app.use(express.static(path.join(__dirname, "../client/dist")));

// ✅ [7] SPA 라우팅 대응
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
});

// ✅ [8] 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
