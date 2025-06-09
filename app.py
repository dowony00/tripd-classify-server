from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import zipfile
import requests

import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

# ------------------------------
# 모델 다운로드
# ------------------------------
MODEL_DIR = "clip_finetuned_model"
ZIP_PATH = "model.zip"
GOOGLE_FILE_ID = "1v3nmJH2zeUcglZMjqaIWeo16Oe5D9MGe"

def download_file_from_google_drive(file_id, destination):
    print("📥 모델 다운로드 시작")
    URL = "https://drive.google.com/uc?export=download"
    session = requests.Session()
    response = session.get(URL, params={'id': file_id}, stream=True)
    token = get_confirm_token(response)
    if token:
        response = session.get(URL, params={'id': file_id, 'confirm': token}, stream=True)
    save_response_content(response, destination)

def get_confirm_token(response):
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            return value
    return None

def save_response_content(response, destination):
    CHUNK_SIZE = 32768
    with open(destination, "wb") as f:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk:
                f.write(chunk)

if not os.path.exists(MODEL_DIR):
    download_file_from_google_drive(GOOGLE_FILE_ID, ZIP_PATH)
    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(".")
    print("✅ 모델 압축 해제 완료!")

# ------------------------------
# Flask 초기화
# ------------------------------
app = Flask(__name__)
CORS(app)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = CLIPModel.from_pretrained(MODEL_DIR).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_DIR)

# ------------------------------
# 분류 카테고리
# ------------------------------
CATEGORIES = {
    "people": [
        "This is a photo of a person.",
        "A person is smiling in the picture.",
        "Portrait of a traveler.",
        "A man or woman posing in the photo.",
        "Someone enjoying their trip."
    ],
    "landscape": [
        "Beautiful nature scenery.",
        "Landscape photo from travel.",
        "A view of nature or cityscape.",
        "Mountains, beaches, or fields in the distance.",
        "Outdoor environment during trip."
    ],
    "food": [
        "Delicious food from a restaurant.",
        "A dish served during travel.",
        "Close-up of a meal.",
        "Photo of something tasty.",
        "Local cuisine from a trip."
    ],
    "accommodation": [
        "Hotel room or guest house.",
        "Place where traveler stayed.",
        "Accommodation interior view.",
        "Where the traveler slept.",
        "Bed and room for travel lodging."
    ]
}

# ------------------------------
# 분류 API
# ------------------------------
@app.route("/classify", methods=["POST"])
def classify():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files['image']
    image = Image.open(image_file.stream).convert("RGB")

    texts = []
    tags = []
    for tag, sentences in CATEGORIES.items():
        texts.extend(sentences)
        tags.extend([tag] * len(sentences))

    inputs = processor(text=texts, images=[image], return_tensors="pt", padding=True).to(device)
    outputs = model(**inputs)
    probs = outputs.logits_per_image.softmax(dim=1)[0]
    best_idx = torch.argmax(probs).item()

    return jsonify({
        "tag": tags[best_idx],
        "confidence": round(probs[best_idx].item(), 4)
    })

@app.route("/")
def home():
    return "CLIP 분류 API 작동 중입니다."

# ------------------------------
# 서버 실행
# ------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6006))
    app.run(host="0.0.0.0", port=port)
