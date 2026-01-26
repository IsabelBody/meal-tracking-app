export interface WeightEntry {
  id: string;
  date: string;           // YYYY-MM-DD (one entry per date)
  weight: number;         // in kg
  unit: 'kg';
  notes?: string;
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}

export type WeightUnit = 'kg';
