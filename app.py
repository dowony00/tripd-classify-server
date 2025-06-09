from flask import Flask, jsonify
import pymysql
import torch
import os
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from dotenv import load_dotenv
import zipfile
import urllib.request

# ✅ .env 로드
load_dotenv()

# ✅ 모델 폴더가 없을 경우 다운로드 및 압축 해제
MODEL_ZIP_URL = "https://drive.google.com/uc?export=download&id=1OePIuuubbLraXgKml4bgF6dp8thvnpY_"  # <- 실제 direct 링크로 교체해야 함

if not os.path.exists("clip_finetuned_model"):
    print("📦 모델 다운로드 및 압축 해제 시작...")
    urllib.request.urlretrieve(MODEL_ZIP_URL, "model.zip")
    with zipfile.ZipFile("model.zip", 'r') as zip_ref:
        zip_ref.extractall(".")
    os.remove("model.zip")
    print("✅ 모델 준비 완료")

app = Flask(__name__)

# ✅ 디바이스 설정
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ✅ CLIP 모델 & 프로세서 로드 (로컬 전용 모드)
model = CLIPModel.from_pretrained("./clip_fineted_model", local_files_only=True).to(device)
processor = CLIPProcessor.from_pretrained("./clip_fineted_model", local_files_only=True)
model.eval()

# ✅ 클래스 목록
class_names = ["food", "people", "landscape", "accommodation"]

# ✅ 예측 함수
def predict_tag(image_path):
    image = Image.open(image_path).convert("RGB")
    inputs = processor(text=class_names, images=image, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        return class_names[torch.argmax(outputs.logits_per_image).item()]

# ✅ DB 설정 (env에서 불러오기)
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'port': int(os.getenv("DB_PORT")),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'db': os.getenv("DB_NAME"),
    'charset': 'utf8mb4'
}

UPLOADS_DIR = "./uploads"

@app.route('/classify', methods=['POST'])
def classify_images():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    cursor.execute("SELECT photo_idx, file_name FROM photo_info WHERE tags IS NULL OR tags = ''")
    photos = cursor.fetchall()

    classified_count = 0
    for photo in photos:
        idx = photo['photo_idx']
        filename = os.path.basename(photo['file_name'].replace('\\', '/'))
        path = os.path.join(UPLOADS_DIR, filename)
        if not os.path.exists(path):
            print(f"❌ 이미지 없음: {path}")
            continue
        try:
            tag = predict_tag(path)
            cursor.execute("UPDATE photo_info SET tags = %s WHERE photo_idx = %s", (tag, idx))
            conn.commit()
            print(f"✅ {filename} → {tag}")
            classified_count += 1
        except Exception as e:
            print(f"⚠️ 예측 실패 {filename}: {e}")

    conn.close()
    return jsonify({"status": "success", "classified": classified_count})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 6006))
    app.run(host='0.0.0.0', port=port)
