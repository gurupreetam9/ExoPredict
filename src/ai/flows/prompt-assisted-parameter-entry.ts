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


const ParameterPopulationOutputSchema = KeplerInputSchema.partial().merge(TESSInputSchema.partial());

export type ParameterPopulationOutput = z.infer<typeof ParameterPopulationOutputSchema>;




const prompt = ai.definePrompt({
  name: 'parameterPopulationPrompt',
  input: {schema: ParameterPopulationInputSchema},
  output: {schema: ParameterPopulationOutputSchema},
  prompt: `You are an expert exoplanet parameter estimation tool.  The user will provide a
natural language description of a hypothetical exoplanet scenario. Based on that description, you will estimate the exoplanet parameters for the specified model type.

Make sure that the parameters are in realistic ranges based on known exoplanetary physics. For example, the planet radius must be a positive number.

CRITICAL INSTRUCTION: You MUST estimate a realistic numerical value for EVERY SINGLE parameter requested below. Do NOT leave any parameter blank. Make an educated astronomical guess if the user's prompt is vague.

Model Type: {{{modelType}}}
Description: {{{prompt}}}

Output the parameters as a JSON object containing all of the fields below.

Here are the parameter definitions you should consider generating based on the Model Type:

For Kepler Model:
- koi_period: Orbital Period (days)
- koi_time0bk: Time of First Transit (BKJD)
- koi_impact: Impact Parameter
- koi_duration: Transit Duration (hours)
- koi_depth: Transit Depth (ppm)
- koi_prad: Planet Radius (Earth radii)
- koi_teq: Equilibrium Temperature (K)
- koi_insol: Insolation (Earth flux)
- koi_model_snr: Model SNR
- koi_steff: Star Temperature (K)
- koi_slogg: Star Surface Gravity (log10(cm/s^2))
- koi_srad: Star Radius (solar radii)
- koi_kepmag: Kepler Magnitude

For TESS Model:
- pl_orbper: Orbital Period (days)
- pl_trandurh: Transit Duration (hours)
- pl_trandep: Transit Depth (ppm)
- pl_rade: Planet Radius (Earth radii)
- pl_insol: Insolation (Earth flux)
- pl_eqt: Equilibrium Temperature (K)
- st_teff: Star Temperature (K)
- st_logg: Star Surface Gravity (log10(cm/s^2))
- st_rad: Star Radius (solar radii)
- st_dist: Star Distance (pc)
- st_tmag: Star Magnitude
`,
});

export async function populateParameters(input: ParameterPopulationInput): Promise<ParameterPopulationOutput> {
  const response = await prompt(input);
  if (!response.output) throw new Error("No output returned from AI");
  return response.output as ParameterPopulationOutput;
}
