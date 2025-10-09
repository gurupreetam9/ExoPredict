# 🌌 A World Away: Hunting for Exoplanets Using AI

**Project for NASA Space Apps Challenge 2025**

---

## 🪐 Summary

Data from several different space-based exoplanet surveying missions have enabled the discovery of thousands of new planets outside our solar system. However, much of this work has historically been performed manually by astrophysicists. With advances in artificial intelligence (AI) and machine learning (ML), it is now possible to automatically analyze large sets of astronomical data collected by these missions to identify potential exoplanets more efficiently and accurately.  

Our project, **A World Away**, leverages AI/ML to automate the classification and detection of exoplanets using open-source datasets from NASA’s **Kepler**, **K2**, and **TESS** missions. By providing a user-friendly web interface for data exploration, model tuning, and prediction, we aim to make exoplanetary research more accessible, interactive, and data-driven.

---

## 🌠 Background

Exoplanetary identification is one of the most exciting areas of modern astronomy. Missions like **Kepler**, **K2**, and **TESS** use the **transit method**, detecting subtle dips in stellar brightness when a planet passes between its host star and the observer. These missions have produced rich datasets containing measurements such as orbital period, transit duration, planetary radius, and other astrophysical features.  

While these datasets have been publicly available for years, much of the classification work still requires manual analysis. Recent research has shown that machine learning models — when combined with proper preprocessing and feature selection — can achieve high accuracy in identifying confirmed exoplanets and distinguishing them from false positives.  

By harnessing NASA’s open datasets and AI capabilities, this project demonstrates how automated classification can accelerate discovery and uncover hidden exoplanets in existing data.

---

## 🎯 Objectives

The objective of this project is to:

1. **Develop an AI/ML model** trained on NASA’s open-source exoplanet datasets (Kepler, K2, and TESS) to classify data points as confirmed exoplanets, planetary candidates, or false positives.  
2. **Provide an interactive web application** that allows scientists, researchers, and enthusiasts to:
   - Input or upload new data for prediction.  
   - Tune machine learning models with custom hyperparameters.  
   - Visualize model performance and predictions.  
3. **Enhance accessibility** of exoplanet data analysis through a simple, browser-based interface that doesn’t require coding expertise.

---

## 💻 Web Application Overview

Our web interface is divided into **three main sections**, each designed to simplify interaction with the AI model and the data:

### 1️⃣ Single Prediction
- Allows users to **manually input individual feature values** (e.g., orbital period, transit duration, planetary radius, etc.) for an exoplanet candidate.  
- The trained ML model instantly predicts whether the input corresponds to a **confirmed exoplanet**, **planetary candidate**, or **false positive**.  
- Displays prediction confidence and probability distribution across all classes.

---

### 2️⃣ Batch Prediction
- Enables users to **upload a CSV file** (e.g., `test.csv` [Download test.csv](https://github.com/gurupreetam9/ExoPredict/raw/main/test.csv)) containing multiple entries for batch classification.  
- The backend processes the file and returns a set of predictions for each record.  
- Useful for researchers working with large datasets or outputs from telescope surveys.

---

### 3️⃣ Model Tuning
- Provides an interface for **hyperparameter tuning** of the machine learning model using user-defined parameters.  
- Supports grid search optimization on ensemble classifiers (e.g., XGBoost, Random Forest, Gradient Boosting).  
- After tuning, the optimized model is saved with metadata, including best parameters and achieved accuracy, allowing for further predictions with improved performance.

---

## ⚙️ Technical Overview

- **Backend:** Flask (Python)  
- **Machine Learning:** scikit-learn, XGBoost  
- **Database:** MongoDB with GridFS for model storage  
- **Frontend:** React / Next.js interface for user interaction  
- **Deployment:** Hugging Face Spaces  

---

## 🚀 How to Use

1. Open the web app and navigate to the desired section:
   - **Single Prediction:** Input parameters manually and click “Predict.”  
   - **Batch Prediction:** Upload your `test.csv` [Download test.csv](https://github.com/gurupreetam9/ExoPredict/raw/main/test.csv) file to predict multiple entries.  
   - **Model Tuning:** Provide hyperparameters and start tuning.  
2. View the results — predictions, confidence scores, and class probabilities — directly on the page.  
3. Tuned models are automatically saved for later use.

---

## 👩‍🚀 Future Enhancements

- Integration of **real-time NASA mission data APIs**.  
- Addition of **visual light curve analysis** for candidate validation.  
- Implementation of **transfer learning** using astrophysical feature embeddings.  
- Community-driven dataset expansion and continuous model retraining.

---

## 🧑‍🤝‍🧑 Team Information

**Team Name:** Code Warrior's

**Team Members:**  

| Name | Contribution  |
|------|------|
| Bodapati Guru Preetam | Model development, integrating the Flask API with the frontend, and handling deployment.
| Prasanna Kumar Nagaraju | Data gathering, preprocessing, data cleaning, and assisting in model development and improving model accuracy.
| Kusam Bhavya Sri | Frontend web development and UI/UX design. 
| Mahesh Vinnakota | Frontend web development and responsive layout implementation.
| Sujay Kaushal | Assisted in backend development, database setup, and monitoring.

---

## 🌍 Acknowledgements

This project was developed as part of the **NASA Space Apps Challenge 2025**, inspired by the problem statement *“A World Away: Hunting for Exoplanets Using AI.”*  
We extend our gratitude to **NASA**, **ESA**, and the **global open-source community** for making astronomical data and educational resources publicly available.

---

## 📫 Contact

For any questions, feedback, or collaboration inquiries, please reach out to:  
📧 *gurupreetambodapati@gmail.com*  
🌐 *https://huggingface.co/spaces/GuruPreetam/ExoPredict/tree/main*  

---
