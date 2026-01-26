export interface WeightEntry {
  id: string;
  date: string;           // YYYY-MM-DD (one entry per date)
  weight: number;         // in user's preferred unit
  unit: 'kg' | 'lbs';
  notes?: string;
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}

export type WeightUnit = 'kg' | 'lbs';

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  if (from === 'kg' && to === 'lbs') {
    return Math.round(weight * 2.20462 * 10) / 10;
  }
  // lbs to kg
  return Math.round(weight / 2.20462 * 10) / 10;
}
