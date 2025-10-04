import { z } from 'zod';

export type ModelType = 'Kepler' | 'TESS';

export interface FormFieldConfig {
  name: string;
  label: string;
  placeholder: string;
  tooltip: string;
}

export const keplerFields: FormFieldConfig[] = [
  { name: 'koi_period', label: 'Orbital Period', placeholder: 'e.g., 4.57', tooltip: 'Orbital Period (days)' },
  { name: 'koi_time0bk', label: 'Time of First Transit', placeholder: 'e.g., 133.77', tooltip: 'Time of First Transit (BKJD)' },
  { name: 'koi_impact', label: 'Impact Parameter', placeholder: 'e.g., 0.14', tooltip: 'Impact Parameter' },
  { name: 'koi_duration', label: 'Transit Duration', placeholder: 'e.g., 2.94', tooltip: 'Transit Duration (hours)' },
  { name: 'koi_depth', label: 'Transit Depth', placeholder: 'e.g., 615.8', tooltip: 'Transit Depth (ppm)' },
  { name: 'koi_prad', label: 'Planet Radius', placeholder: 'e.g., 2.26', tooltip: 'Planet Radius (Earth radii)' },
  { name: 'koi_teq', label: 'Equilibrium Temperature', placeholder: 'e.g., 793', tooltip: 'Equilibrium Temperature (K)' },
  { name: 'koi_insol', label: 'Insolation', placeholder: 'e.g., 93.59', tooltip: 'Insolation (Earth flux)' },
  { name: 'koi_model_snr', label: 'Model SNR', placeholder: 'e.g., 35.8', tooltip: 'Model Signal-to-Noise Ratio' },
  { name: 'koi_steff', label: 'Star Temperature', placeholder: 'e.g., 5455', tooltip: 'Stellar Effective Temperature (K)' },
  { name: 'koi_slogg', label: 'Star Surface Gravity', placeholder: 'e.g., 4.467', tooltip: 'Stellar Surface Gravity (log10(cm/s^2))' },
  { name: 'koi_srad', label: 'Star Radius', placeholder: 'e.g., 0.927', tooltip: 'Stellar Radius (solar radii)' },
  { name: 'koi_kepmag', label: 'Kepler Magnitude', placeholder: 'e.g., 15.347', tooltip: 'Kepler-band Magnitude' },
];

export const tessFields: FormFieldConfig[] = [
  { name: 'pl_orbper', label: 'Orbital Period', placeholder: 'e.g., 3.54', tooltip: 'Orbital Period (days)' },
  { name: 'pl_trandurh', label: 'Transit Duration', placeholder: 'e.g., 1.91', tooltip: 'Transit Duration (hours)' },
  { name: 'pl_trandep', label: 'Transit Depth', placeholder: 'e.g., 1234.5', tooltip: 'Transit Depth (ppm)' },
  { name: 'pl_rade', label: 'Planet Radius', placeholder: 'e.g., 1.21', tooltip: 'Planet Radius (Earth radii)' },
  { name: 'pl_insol', label: 'Insolation', placeholder: 'e.g., 888.3', tooltip: 'Insolation (Earth flux)' },
  { name: 'pl_eqt', label: 'Equilibrium Temperature', placeholder: 'e.g., 1636', tooltip: 'Equilibrium Temperature (K)' },
  { name: 'st_teff', label: 'Star Temperature', placeholder: 'e.g., 6117', tooltip: 'Stellar Effective Temperature (K)' },
  { name: 'st_logg', label: 'Star Surface Gravity', placeholder: 'e.g., 4.23', tooltip: 'Stellar Surface Gravity (log10(cm/s^2))' },
  { name: 'st_rad', label: 'Star Radius', placeholder: 'e.g., 1.54', tooltip: 'Stellar Radius (solar radii)' },
  { name: 'st_dist', label: 'Star Distance', placeholder: 'e.g., 149.6', tooltip: 'Distance to the star (parsecs)' },
  { name: 'st_tmag', label: 'Star Magnitude', placeholder: 'e.g., 9.54', tooltip: 'TESS-band Magnitude' },
];

const numberField = z.coerce.number({ invalid_type_error: "Must be a number" }).positive({ message: "Must be positive" });

export const KeplerSchema = z.object({
  modelType: z.enum(['Kepler', 'TESS']).optional(),
  koi_period: numberField,
  koi_time0bk: numberField,
  koi_impact: numberField,
  koi_duration: numberField,
  koi_depth: numberField,
  koi_prad: numberField,
  koi_teq: numberField,
  koi_insol: numberField,
  koi_model_snr: numberField,
  koi_steff: numberField,
  koi_slogg: numberField,
  koi_srad: numberField,
  koi_kepmag: numberField,
});

export const TESSchema = z.object({
  modelType: z.enum(['Kepler', 'TESS']).optional(),
  pl_orbper: numberField,
  pl_trandurh: numberField,
  pl_trandep: numberField,
  pl_rade: numberField,
  pl_insol: numberField,
  pl_eqt: numberField,
  st_teff: numberField,
  st_logg: numberField,
  st_rad: numberField,
  st_dist: numberField,
  st_tmag: numberField,
});
