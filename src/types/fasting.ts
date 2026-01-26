export interface FastingSession {
  id: string;
  startTime: string;      // ISO timestamp when fast started
  endTime: string | null; // ISO timestamp when fast ended (null = ongoing)
  goalDuration: number;   // milliseconds (default: 23.5 hours)
  date: string;           // YYYY-MM-DD of the fast start date
}

// 23.5 hours in milliseconds
export const DEFAULT_FAST_GOAL = 23.5 * 60 * 60 * 1000; // 84,600,000ms

export function formatFastDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatFastDurationShort(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
