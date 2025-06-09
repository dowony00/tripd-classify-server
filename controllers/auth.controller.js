const jwt = require("jsonwebtoken");
const db = require("../db");
const SECRET_KEY = process.env.JWT_SECRET || "secret123";

// ✅ 소셜 로그인
exports.loginSocial = async (req, res) => {
  const { user_id, social_type, access_token, user_name } = req.body;

  console.log("✅ 로그인 요청 받음, DB 조회 직전 user_id:", user_id);
  
  if (!user_id || !social_type || !access_token) {
    return res.status(400).json({ error: "필수 정보 누락" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM user_info WHERE user_id = ?", [
      user_id,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "회원이 아닙니다. 회원가입을 진행해주세요." });
    }

    const token = jwt.sign({ user_id: rows[0].user_id }, SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.json({
      message: "로그인 성공",
      token,
      user: {
        user_id: rows[0].user_id,
        user_name: rows[0].user_name,
        social_type: rows[0].social_type,
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
};

// ✅ 소셜 회원가입
exports.registerSocial = async (req, res) => {
  const { user_id, user_name, social_type, access_token } = req.body;

  console.log("🔐 회원가입 요청값:", {
    user_id,
    user_name,
    social_type,
    access_token,
  });

  if (!user_id || !user_name || !social_type || !access_token) {
    return res.status(400).json({ error: "필수 정보 누락" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM user_info WHERE user_id = ?", [
      user_id,
    ]);
    if (rows.length > 0) {
      return res.status(409).json({ error: "이미 가입된 이메일입니다." });
    }

    await db.query(
      "INSERT INTO user_info (user_id, user_name, social_type, access_token) VALUES (?, ?, ?, ?)",
      [user_id, user_name, social_type, access_token]
    );

    res.json({ message: "회원가입 되었습니다" });
  } catch (err) {
    console.error("회원가입 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
};

// ✅ 모바일용 구글 로그인 code → access_token → userinfo
exports.exchangeGoogleCode = async (req, res) => {
  // 💥 수정: req.body에서 redirect_uri를 받습니다.
  const { code, redirect_uri } = req.body;

  // 💥 수정: 전달받은 redirect_uri를 사용하도록 변경합니다.
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: "code 또는 redirect_uri 누락" });
  }

  try {
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", process.env.GOOGLE_CLIENT_ID);
    params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);
    // 💥 수정: 전달받은 redirect_uri를 파라미터에 추가합니다.
    params.append("redirect_uri", redirect_uri);
    params.append("grant_type", "authorization_code");

    console.log("🔑 구글 토큰 요청 시작");
    console.log("📦 code:", code);
    console.log("📦 redirect_uri:", redirect_uri); // 로그 추가

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errMsg = await tokenRes.text();
      console.error("❌ 토큰 요청 실패:", tokenRes.status, errMsg);
      return res.status(401).json({ error: "토큰 요청 실패", detail: errMsg });
    }

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: "구글 access_token 발급 실패" });
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoRes.json();

    if (!userInfo.email || !userInfo.name) {
      return res.status(401).json({ error: "사용자 정보 가져오기 실패" });
    }

    res.json({
      user_id: userInfo.email,
      user_name: userInfo.name,
      access_token: tokenData.access_token,
    });
  } catch (err) {
    console.error("구글 토큰 교환 실패:", err);
    res.status(500).json({ error: "Google 로그인 처리 중 오류 발생" });
  }
};