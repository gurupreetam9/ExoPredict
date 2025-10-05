
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
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, StackingClassifier
    from xgboost import XGBClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score
    from sklearn.pipeline import Pipeline


    data = request.json
    model_name = data.get("model")
    user_param_grid = data.get("hyperparameters", {})

    if not model_name:
        return jsonify({"error": "Missing model name"}), 400
    
    if not user_param_grid:
        return jsonify({"error": "Missing hyperparameters for tuning"}), 400

    # Load training data
    X_train = joblib.load(f"{model_name}_X_train.pkl")
    y_train = joblib.load(f"{model_name}_y_train.pkl")

    # Initialize base models
    xgb = XGBClassifier(random_state=42)
    rf = RandomForestClassifier(random_state=42)
    gb = GradientBoostingClassifier(random_state=42)
    meta_model = LogisticRegression(max_iter=1000)

    # --- Build the Stacking Ensemble ---
    stacking_model = StackingClassifier(
        estimators=[('xgb', xgb), ('rf', rf), ('gb', gb)],
        final_estimator=meta_model,
        cv=2 
    )

    # --- Use GridSearchCV on the entire stack by wrapping it in a Pipeline ---
    pipeline = Pipeline([('classifier', stacking_model)])
    
    grid_search = GridSearchCV(pipeline, user_param_grid, cv=2)
    grid_search.fit(X_train, y_train)

    best_estimator = grid_search.best_estimator_
    best_params = grid_search.best_params_

    # --- Save the final model ---
    model_bytes = io.BytesIO()
    joblib.dump(best_estimator, model_bytes)
    model_bytes.seek(0)
    model_id = fs.put(model_bytes, filename=f"tuned_{model_name}_model.joblib")

    X_test = joblib.load(f"{model_name}_X_test.pkl")
    y_test = joblib.load(f"{model_name}_y_test.pkl")
    y_pred = best_estimator.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Save metadata
    db.models.insert_one({
        "model_name": model_name,
        "model_id": model_id,
        "hyperparameters": best_params,
        "accuracy": accuracy,
        "created_at": datetime.utcnow()
    })

    return jsonify({
        "message": "Model tuned and saved successfully",
        "model_name": model_name,
        "best_params": best_params,
        "accuracy": accuracy,
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

    
