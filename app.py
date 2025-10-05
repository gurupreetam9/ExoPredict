
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib, io, numpy as np
from datetime import datetime
from pymongo import MongoClient
import gridfs
from dotenv import load_dotenv
import os
import logging
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- DB and GridFS Setup ---
mongo_uri = os.environ.get("MONGO_DB_CLIENT_URI") or "mongodb://localhost:27017/"
# Ensure db_name has a default value if the environment variable is missing or empty
db_name = os.environ.get("MONGO_DB_NAME") or "model_db"
mongo_client = MongoClient(mongo_uri)
db = mongo_client[db_name]
fs = gridfs.GridFS(db)

# --- In-memory store for async task status ---
tasks = {}
executor = ThreadPoolExecutor(max_workers=2)


def run_tuning_job(task_id, model_name, user_param_grid):
    """The actual model tuning logic to be run in a background thread."""
    from sklearn.model_selection import GridSearchCV
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from xgboost import XGBClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import StackingClassifier
    from sklearn.metrics import accuracy_score
    from sklearn.pipeline import Pipeline

    try:
        logging.info(f"Task {task_id}: Starting tuning job for model {model_name}.")
        
        # Load training data
        X_train = joblib.load(f"{model_name}_X_train.pkl")
        y_train = joblib.load(f"{model_name}_y_train.pkl")

        # Initialize base models
        xgb = XGBClassifier(random_state=42)
        rf = RandomForestClassifier(random_state=42)
        gb = GradientBoostingClassifier(random_state=42)
        meta_model = LogisticRegression(max_iter=1000)

        # Build the Stacking Ensemble
        stacking_model = StackingClassifier(
            estimators=[('xgb', xgb), ('rf', rf), ('gb', gb)],
            final_estimator=meta_model,
            cv=2 
        )

        pipeline = Pipeline([('classifier', stacking_model)])

        # Directly use the user_param_grid from the frontend
        grid_search = GridSearchCV(pipeline, user_param_grid, cv=2, n_jobs=1, error_score='raise')

        logging.info(f"Task {task_id}: Starting GridSearchCV...")
        grid_search.fit(X_train, y_train)
        logging.info(f"Task {task_id}: GridSearchCV finished.")

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
        
        logging.info(f"Task {task_id}: Model tuned successfully with accuracy: {accuracy}")
        
        # Save metadata
        db.models.insert_one({
            "model_name": model_name,
            "model_id": model_id,
            "hyperparameters": best_params,
            "accuracy": accuracy,
            "created_at": datetime.utcnow()
        })

        # Update task status to SUCCESS
        tasks[task_id] = {
            "status": "SUCCESS",
            "result": {
                "message": "Model tuned and saved successfully",
                "model_name": model_name,
                "best_params": best_params,
                "accuracy": accuracy,
                "model_id": str(model_id)
            }
        }
        logging.info(f"Task {task_id}: Status updated to SUCCESS.")

    except Exception as e:
        logging.error(f"Task {task_id}: An error occurred during model tuning:", exc_info=True)
        # Update task status to FAILURE
        tasks[task_id] = {
            "status": "FAILURE",
            "error": f"An unexpected error occurred: {str(e)}"
        }
        logging.info(f"Task {task_id}: Status updated to FAILURE.")


@app.route("/tune_model", methods=["POST"])
def tune_model():
    data = request.json
    model_name = data.get("model")
    user_param_grid = data.get("hyperparameters", {})
    
    logging.info(f"Received tuning request for model: {model_name}")
    logging.info(f"Received hyperparameters: {user_param_grid}")

    if not model_name or not user_param_grid:
        return jsonify({"error": "Missing model name or hyperparameters"}), 400

    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "PENDING"}
    
    # Submit the long-running job to the thread pool
    executor.submit(run_tuning_job, task_id, model_name, user_param_grid)
    
    logging.info(f"Task {task_id} created and submitted for model {model_name}.")

    return jsonify({"message": "Model tuning started", "task_id": task_id}), 202


@app.route("/tuning_status/<task_id>", methods=["GET"])
def get_tuning_status(task_id):
    task = tasks.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    logging.info(f"Polling status for task {task_id}: {task['status']}")
    return jsonify(task)


# ---------------------------
# EXISTING ENDPOINTS (UNCHANGED)
# ---------------------------

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    model_name = data.get("model")
    features = data.get("features")

    if not model_name or not features:
        return jsonify({"error": "Missing model name or features"}), 400

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

@app.route("/predict_tuned", methods=["POST"])
def predict_tuned():
    data = request.json
    model_id_str = data.get("model") # The model ID is passed here
    features = data.get("features")

    if not model_id_str or not features:
        return jsonify({"error": "Missing model ID or features"}), 400

    from bson import ObjectId
    try:
        model_id_obj = ObjectId(model_id_str)
    except Exception:
        return jsonify({"error": "Invalid model ID format"}), 400

    tuned_model_data = db.models.find_one({"_id": model_id_obj})

    if not tuned_model_data:
        return jsonify({"error": "No tuned model found with that ID"}), 404

    model_file_id = tuned_model_data.get("model_id")
    if not model_file_id:
        return jsonify({"error": "Model file reference not found in metadata"}), 500

    model_file = fs.get(model_file_id)
    model = joblib.load(model_file)
    
    model_base_name = tuned_model_data["model_name"]

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

@app.route("/tuned_models", methods=["GET"])
def get_tuned_models():
    models_cursor = db.models.find().sort("created_at", -1)
    models = list(models_cursor)

    for model in models:
        model["model_id"] = str(model["_id"]) 
        model["_id"] = str(model["_id"])
        if 'model_id' in model and not isinstance(model['model_id'], str):
             model['model_id'] = str(model['model_id'])
        
    return jsonify(models)

if __name__ == "__main__":
    app.run(debug=True)

    