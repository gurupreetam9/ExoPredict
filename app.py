
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, io, numpy as np
from datetime import datetime
from pymongo import MongoClient
import gridfs
from dotenv import load_dotenv
import os
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get the connection URI and database name from environment variables
mongo_uri = os.environ.get("MONGO_DB_CLIENT_URI", "mongodb://localhost:27017/")
db_name = os.environ.get("MONGO_DB_NAME", "model_db")

# Create MongoClient using the URI
mongo_client = MongoClient(mongo_uri)
db = mongo_client[db_name]

# Initialize GridFS
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
    from sklearn.ensemble import RandomForestClassifier, StackingClassifier, GradientBoostingClassifier
    from xgboost import XGBClassifier
    from sklearn.linear_model import LogisticRegression

    data = request.json
    model_name = data.get("model")
    user_param_grid = data.get("hyperparameters")

    if not model_name:
        return jsonify({"error": "Missing model name"}), 400

    if not user_param_grid or not isinstance(user_param_grid, dict):
        return jsonify({"error": "Missing or invalid hyperparameters"}), 400

    # Load training data from disk
    X_train = joblib.load(f"{model_name}_X_train.pkl")
    y_train = joblib.load(f"{model_name}_y_train.pkl")

    # Initialize base models
    xgb = XGBClassifier(random_state=42)
    rf = RandomForestClassifier(random_state=42)
    gb = GradientBoostingClassifier(random_state=42)

    # Meta model
    meta_model = LogisticRegression(max_iter=1000)

    # Build Stacking Ensemble
    stacking_model = StackingClassifier(
        estimators=[('xgb', xgb), ('rf', rf), ('gb', gb)],
        final_estimator=meta_model,
        cv=3, # Using a smaller CV for faster tuning in a web request
        n_jobs=1 # Use a single job to avoid memory issues
    )

    # Grid search using user-provided param grid
    grid_search = GridSearchCV(stacking_model, user_param_grid, cv=3, n_jobs=1) # n_jobs=1 for stability
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_

    # Save tuned model to bytes
    model_bytes = io.BytesIO()
    joblib.dump(best_model, model_bytes)
    model_bytes.seek(0)

    # Save tuned model to GridFS
    model_id = fs.put(model_bytes, filename=f"tuned_{model_name}_model.joblib")

    # Save metadata in DB
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
        "best_params": grid_search.best_params_,
        "accuracy": grid_search.best_score_,
        "model_id": str(model_id)
    })



# ---------------------------
# NEW: Predict with Tuned Model
# ---------------------------
@app.route("/predict_tuned", methods=["POST"])
def predict_tuned():
    data = request.json
    model_id_str = data.get("model") # The model ID is passed here
    features = data.get("features")

    if not model_id_str or not features:
        return jsonify({"error": "Missing model ID or features"}), 400

    from bson import ObjectId
    try:
        model_id = ObjectId(model_id_str)
    except Exception:
        return jsonify({"error": "Invalid model ID format"}), 400

    # Load the specific tuned model from MongoDB
    tuned_model_data = db.models.find_one({"_id": model_id})

    if not tuned_model_data:
        # Fallback for older references if needed
        tuned_model_data = db.models.find_one({"model_id": model_id})
        if not tuned_model_data:
            return jsonify({"error": "No tuned model found with that ID"}), 404

    model_file_id = tuned_model_data.get("model_id", tuned_model_data["_id"])
    model_file = fs.get(model_file_id)
    model = joblib.load(model_file)
    
    model_base_name = tuned_model_data["model_name"]

    # Load scaler and encoder from disk based on the original base model name
    scaler = joblib.load(f"{model_base_name}_scaler.pkl")
    le = joblib.load(f"{model_base_name}_label_encoder.pkl")

    features_scaled = scaler.transform([features])
    probs = model.predict_proba(features_scaled)

    pred_class_index = np.argmax(probs[0])
    pred_class = le.inverse_transform([pred_class_index])[0]
    confidence_val = float(probs[0][pred_class_index])
    probabilities_dict = {k: float(v) for k, v in zip(le.classes_, probs[0])}

    return jsonify({
        "model": model_base_name,
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
    models = list(db.models.find())

    # Convert ObjectId to string
    for model in models:
        # Use the main _id as the primary identifier on the frontend
        model["model_id"] = str(model["_id"]) 
        model["_id"] = str(model["_id"])
        
    return jsonify(models)



if __name__ == "__main__":
    app.run(debug=True)

    