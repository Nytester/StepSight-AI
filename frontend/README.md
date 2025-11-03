# 🚀 StepSight AI

StepSight AI is an intelligent MRI-based analysis system that helps doctors detect ACL (Anterior Cruciate Ligament) injuries faster and more accurately.  
It combines artificial intelligence (MRNet model), medical imaging processing, and a clean web interface to support quick diagnosis and save doctors’ time.

---

## 📌 Problem Overview

Diagnosing ACL injuries manually from MRI scans is:
- Time-consuming ⏳  
- Requires high expertise 🧠  
- Prone to human error ❌  

---

## ✅ Solution

StepSight AI allows doctors to:
✔ Upload knee MRI scans directly from a web dashboard  
✔ Automatically analyze and detect the risk of ACL injury using AI  
✔ Get a clear result: **Injury Risk / No Injury Detected**  
✔ Reduce diagnosis time and improve treatment speed  

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🖥 Doctor Dashboard | Secure interface for medical professionals |
| 🧠 AI-Based MRI Analysis | Uses MRNet (PyTorch model) to analyze ACL risk |
| 📤 DICOM/MRI Upload Support | Supports `.dcm`, `.nii`, JPEG MRI images |
| ⚡ Real-Time Prediction | Fast injury detection with probability score |
| 🗂 Organized File Storage | Uploaded scans stored in `/backend/uploads/` |
| 🛠 Flask API | Serves model inference API endpoints for frontend |

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python (Flask) |
| AI Model | MRNet (PyTorch), NumPy, OpenCV |
| File Processing | pydicom, PIL |
| Environment | Virtualenv / venv |
| Deployment Ready | Render / Railway / Netlify (optional) |

---

## 📁 Project Structure

StepSight-AI/
├── frontend/
│ ├── index.html
│ ├── styles.css
│ └── script.js
│
├── backend/
│ ├── app.py # Flask backend server
│ ├── utils/ # Helper functions (optional)
│ ├── models/ # AI model weights (optional)
│ ├── uploads/ # Uploaded MRI scans
│ ├── results/ # Prediction reports
│ └── requirements.txt # Package dependencies
│
└── README.md

yaml
Copy code

---

## ⚙️ Installation & Setup

### ✅ 1. Clone the repository

```bash
git clone https://github.com/Nytester/StepSight-AI.git
cd StepSight-AI
✅ 2. Setup virtual environment
bash
Copy code
cd backend
python3 -m venv stepsight-env
source stepsight-env/bin/activate   # Mac/Linux
pip install -r requirements.txt
✅ 3. Start the backend server
bash
Copy code
python app.py
✅ 4. Open the frontend
Just open this file in your browser:

bash
Copy code
frontend/index.html
🌍 API Endpoints (Flask)
Method	Endpoint	Description
POST	/api/v1/mri/upload	Upload MRI scan
GET	/api/v1/mri/status/<upload_id>	Check processing status
GET	/api/v1/mri/analyze/<upload_id>	Perform AI prediction
GET	/api/v1/mri/report/<upload_id>	Download result/report

👨‍💻 Team Members
Name	Role
Roshan Bhatta	AI Model & Backend Integration
Prabhakar Shrestha	Frontend Development
Sumit Shrestha	Research & System Design

🚀 Future Enhancements
✅ Doctor & Patient Login System

✅ PDF Report Generation with Prediction & MRI Snapshot

✅ Deploy Backend on Render / Railway

✅ Deploy Frontend on Netlify / Vercel

✅ Add Real MRNet Pretrained ACL Model

📜 License
This project is open-source and free to use for educational purposes.

🌟 Thank You!
If you like this project, don't forget to star ⭐ the repository!
