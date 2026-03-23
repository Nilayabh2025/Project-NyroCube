# Project-NyroCube
NyroCube is an AI-enabled smart focus cube powered by ESP32. It uses IR sensors, LED rings, vibration motors, and an OLED display to track user focus and distraction patterns. The cube sends data to a web dashboard via API, and the site provides real-time feedback, analytics, and AI-based recommendations.

## ✨ Features
- ⏱️ Focus timer with start/stop control  
- 📊 Distraction alerts via vibration + LED  
- 📈 Productivity analytics dashboard with charts  
- 🤖 AI module for personalized focus tips  
- 📱 Mobile‑friendly responsive design  
- 🔌 ESP32 integration via REST API  

---

## 🧠 Tech Stack
- Hardware: ESP32 DevKit V1, IR sensors, OLED, LED ring, vibration motor  
- Frontend: HTML, CSS, JavaScript / React  
- Backend: Node.js + Express or Flask  
- Database: SQLite / Firebase  
- AI Module: TensorFlow.js / external API  
- Charts: Chart.js / D3.js  

---

## 📡 API Endpoints
- POST /startFocus – Start a focus session  
- POST /stopFocus – End session and log data  
- GET /getStats – Retrieve session analytics  

---

## 📁 Project Structure
NyroCube/
├── frontend/   # Dashboard UI
├── backend/    # API and server logic
├── database/   # SQLite or Firebase config
├── esp32/      # Arduino code for ESP32
└── README.md   # Documentation
