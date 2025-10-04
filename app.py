from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, io, numpy as np
from datetime import datetime
from pymongo import MongoClient
import gridfs

app = Flask(__name__)
CORS(app)

# MongoDB setup
mongo_client = MongoClient("mongodb://localhost:27017/")
db = mongo_client["model_db"]
fs = gridfs.GridFS(db)

# ---------------------------
# EXISTING PREDICT ENDPOINT
# ---------------------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    model_name = data.get("model")
    features = data.get("features")

    if not model_name or not features:
        return jsonify({"error": "Missing model name or features"}), 400

    # Load model from disk
    model = joblib.load(f"{model_name}_model.pkl")
    scaler = joblib.load(f"{model_name}_scaler.pkl")
    le = joblib.load(f"{model_name}_label_encoder.pkl")

    features_scaled = scaler.transform([features])
    probs = model.predict_proba(features_scaled)

    pred_class_index = np.argmax(probs[0])
    pred_class = le.inverse_transform([pred_class_index])[0]
    confidence_val = float(probs[0][pred_class_index])
    probabilities_dict = {k: float(v) for k, v in zip(le.classes_, probs[0])}

    return jsonify({
        "model": model_name,
        "prediction": pred_class,
        "confidence": confidence_val,
        "probabilities": probabilities_dict,
        "features": features_scaled.tolist()
    })


# ---------------------------
# NEW: Train & Tune Model Endpoint
# ---------------------------
@app.route("/tune_model", methods=["POST"])
def tune_model():
    from sklearn.model_selection import GridSearchCV
    from sklearn.ensemble import RandomForestClassifier

    data = request.json
    model_name = data.get("model")

    if not model_name:
        return jsonify({"error": "Missing model name"}), 400

    # Load training data from disk
    X_train = joblib.load(f"{model_name}_X_train.pkl")
    y_train = joblib.load(f"{model_name}_y_train.pkl")

    # Hyperparameter tuning
    param_grid = {
        "n_estimators": [50, 100],
        "max_depth": [None, 10, 20]
    }
    clf = RandomForestClassifier(random_state=42)
    grid_search = GridSearchCV(clf, param_grid, cv=3)
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_

    # Save tuned model to bytes
    model_bytes = io.BytesIO()
    joblib.dump(best_model, model_bytes)
    model_bytes.seek(0)

    # Save tuned model to GridFS
    model_id = fs.put(model_bytes, filename=f"tuned_{model_name}_model.joblib")

    # Save metadata
    db.models.insert_one({
        "model_name": model_name,
        "model_id": model_id,
        "hyperparameters": grid_search.best_params_,
        "accuracy": grid_search.best_score_,
        "created_at": datetime.utcnow()
    })

    return jsonify({
        "message": "Model tuned and saved successfully",
        "model_name": model_name,
        "hyperparameters": grid_search.best_params_,
        "accuracy": grid_search.best_score_,
        "model_id": str(model_id)
    })


# ---------------------------
# NEW: Predict with Tuned Model
# ---------------------------
@app.route("/predict_tuned", methods=["POST"])
def predict_tuned():
    data = request.json
    model_name = data.get("model")
    features = data.get("features")

    if not model_name or not features:
        return jsonify({"error": "Missing model name or features"}), 400

    # Load latest tuned model from MongoDB
    tuned_model_data = db.models.find({"model_name": model_name}).sort("created_at", -1).limit(1)
    tuned_model_data = list(tuned_model_data)

    if not tuned_model_data:
        return jsonify({"error": "No tuned model found"}), 404

    model_id = tuned_model_data[0]["model_id"]
    model_file = fs.get(model_id)
    model = joblib.load(model_file)

    # Load scaler and encoder from disk
    scaler = joblib.load(f"{model_name}_scaler.pkl")
    le = joblib.load(f"{model_name}_label_encoder.pkl")

    features_scaled = scaler.transform([features])
    probs = model.predict_proba(features_scaled)

    pred_class_index = np.argmax(probs[0])
    pred_class = le.inverse_transform([pred_class_index])[0]
    confidence_val = float(probs[0][pred_class_index])
    probabilities_dict = {k: float(v) for k, v in zip(le.classes_, probs[0])}

    return jsonify({
        "model": model_name,
        "prediction": pred_class,
        "confidence": confidence_val,
        "probabilities": probabilities_dict,
        "features": features_scaled.tolist()
    })


# ---------------------------
# Get Tuned Models Metadata
# ---------------------------
@app.route("/tuned_models", methods=["GET"])
def get_tuned_models():
    models = list(db.models.find({}, {"_id": 0}))
    return jsonify(models)


if __name__ == "__main__":
    app.run(debug=True)
