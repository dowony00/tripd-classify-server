// auth.routes.js

const express = require("express");
const router = express.Router();

// 1. 필요한 모든 컨트롤러 함수를 가져옵니다.
const {
  loginSocial,
  registerSocial,
  exchangeGoogleCode, // 💥 exchangeGoogleCode를 다시 추가해야 합니다.
} = require("../controllers/auth.controller");

// 2. 소셜 로그인 최종 처리 경로
router.post("/login", loginSocial);

// 3. 소셜 회원가입 최종 처리 경로
router.post("/register", registerSocial);

// 4. 💥 [필수] 모바일용 구글 'code'를 'access_token'으로 교환하는 경로
// 프론트엔드가 모바일에서 가장 먼저 호출하는 API입니다.
router.post("/google-token", exchangeGoogleCode);

module.exports = router;