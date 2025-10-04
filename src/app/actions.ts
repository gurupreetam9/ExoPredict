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

export async function getPrediction(features: Record<string, number>): Promise<{ accuracy: number }> {
  // Mock API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate some logic with features if needed
      const accuracy = Math.floor(Math.random() * (99 - 70 + 1) + 70);
      resolve({ accuracy });
    }, 1500);
  });
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
    }
  }

  return await getPredictionExplanation({
    modelName,
    inputFeatures: numberFeatures,
    predictionAccuracy,
  });
}
