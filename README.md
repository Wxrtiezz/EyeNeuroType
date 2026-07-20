<div align="center">
  <h1>👁️ EyeNeuroType</h1>
  <h3>AI-Powered Gaze Typing System</h3>
  <p><strong>A cost-effective assistive technology that enables motor-disabled individuals to communicate using only eye movements via a standard webcam.</strong></p>
  
  [![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![Status](https://img.shields.io/badge/Status-Development-orange.svg)](https://github.com/Wxrtiezz/EyeNeuroType)
  
  <p>
    <a href="#-about-the-project">About</a> •
    <a href="#-key-features">Features</a> •
    <a href="#%EF%B8%8F-built-with">Tech Stack</a> •
    <a href="#-system-architecture">Architecture</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-performance-metrics">Performance</a> •
    <a href="#-project-structure">Structure</a> •
    <a href="#-contact">Contact</a>
  </p>
</div>

---

## 📖 About The Project

**EyeNeuroType** is an AI-powered gaze typing system designed to assist individuals with severe motor disabilities, enabling them to communicate and interact with computers using only their eye movements. The system leverages **computer vision** and **machine learning** technologies to track and interpret eye gaze in real-time through a standard webcam, eliminating the need for expensive specialized hardware.

**Why EyeNeuroType?**

| Problem | Solution |
|---------|----------|
| ❌ Commercial eye trackers cost >100 million VND | ✅ Affordable system at ~850,000 VND |
| ❌ Require specialized hardware | ✅ Uses standard webcam |
| ❌ Often need professional installation | ✅ Easy to set up and use |
| ❌ Limited accessibility in Vietnam | ✅ Open-source and locally developed |

**Project Status:** 🟢 Prototype completed and tested on 5 users with 87% accuracy.

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| 👁️ **Real-time Eye Tracking** | Tracks eye gaze through a standard webcam using MediaPipe Face Mesh |
| 🎯 **High Accuracy** | 87% classification accuracy using K-Nearest Neighbors (KNN) |
| ⌨️ **Virtual Keyboard** | 6x6 keyboard interface with auto-scanning mechanism |
| 🇻🇳 **Vietnamese Support** | Telex input for Vietnamese diacritics (ă, â, ê, ô, ơ, ư, đ) |
| ⚡ **Predictive Text** | N-gram + Markov Chain for faster typing (12.8 CPM) |
| 💰 **Cost-Effective** | Affordable alternative to commercial eye trackers (~850,000 VND) |
| 🔒 **Privacy-Focused** | No video recording or storage |

---

## 🏆 Achievements

| Achievement | Details |
|-------------|---------|
| 🥇 **City-Level Science Fair** | 2025-2026 City-Level Science and Engineering Fair |
| 📊 **Accuracy** | 87% classification accuracy |
| ⚡ **Processing Speed** | 15-20 FPS real-time processing |
| 📝 **Typing Speed** | 12.8 characters per minute |
| 💰 **Cost** | ~850,000 VND (vs commercial systems 100M+ VND) |

---

## 🛠️ Built With

### Core Technologies

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| ![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white) **Python** | Main programming language | [python.org](https://www.python.org/) |
| ![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=flat&logo=opencv&logoColor=white) **OpenCV** | Image processing and webcam capture | [opencv.org](https://opencv.org/) |
| ![MediaPipe](https://img.shields.io/badge/MediaPipe-4285F4?style=flat&logo=google&logoColor=white) **MediaPipe** | Face landmark detection (478 points) | [mediapipe.dev](https://mediapipe.dev/) |
| ![Scikit-learn](https://img.shields.io/badge/Scikit--learn-F7931E?style=flat&logo=scikit-learn&logoColor=white) **Scikit-learn** | Machine learning (KNN, SVM, RF) | [scikit-learn.org](https://scikit-learn.org/) |
| ![Flask](https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white) **Flask** | Web backend and REST API | [flask.palletsprojects.com](https://flask.palletsprojects.com/) |

### Machine Learning Algorithms

| Algorithm | Accuracy | Purpose |
|-----------|----------|---------|
| **KNN (k=5)** | **87%** ✅ | Main classifier for gaze direction |
| SVM | 84% | Comparison study |
| Random Forest | 83% | Comparison study |

### Geometric Features

| Feature | Description | Role |
|---------|-------------|------|
| **EAR (Eye Aspect Ratio)** | Measures eye openness for blink detection | Detects BLINK command |
| **Iris Offset** | Iris position relative to eye center | Detects LEFT/RIGHT/CENTER |
| **Head Pose** | Roll, Yaw, Pitch angles | Compensates for head movement |

---

## 📊 System Architecture
flowchart TD
    A[Webcam] --> B[MediaPipe Face Mesh<br>478 landmarks]
    B --> C[Feature Extraction]
    C --> D[EAR Blink Detection]
    C --> E[Iris Offset<br>Direction Detection]
    C --> F[Head Pose<br>Roll / Yaw]
    D --> G[KNN Classifier]
    E --> G
    F --> G
    G --> H[LEFT]
    G --> I[RIGHT]
    G --> J[CENTER]
    G --> K[BLINK]
    H --> L[Virtual Keyboard 6x6]
    I --> L
    J --> L
    K --> L
    L --> M[Text Output]
    M --> N[xin chào các bạn]
    M --> O[Predictive Text<br>xin | chào | các | bạn | cảm ơn]
