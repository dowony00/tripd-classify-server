const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ExifParser = require("exif-parser");
require("dotenv").config();

// ✅ 위도·경도로 장소명 변환 (Google Maps API)
const reverseGeocode = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  try {
    const res = await axios.get(url);
    return res.data.results?.[0]?.formatted_address || null;
  } catch (err) {
    console.warn("📍 장소 이름 변환 실패:", err.message);
    return null;
  }
};

// ✅ EXIF + 이미지 분석용 base64 + DB용 위경도 분리
const extractExifData = async (imageFiles) => {
  const dateList = [];
  const gpsList = [];         // ✅ DB 저장용
  const locationList = [];    // ✅ GPT 프롬프트용
  const imageMessages = [];   // ✅ GPT 이미지 분석용

  for (const file of imageFiles) {
    const imagePath = path.join(__dirname, "../uploads", file.filename);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    let lat = null;
    let lng = null;
    let taken_at = null;

    try {
      const parser = ExifParser.create(imageBuffer);
      const result = parser.parse();

      // ✅ 1. 날짜 추출 (EXIF timestamp 그대로 → UTC 기준 → 문자열로 변환)
      if (result.tags.DateTimeOriginal) {
        const exifTimestamp = result.tags.DateTimeOriginal * 1000; // ms 단위
        const exifDateUTC = new Date(exifTimestamp); // UTC 기준
        const YYYY = exifDateUTC.getUTCFullYear();
        const MM = String(exifDateUTC.getUTCMonth() + 1).padStart(2, "0");
        const DD = String(exifDateUTC.getUTCDate()).padStart(2, "0");
        const hh = String(exifDateUTC.getUTCHours()).padStart(2, "0");
        const mm = String(exifDateUTC.getUTCMinutes()).padStart(2, "0");
        const ss = String(exifDateUTC.getUTCSeconds()).padStart(2, "0");
        taken_at = `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;

        dateList.push(new Date(taken_at)); // (보정 없이 push)
      }

      // ✅ 2. GPS 추출
      if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
        lat = parseFloat(result.tags.GPSLatitude);
        lng = parseFloat(result.tags.GPSLongitude);
      }

      // ✅ 3. DB용 GPS 정보 push
      gpsList.push({ lat, lng, taken_at });

      // ✅ 4. GPT 프롬프트용 위치정보
      if (lat && lng) {
        const placeName = await reverseGeocode(lat, lng);
        if (placeName) locationList.push(placeName);
      }
    } catch (err) {
      console.warn("📸 EXIF 파싱 실패:", err.message);
      gpsList.push({ lat: null, lng: null, taken_at: null });
    }

    // ✅ 5. GPT 이미지 분석용 base64
    imageMessages.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`,
      },
    });
  }

  return { dateList, gpsList, locationList, imageMessages };
};

module.exports = { extractExifData };
