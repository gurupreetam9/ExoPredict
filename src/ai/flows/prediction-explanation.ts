'use server';
/**
 * @fileOverview Provides an explanation of the factors influencing the model's prediction.
 *
 * - PredictionExplanationInput: Input schema for the prediction explanation flow.
 * - PredictionExplanationOutput: Output schema for the prediction explanation flow.
 * - getPredictionExplanation: A function that retrieves the prediction explanation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictionExplanationInputSchema = z.object({
  modelName: z.enum(['Kepler', 'TESS']).describe('The name of the model used for prediction.'),
  inputFeatures: z.record(z.string(), z.number()).describe('The input features used for the prediction.'),
  predictionAccuracy: z.number().describe('The accuracy of the prediction (%).'),
});
export type PredictionExplanationInput = z.infer<typeof PredictionExplanationInputSchema>;

const PredictionExplanationOutputSchema = z.object({
  explanation: z.string().describe('A brief explanation of the factors influencing the model prediction.'),
});
export type PredictionExplanationOutput = z.infer<typeof PredictionExplanationOutputSchema>;

export async function getPredictionExplanation(input: PredictionExplanationInput): Promise<PredictionExplanationOutput> {
  return predictionExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictionExplanationPrompt',
  input: {
    schema: PredictionExplanationInputSchema,
  },
  output: {
    schema: PredictionExplanationOutputSchema,
  },
  prompt: `You are an AI expert explaining model predictions to users.

  The user has provided the following information about the model prediction:

  Model Name: {{{modelName}}}
  Input Features: {{#each (keys inputFeatures)}}{{{this}}}: {{{../inputFeatures.[this]}}} {{/each}}
  Prediction Accuracy: {{{predictionAccuracy}}}%

  Based on this information, provide a concise explanation of what factors may have influenced the model's prediction.
  Focus on the most important features and their impact on the result. Keep it brief and easy to understand.
  Respond in one short paragraph.
`,
});

const predictionExplanationFlow = ai.defineFlow(
  {
    name: 'predictionExplanationFlow',
    inputSchema: PredictionExplanationInputSchema,
    outputSchema: PredictionExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
