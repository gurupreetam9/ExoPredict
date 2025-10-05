"use server";

import {
  getPredictionExplanation,
  PredictionExplanationOutput,
} from "@/ai/flows/prediction-explanation";
import { ModelType } from "@/lib/definitions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

async function handleApiResponse(response: Response) {
    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
        } else {
        const errorText = await response.text();
        console.error("API returned non-JSON error:", errorText);
        throw new Error('API request failed: The server returned an unexpected error.');
        }
    }
    return response.json();
}

export async function getPrediction(payload: { model: string; features: number[] }): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }> {
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleApiResponse(response);
}

export async function getTunedPrediction(payload: { model: string; features: number[] }): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }> {
  const response = await fetch(`${API_URL}/predict_tuned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleApiResponse(response);
}


export async function getBatchPredictions(payloads: { model: string; features: number[] }[], useTuned: boolean): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }[]> {
  const predictionFn = useTuned ? getTunedPrediction : getPrediction;
  const predictions = await Promise.all(payloads.map(payload => predictionFn(payload)));
  return predictions;
}


export async function getExplanationForPrediction(
  modelName: ModelType,
  inputFeatures: Record<string, any>,
  predictionAccuracy: number
): Promise<PredictionExplanationOutput> {
  
  const numberFeatures: Record<string, number> = {};
  for (const key in inputFeatures) {
    if (typeof inputFeatures[key] === 'number') {
      numberFeatures[key] = inputFeatures[key];
    } else if (typeof inputFeatures[key] === 'string') {
        const parsed = parseFloat(inputFeatures[key]);
        if (!isNaN(parsed)) {
            numberFeatures[key] = parsed;
        }
    }
  }

  return await getPredictionExplanation({
    modelName,
    inputFeatures: numberFeatures,
    predictionAccuracy,
  });
}

export async function tuneModel(modelName: string, nEstimators: string, maxDepth: string): Promise<{ message: string, model_name: string, hyperparameters: any, accuracy: number, model_id: string }> {
    
    const parseStringList = (str: string) => str.split(',').map(s => parseInt(s.trim(), 10));

    const hyperparameterGrid = {
        'n_estimators': parseStringList(nEstimators),
        'max_depth': parseStringList(maxDepth),
    };

    const response = await fetch(`${API_URL}/tune_model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model: modelName.toLowerCase(),
            hyperparameters: hyperparameterGrid 
        }),
    });
    return handleApiResponse(response);
}

export async function getTunedModels(): Promise<any[]> {
    const response = await fetch(`${API_URL}/tuned_models`);
    return handleApiResponse(response);
}