from flask import Flask, request, jsonify
import xgboost as xgb
import numpy as np
import json
import pandas as pd
import os

app = Flask(__name__)

# Load the model at startup
model_kepler = xgb.Booster()
model_kepler.load_model('kepler_model.json')

model_tess = xgb.Booster()
model_tess.load_model('tess_model.json')


def preprocess_kepler_input(data):
    # This should match the feature order the model was trained on.
    feature_names = [
        'koi_period', 'koi_time0bk', 'koi_impact', 'koi_duration',
        'koi_depth', 'koi_prad', 'koi_teq', 'koi_insol',
        'koi_model_snr', 'koi_steff', 'koi_slogg', 'koi_srad',
        'koi_kepmag'
    ]
    
    # Create a DataFrame with the correct feature names and order
    df = pd.DataFrame([data], columns=feature_names)
    return xgb.DMatrix(df)

def preprocess_tess_input(data):
    # This should match the feature order the model was trained on.
    feature_names = [
        'pl_orbper', 'pl_trandurh', 'pl_trandep', 'pl_rade', 'pl_insol',
        'pl_eqt', 'st_teff', 'st_logg', 'st_rad', 'st_dist', 'st_tmag'
    ]
    # Create a DataFrame with the correct feature names and order
    df = pd.DataFrame([data], columns=feature_names)
    return xgb.DMatrix(df)


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        model_type = data.pop('modelType', 'Kepler')

        if model_type == 'Kepler':
            dmatrix = preprocess_kepler_input(data)
            prediction = model_kepler.predict(dmatrix)
        elif model_type == 'TESS':
            dmatrix = preprocess_tess_input(data)
            prediction = model_tess.predict(dmatrix)
        else:
            return jsonify({'error': 'Invalid model type'}), 400

        # XGBoost prediction is a probability, so we can multiply by 100
        accuracy = float(prediction[0]) * 100
        
        return jsonify({'accuracy': accuracy})

    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
