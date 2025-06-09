function buildPrompt({ companion, feeling, length, tone, weather }, locationInfo, tripDateStr) {
  return `
너는 여행 감성 일기 작가야. 아래 조건과 사진들을 참고해서 여행 일기를 작성해줘. 다음 사항을 반드시 지켜줘:

1. 제목에는 '## 제목:' 같은 형식 없이 자연스럽고 감성적인 제목을 넣어줘. 15자 이내로.
2. 제목과 본문을 분명히 구분해서 써줘. 제목을 한 줄로 먼저 작성하고 그 다음에 본문을 써줘.
3. 본문에도 '본문:' 같은 표현 없이, 자연스럽게 이어서 작성해줘.
4. 📸 **사진에 보이는 장면, 분위기, 인물, 배경**만을 기반으로 일기를 작성해줘.
5. ❌ 사진에 보이지 않는 내용(예: 상상한 장소, 인물, 스토리 등)은 절대로 쓰지 마.
6. 사용자가 입력한 정보(동반자, 기분, 날씨 등)는 자연스럽게 본문에 반영해줘.

- 촬영 위치: ${locationInfo || "정보 없음"}
- 날짜: ${tripDateStr}
- 동반자: ${companion}
- 기분: ${feeling}
- 날씨: ${weather}
- 글 길이: ${length}
- 말투 스타일: ${tone}
`.trim();
}

module.exports = { buildPrompt };
