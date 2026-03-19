
"use server";

import {
  getPredictionExplanation,
  PredictionExplanationOutput,
} from "@/ai/flows/prediction-explanation";
import { ModelType } from "@/lib/definitions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

async function fetchWithHandling(url: string, options?: RequestInit) {
    let response;
    try {
        response = await fetch(url, options);
    } catch (error: any) {
        // Network errors or connection refused (server down)
        console.error("Network or fetch error:", error.message || error);
        throw new Error("Prediction services are currently unavailable. Please try again later.");
    }

    if (!response.ok) {
        let errorMsg = "Service responded with an error.";
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            // Couldn't parse JSON, ignore raw HTML dump to prevent ugly UI
        }
        
        console.error("API Request Failed with status:", response.status, errorMsg);

        // Map HTTP statuses to production-friendly UI messages
        if (response.status >= 500) {
            throw new Error("We encountered an unexpected issue with our servers. Please try again soon.");
        } else if (response.status === 429) {
            throw new Error("We are currently experiencing high traffic. Please wait a moment before trying again.");
        } else if (response.status === 404) {
            throw new Error("The requested resource or model could not be found.");
        } else {
            // Bad requests (400, 401, 403)
            throw new Error("Your request could not be processed. Please check your inputs and try again.");
        }
    }

    try {
        const responseText = await response.text();
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse JSON response");
        throw new Error("The server responded with an invalid format. Please try again later.");
    }
}

export async function getPrediction(payload: { model: string; features: number[] }): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }> {
  return fetchWithHandling(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getTunedPrediction(payload: { model: string; features: number[] }): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }> {
  return fetchWithHandling(`${API_URL}/predict_tuned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getBatchPredictions(payloads: { model: string; features: number[] }[], useTuned: boolean): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }[]> {
  const predictionFn = useTuned ? getTunedPrediction : getPrediction;
  return Promise.all(payloads.map(payload => predictionFn(payload as any)));
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

  try {
    return await getPredictionExplanation({
      modelName,
      inputFeatures: numberFeatures,
      predictionAccuracy,
    });
  } catch (error: any) {
    console.error("Genkit / LLM Error:", error.message || error);
    if (error.message?.includes("Quota exceeded") || error.message?.includes("429")) {
      throw new Error("The AI Assistant is currently unavailable due to high traffic limits. Please try again later.");
    }
    throw new Error("The AI Explanation service encountered an unexpected error.");
  }
}

export async function tuneModel(
    modelName: string, 
    params: {
        rf_n_estimators: string;
        rf_max_depth: string;
        xgb_n_estimators: string;
        xgb_max_depth: string;
        gb_n_estimators: string;
        gb_max_depth: string;
    }
): Promise<{ message: string, task_id: string }> {
    
    const parseStringList = (str: string) => str.split(',').map(s => s.trim()).filter(s => s).map(Number);

    const hyperparameterGrid: Record<string, number[]> = {};

    if (params.rf_n_estimators) hyperparameterGrid['classifier__rf__n_estimators'] = parseStringList(params.rf_n_estimators);
    if (params.rf_max_depth) hyperparameterGrid['classifier__rf__max_depth'] = parseStringList(params.rf_max_depth);
    if (params.xgb_n_estimators) hyperparameterGrid['classifier__xgb__n_estimators'] = parseStringList(params.xgb_n_estimators);
    if (params.xgb_max_depth) hyperparameterGrid['classifier__xgb__max_depth'] = parseStringList(params.xgb_max_depth);
    if (params.gb_n_estimators) hyperparameterGrid['classifier__gb__n_estimators'] = parseStringList(params.gb_n_estimators);
    if (params.gb_max_depth) hyperparameterGrid['classifier__gb__max_depth'] = parseStringList(params.gb_max_depth);

    console.log("Sending to /tune_model:", { model: modelName.toLowerCase(), hyperparameters: hyperparameterGrid });

    return fetchWithHandling(`${API_URL}/tune_model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            model: modelName.toLowerCase(),
            hyperparameters: hyperparameterGrid 
        }),
    });
}

export async function getTuningStatus(taskId: string): Promise<{ status: string, result?: any, error?: string }> {
    return fetchWithHandling(`${API_URL}/tuning_status/${taskId}`);
}

export async function getTunedModels(): Promise<any[]> {
    return fetchWithHandling(`${API_URL}/tuned_models`);
}

    