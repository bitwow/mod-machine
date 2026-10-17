const NOTES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];

const EFFECTS = {
  1: 'J', 2: 'F', 3: 'E', 4: 'G', 5: 'H', 6: 'L', 7: 'K', 8: 'R',
  9: 'S', 10: 'O', 11: 'D', 12: 'B', 14: 'C', 15: 'Q', 16: 'A',
  17: 'T', 18: 'L', 19: 'S', 20: 'S', 21: 'M', 22: 'N', 23: 'V',
  24: 'W', 26: 'U', 27: 'Y', 28: 'S', 29: 'P', 31: 'I', 37: 'S',
};

export const hex = (value, width = 2) => Number(value ?? 0)
  .toString(16)
  .padStart(width, '0')
  .toUpperCase();

export function formatTrackerCell(command = []) {
  const [pitch = 0, instrument = 0, , effect = 0, volume = 0, parameter = 0] = command;
  let note = '...';

  if (pitch === 255) note = '===';
  else if (pitch === 254) note = '^^.';
  else if (pitch > 0) note = `${NOTES[(pitch - 1) % 12]}${Math.floor((pitch - 1) / 12) - 1}`;

  const sample = instrument ? hex(instrument) : '..';
  const volumeText = volume || effect === 13 ? String(effect === 13 ? parameter : volume).padStart(2, '0') : '..';
  const effectText = effect && effect !== 13 ? `${EFFECTS[effect] ?? '?'}${hex(parameter)}` : '...';

  return { note, sample, volume: volumeText, effect: effectText };
}

export function formatTime(seconds = 0) {
  if (!Number.isFinite(Number(seconds))) return '00:00';
  const total = Math.max(0, Math.floor(Number(seconds)));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
