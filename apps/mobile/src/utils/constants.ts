export const COLORS = {
  primary: '#3B82F6',
  secondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Lowest',
  250: 'Low',
  500: 'Normal',
  750: 'High',
  1000: 'Highest',
};

export function getPriorityLabel(priority: number): string {
  if (priority <= 125) return 'Lowest';
  if (priority <= 375) return 'Low';
  if (priority <= 625) return 'Normal';
  if (priority <= 875) return 'High';
  return 'Highest';
}
