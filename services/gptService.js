const axios = require("axios");
const OPENAI_API_KEY = process.env.GPT_API_KEY;

async function callGPT(promptText, imageMessages) {
  const messages = [
    {
      role: "system",
      content: "너는 여행 감성 일기를 쓰는 작가야. 일기 제목과 본문을 작성해줘.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: promptText },
        ...imageMessages, // ✅ 배열 안에 이미지들이 들어감
      ],
    },
  ];

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const fullText = response.data.choices[0].message.content.trim();
  const [titleLine, ...bodyLines] = fullText.split("\n");
  return {
    title: titleLine.replace(/^##\s*제목:?\s*/, "").trim(),
    content: bodyLines.join("\n").trim(),
  };
}

module.exports = { callGPT };
