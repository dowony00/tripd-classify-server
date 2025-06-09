from flask import Flask, jsonify
import pymysql
import torch
import os
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from dotenv import load_dotenv
import gdown
import zipfile

# ✅ .env 로드
load_dotenv()

app = Flask(__name__)

# ✅ 모델 zip 파일 다운로드 및 압축 해제
MODEL_DIR = "./clip_finetuned_model"
ZIP_PATH = "model.zip"

if not os.path.exists(MODEL_DIR):
    print("📦 모델 다운로드 및 압축 해제 시작...")

    file_id = "1OePIuuubbLraXgKml4bgF6dp8thvnpY_"
    url = f"https://drive.google.com/uc?id={file_id}"
    gdown.download(url, ZIP_PATH, quiet=False)

    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(MODEL_DIR)

    print("✅ 모델 압축 해제 완료!")

# ✅ 디바이스 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ✅ 모델 로드
model = CLIPModel.from_pretrained(MODEL_DIR, local_files_only=True).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_DIR, local_files_only=True)
model.eval()

# ✅ 클래스 목록
class_names = ["food", "people", "landscape", "accommodation"]

# ✅ 분류 함수
def predict_tag(image_path):
    image = Image.open(image_path).convert("RGB")
    inputs = processor(text=class_names, images=image, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)
        pred_index = torch.argmax(probs).item()
        return class_names[pred_index]

# ✅ DB 설정
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'port': int(os.getenv("DB_PORT")),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'db': os.getenv("DB_NAME"),
    'charset': 'utf8mb4'
}

# ✅ 업로드 경로
UPLOADS_DIR = "./uploads"

# ✅ API 엔드포인트
@app.route('/classify', methods=['POST'])
def classify_images():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    cursor.execute("SELECT photo_idx, file_name FROM photo_info WHERE tags IS NULL OR tags = ''")
    photos = cursor.fetchall()

    classified_count = 0

    for photo in photos:
        photo_idx = photo['photo_idx']
        filename = os.path.basename(photo['file_name'].replace('\\', '/'))
        image_path = os.path.join(UPLOADS_DIR, filename)

        if not os.path.exists(image_path):
            print(f"❌ 파일 없음: {image_path}")
            continue

        try:
            tag = predict_tag(image_path)
            cursor.execute("UPDATE photo_info SET tags = %s WHERE photo_idx = %s", (tag, photo_idx))
            conn.commit()
            print(f"✅ 분류 완료: {filename} → {tag}")
            classified_count += 1
        except Exception as e:
            print(f"⚠️ 예측 실패 ({filename}): {e}")

    cursor.close()
    conn.close()

    return jsonify({
        "status": "success",
        "classified": classified_count
    })

# ✅ 서버 실행
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 6006))
    app.run(host='0.0.0.0', port=port)
