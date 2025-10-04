from flask import Flask, request, jsonify
import xgboost as xgb
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib

app = Flask(__name__)

MODEL_PATHS = {
    "kepler": "xgb_model1.json",
    "tess": "tess_model_xgb1.json"
}

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    model_name = data.get("model")
    features = data.get("features")

    if not model_name or model_name not in MODEL_PATHS:
        return jsonify({"error": "Invalid or missing model name"}), 400

    if not features or not isinstance(features, list):
        return jsonify({"error": "Invalid or missing features"}), 400

    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATHS[model_name])

    le = joblib.load(f"{model_name}_label_encoder.pkl")

    dm = xgb.DMatrix(np.array([features]))
    probs = model.predict_proba(np.array([features]))

    pred_class_index = np.argmax(probs[0])
    pred_class = le.inverse_transform([pred_class_index])[0]

    return jsonify({
        "model": model_name,
        "prediction": pred_class,
        "confidence": probs[0][pred_class_index],
        "probabilities": dict(zip(le.classes_, probs[0])),
        "features": features
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
