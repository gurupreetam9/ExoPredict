"use server";

import {
  populateParameters,
  ParameterPopulationOutput,
} from "@/ai/flows/prompt-assisted-parameter-entry";
import {
  getPredictionExplanation,
  PredictionExplanationOutput,
} from "@/ai/flows/prediction-explanation";
import { ModelType } from "@/lib/definitions";

export async function populateParametersFromPrompt(
  prompt: string,
  modelType: ModelType
): Promise<ParameterPopulationOutput> {
  return await populateParameters({ prompt, modelType });
}

export async function getPrediction(payload: { model: string; features: number[] }): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';
  const response = await fetch(`${apiUrl}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Prediction request failed');
    } else {
      const errorText = await response.text();
      console.error("Prediction API returned non-JSON error:", errorText);
      throw new Error('Prediction request failed: The server returned an unexpected error.');
    }
  }

  return response.json();
}

export async function getBatchPredictions(payloads: { model: string; features: number[] }[]): Promise<{ prediction: string; confidence: number; probabilities: Record<string, number> }[]> {
  const predictions = await Promise.all(payloads.map(payload => getPrediction(payload)));
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
