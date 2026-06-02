export type RangePreset = 'all' | '7d' | '30d';

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function datesForPreset(preset: RangePreset) {
  if (preset === 'all') {
    return { from: '', to: '' };
  }

  const now = new Date();
  const days = preset === '7d' ? 7 : 30;
  const from = new Date(now);
  from.setDate(now.getDate() - days);

  return {
    from: formatDateInput(from),
    to: formatDateInput(now),
  };
}

export function toIsoRange(from: string, to: string) {
  return {
    from: from ? new Date(`${from}T00:00:00`).toISOString() : '',
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : '',
  };
}
