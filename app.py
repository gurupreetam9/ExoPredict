from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, io, numpy as np
from datetime import datetime
from pymongo import MongoClient
import gridfs
from dotenv import load_dotenv
import os
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import StackingClassifier
from xgboost import XGBClassifier
from bson import ObjectId

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
# NEW: Train & Tune Stacking Model Endpoint
# ---------------------------
@app.route("/tune_model", methods=["POST"])
def tune_model():
    data = request.json
    model_name = data.get("model")
    user_param_grid = data.get("hyperparameters")

    if not model_name:
        return jsonify({"error": "Missing model name"}), 400

    if not user_param_grid or not isinstance(user_param_grid, dict) or not user_param_grid:
        return jsonify({"error": "Missing or invalid hyperparameters"}), 400

    # Load training data from disk
    X_train = joblib.load(f"{model_name}_X_train.pkl")
    y_train = joblib.load(f"{model_name}_y_train.pkl")

    # Define base models
    xgb = XGBClassifier(random_state=42, use_label_encoder=False, eval_metric='logloss')
    rf = RandomForestClassifier(random_state=42)
    gb = GradientBoostingClassifier(random_state=42)
    
    # Meta model
    meta_model = LogisticRegression(max_iter=1000)

    # Stacking Ensemble
    stack_model = StackingClassifier(
        estimators=[('xgb', xgb), ('rf', rf), ('gb', gb)],
        final_estimator=meta_model,
        cv=3, # Using a smaller CV for faster tuning in a web request context
        n_jobs=1 # Force single-core to prevent memory issues
    )

    # Grid search using user-provided param grid
    grid_search = GridSearchCV(estimator=stack_model, param_grid=user_param_grid, cv=3, n_jobs=1, verbose=2)
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_

    # Save tuned model to bytes
    model_bytes = io.BytesIO()
    joblib.dump(best_model, model_bytes)
    model_bytes.seek(0)

    # Save tuned model to GridFS
    model_id = fs.put(model_bytes, filename=f"tuned_{model_name}_stack_{datetime.utcnow().isoformat()}.joblib")

    # Save metadata in DB
    db.models.insert_one({
        "model_name": model_name,
        "model_id": model_id,
        "best_params": grid_search.best_params_,
        "accuracy": grid_search.best_score_,
        "created_at": datetime.utcnow()
    })

    return jsonify({
        "message": "Stacking model tuned and saved successfully",
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
    model_id_str = data.get("model") # Here, 'model' is the model_id from MongoDB
    features = data.get("features")

    if not model_id_str or not features:
        return jsonify({"error": "Missing model ID or features"}), 400

    # Find the model's metadata to know if it's kepler or tess
    model_metadata = db.models.find_one({"model_id": ObjectId(model_id_str)})

    if not model_metadata:
        return jsonify({"error": "Tuned model metadata not found"}), 404

    model_name = model_metadata.get("model_name") # 'kepler' or 'tess'
    if not model_name:
         return jsonify({"error": "Model name (kepler/tess) not found in tuned model metadata"}), 500
    
    # Load model from GridFS
    model_file = fs.get(ObjectId(model_id_str))
    model = joblib.load(model_file)

    # Load the correct scaler and encoder based on the model name
    scaler = joblib.load(f"{model_name}_scaler.pkl")
    le = joblib.load(f"{model_name}_label_encoder.pkl")

    features_scaled = scaler.transform([features])
    probs = model.predict_proba(features_scaled)

    pred_class_index = np.argmax(probs[0])
    pred_class = le.inverse_transform([pred_class_index])[0]
    confidence_val = float(probs[0][pred_class_index])
    probabilities_dict = {k: float(v) for k, v in zip(le.classes_, probs[0])}

    return jsonify({
        "model": model_id_str, # Return the id of the tuned model
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
    models = list(db.models.find().sort("created_at", -1))

    # Convert ObjectId to string for JSON serialization
    for model in models:
        model["_id"] = str(model["_id"])
        if "model_id" in model:
            model["model_id"] = str(model["model_id"])

    return jsonify(models)



if __name__ == "__main__":
    app.run(debug=True)
