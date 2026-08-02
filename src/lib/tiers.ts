export const TIER_LABELS: Record<string, string> = {
  trailblazer: 'Trailblazer',
  pacesetter: 'Pacesetter',
  voyager: 'Voyager',
  odyssey: 'Odyssey',
  mythic: 'Mythic',
  legend: 'Legend',
  ascent: 'Ascent',
};

// Bronze-to-Legend progression per MVP.md §4.6, plus a distinct teal for
// Ascent since it's a separate (elevation) axis rather than a step up the
// same distance ladder.
export const TIER_COLORS: Record<string, string> = {
  trailblazer: '#cd7f32',
  pacesetter: '#95a5a6',
  voyager: '#f1c40f',
  odyssey: '#3498db',
  mythic: '#9b59b6',
  legend: '#e74c3c',
  ascent: '#1abc9c',
};
