"""
StepSight AI - MRI ACL Analysis Backend (Rule-Based Only, MRNet Disabled)
WARNING: Educational demo only. Not for medical use.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import numpy as np
from PIL import Image
import cv2
from datetime import datetime

# --------- Optional TensorFlow (unused unless enabled) ----------
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

# --------- DICOM Support ----------
try:
    import pydicom
    DICOM_AVAILABLE = True
except ImportError:
    DICOM_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# --------- Configuration ----------
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'dcm'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# MRNet Completely Disabled
MRNET_MODEL = None
print("⚠️ MRNet AI Model Disabled — Rule-Based Analysis Only.")

analysis_results = {}

# -------------------------------------------------------
# Helper Functions
# -------------------------------------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_dicom(file_path):
    dcm = pydicom.dcmread(file_path)
    pixel = dcm.pixel_array
    pixel = (pixel - pixel.min()) / (pixel.max() - pixel.min()) * 255
    return pixel.astype(np.uint8)

def preprocess_image(file_path, is_dicom):
    if is_dicom and DICOM_AVAILABLE:
        arr = process_dicom(file_path)
        img = Image.fromarray(arr)
    else:
        img = Image.open(file_path)

    if img.mode != 'RGB':
        img = img.convert('RGB')

    img = img.resize((512, 512))
    return np.array(img)

def extract_features(img):
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    return {
        "mean_intensity": float(np.mean(gray)),
        "std_intensity": float(np.std(gray)),
        "edge_density": float(np.sum(edges > 0) / edges.size),
        "texture_complexity": float(cv2.Laplacian(gray, cv2.CV_64F).var())
    }

def rule_based_analysis(features):
    score = 30
    if features["edge_density"] > 0.15: score += 20
    elif features["edge_density"] > 0.10: score += 10

    if features["texture_complexity"] > 100: score += 15

    score = max(0, min(100, score))

    if score < 30: severity = "low"
    elif score < 60: severity = "medium"
    else: severity = "high"

    return score, severity

# -------------------------------------------------------
# API ROUTES
# -------------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "running",
        "tensorflow_available": TF_AVAILABLE,
        "dicom_available": DICOM_AVAILABLE,
        "mrnet_enabled": MRNET_MODEL is not None
    })

@app.route('/api/v1/mri/upload', methods=['POST'])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    upload_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[1].lower()
    path = os.path.join(UPLOAD_FOLDER, f"{upload_id}.{ext}")
    file.save(path)

    analysis_results[upload_id] = {
        "filepath": path,
        "is_dicom": (ext == "dcm"),
        "status": "uploaded",
        "timestamp": datetime.now().isoformat()
    }

    return jsonify({"upload_id": upload_id, "message": "File uploaded successfully"}), 200

@app.route('/api/v1/mri/analyze/<upload_id>', methods=['GET'])
def analyze(upload_id):
    if upload_id not in analysis_results:
        return jsonify({"error": "Invalid upload ID"}), 404

    data = analysis_results[upload_id]
    try:
        img = preprocess_image(data["filepath"], data["is_dicom"])
        features = extract_features(img)
        score, severity = rule_based_analysis(features)

        data.update({
            "status": "completed",
            "features": features,
            "risk_score": score,
            "severity_level": severity,
            "mrnet_acl_probability": None,
            "analysis_timestamp": datetime.now().isoformat()
        })

        return jsonify(data), 200

    except Exception as e:
        data["status"] = "failed"
        data["error"] = str(e)
        return jsonify({"error": str(e)}), 500

# -------------------------------------------------------
# SERVER
# -------------------------------------------------------
if __name__ == '__main__':
    print("🚀 StepSight AI Backend Running on http://127.0.0.1:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)

