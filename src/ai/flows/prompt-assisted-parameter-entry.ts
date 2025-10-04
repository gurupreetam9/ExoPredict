'use server';

/**
 * @fileOverview A flow to pre-populate exoplanet input parameters based on a natural language prompt.
 *
 * - populateParameters - A function that handles the parameter population process.
 * - ParameterPopulationInput - The input type for the populateParameters function.
 * - ParameterPopulationOutput - The return type for the populateParameters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const KeplerInputSchema = z.object({
  koi_period: z.number().describe('Orbital Period (days)'),
  koi_time0bk: z.number().describe('Time of First Transit (BKJD)'),
  koi_impact: z.number().describe('Impact Parameter'),
  koi_duration: z.number().describe('Transit Duration (hours)'),
  koi_depth: z.number().describe('Transit Depth (ppm)'),
  koi_prad: z.number().describe('Planet Radius (Earth radii)'),
  koi_teq: z.number().describe('Equilibrium Temperature (K)'),
  koi_insol: z.number().describe('Insolation (Earth flux)'),
  koi_model_snr: z.number().describe('Model SNR'),
  koi_steff: z.number().describe('Star Temperature (K)'),
  koi_slogg: z.number().describe('Star Surface Gravity (log10(cm/s^2))'),
  koi_srad: z.number().describe('Star Radius (solar radii)'),
  koi_kepmag: z.number().describe('Kepler Magnitude'),
});

const TESSInputSchema = z.object({
  pl_orbper: z.number().describe('Orbital Period (days)'),
  pl_trandurh: z.number().describe('Transit Duration (hours)'),
  pl_trandep: z.number().describe('Transit Depth (ppm)'),
  pl_rade: z.number().describe('Planet Radius (Earth radii)'),
  pl_insol: z.number().describe('Insolation (Earth flux)'),
  pl_eqt: z.number().describe('Equilibrium Temperature (K)'),
  st_teff: z.number().describe('Star Temperature (K)'),
  st_logg: z.number().describe('Star Surface Gravity (log10(cm/s^2))'),
  st_rad: z.number().describe('Star Radius (solar radii)'),
  st_dist: z.number().describe('Star Distance (pc)'),
  st_tmag: z.number().describe('Star Magnitude'),
});

const ParameterPopulationInputSchema = z.object({
  modelType: z.enum(['Kepler', 'TESS']).describe('The model type to use.'),
  prompt: z.string().describe('A natural language description of a hypothetical exoplanet scenario.'),
});
export type ParameterPopulationInput = z.infer<typeof ParameterPopulationInputSchema>;


const ParameterPopulationOutputSchema = z.union([
  KeplerInputSchema.partial(),
  TESSInputSchema.partial(),
]);

export type ParameterPopulationOutput = z.infer<typeof ParameterPopulationOutputSchema>;


export async function populateParameters(input: ParameterPopulationInput): Promise<ParameterPopulationOutput> {
  return parameterPopulationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parameterPopulationPrompt',
  input: {schema: ParameterPopulationInputSchema},
  output: {schema: ParameterPopulationOutputSchema},
  prompt: `You are an expert exoplanet parameter estimation tool.  The user will provide a
natural language description of a hypothetical exoplanet scenario. Based on that description, you will estimate the exoplanet parameters for the specified model type.

Make sure that the parameters are in realistic ranges.  For example, the planet radius must be a positive number.

Model Type: {{{modelType}}}
Description: {{{prompt}}}

Output the parameters as a JSON object.  If you cannot determine a parameter, leave it blank.

Here are the parameter definitions for the model you will be using:

{{#eq modelType "Kepler"}}
{{json (describeSchema KeplerInputSchema)}}
{{/eq}}
{{#eq modelType "TESS"}}
{{json (describeSchema TESSInputSchema)}}
{{/eq}}
`,
  config: {
    model: 'googleai/gemini-2.5-flash',
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const parameterPopulationFlow = ai.defineFlow(
  {
    name: 'parameterPopulationFlow',
    inputSchema: ParameterPopulationInputSchema,
    outputSchema: ParameterPopulationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
