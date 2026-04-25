export const BENIN_DEPARTMENTS = [
  'Alibori',
  'Atacora',
  'Atlantique',
  'Borgou',
  'Collines',
  'Couffo',
  'Donga',
  'Littoral',
  'Mono',
  'Oueme',
  'Plateau',
  'Zou',
] as const;

export type BeninDepartment = (typeof BENIN_DEPARTMENTS)[number];

export function mapIntensityColor(count: number): string {
  if (count >= 8) return '#ef4444';
  if (count >= 4) return '#f59e0b';
  if (count >= 1) return '#22c55e';
  return '#64748b';
}

export function departmentLabel(value: string | null | undefined): string {
  if (!value) return 'Non renseigne';
  return value;
}
