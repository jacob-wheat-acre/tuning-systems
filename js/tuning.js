// Tuning systems: return frequency in Hz for a given semitone offset from A4 (440 Hz)
// semitone 0 = A4, 1 = A#4, -1 = G#4, etc.

const A4 = 440;

// Chromatic note names starting from C
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Semitone offset from A4 for each note in octave 4 (C4=−9, D4=−7, ..., A4=0, ...)
// We'll reference everything from C4 for display purposes
// C4 is semitone -9 from A4

export const TUNING_SYSTEMS = {
  equal: {
    name: 'Equal Temperament',
    color: '#4fc3f7',
    freq: (semitone) => A4 * Math.pow(2, semitone / 12),
  },
  pythagorean: {
    name: 'Pythagorean',
    color: '#ef9a9a',
    freq: (semitone) => {
      const ratios = pythagoreanRatiosFromA();
      // ratios[] is C-indexed (0=C…11=B); A is at index 9.
      // Semitone 0 = A4, so we shift by +9 to get the correct fromC index.
      const fromCIndex = ((semitone + 9) % 12 + 12) % 12;
      const octave = Math.floor(semitone / 12);
      return A4 * ratios[fromCIndex] * Math.pow(2, octave);
    },
  },
  just: {
    name: 'Just Intonation',
    color: '#a5d6a7',
    freq: (semitone) => {
      const ratios = justRatiosFromA();
      const fromCIndex = ((semitone + 9) % 12 + 12) % 12;
      const octave = Math.floor(semitone / 12);
      return A4 * ratios[fromCIndex] * Math.pow(2, octave);
    },
  },
};

// Pythagorean ratios for each chromatic degree relative to A=1
// Built by stacking 3:2 fifths: A→E→B→F#→C#→G#→D#→A# and A→D→G→C→F→Bb→Eb
function pythagoreanRatiosFromA() {
  // Start from A=1, stack fifths up and down, reduce to one octave
  // Up: A(0) E(7) B(2) F#(9) C#(4) G#(11) D#(6) A#(1)
  // Down: A(0) D(5) G(10) C(3) F(8) Bb(−2→10... we use 12 notes so Bb=10?
  // Standard Pythagorean on C: C D E F G A B → then chromatic fills
  // Let's define all 12 relative to C, then shift to A

  // Pythagorean ratios from C (unison=1):
  const fromC = [
    1,          // C
    2187/2048,  // C# (7 fifths up)
    9/8,        // D
    32/27,      // Eb (3 fifths down)
    81/64,      // E
    4/3,        // F
    729/512,    // F# (6 fifths up)
    3/2,        // G
    128/81,     // Ab (4 fifths down) -- wolf zone
    27/16,      // A
    16/9,       // Bb (2 fifths down)
    243/128,    // B
  ];

  // A is degree 9 from C, ratio 27/16
  // Shift so A=1: divide all by fromC[9] = 27/16, adjust octave
  const aRatio = fromC[9]; // 27/16
  return fromC.map((r, i) => {
    let shifted = r / aRatio;
    if (shifted < 1) shifted *= 2;
    if (shifted >= 2) shifted /= 2;
    return shifted;
  });
}

// 5-limit just intonation ratios from C, shifted to A=1
function justRatiosFromA() {
  const fromC = [
    1,      // C
    16/15,  // C#
    9/8,    // D
    6/5,    // Eb
    5/4,    // E
    4/3,    // F
    45/32,  // F#
    3/2,    // G
    8/5,    // Ab
    5/3,    // A
    9/5,    // Bb
    15/8,   // B
  ];

  const aRatio = fromC[9]; // 5/3
  return fromC.map((r) => {
    let shifted = r / aRatio;
    if (shifted < 1) shifted *= 2;
    if (shifted >= 2) shifted /= 2;
    return shifted;
  });
}

// Get cents deviation from equal temperament for a given semitone and tuning system
export function getCentsDeviation(semitone, tuningKey) {
  const etFreq = TUNING_SYSTEMS.equal.freq(semitone);
  const tuningFreq = TUNING_SYSTEMS[tuningKey].freq(semitone);
  return 1200 * Math.log2(tuningFreq / etFreq);
}

// Common intervals as [name, semitones, just ratio label]
export const INTERVALS = [
  { name: 'Unison',        semitones: 0,  ratio: '1:1' },
  { name: 'Minor 2nd',     semitones: 1,  ratio: '16:15' },
  { name: 'Major 2nd',     semitones: 2,  ratio: '9:8' },
  { name: 'Minor 3rd',     semitones: 3,  ratio: '6:5' },
  { name: 'Major 3rd',     semitones: 4,  ratio: '5:4' },
  { name: 'Perfect 4th',   semitones: 5,  ratio: '4:3' },
  { name: 'Tritone',       semitones: 6,  ratio: '45:32' },
  { name: 'Perfect 5th',   semitones: 7,  ratio: '3:2' },
  { name: 'Minor 6th',     semitones: 8,  ratio: '8:5' },
  { name: 'Major 6th',     semitones: 9,  ratio: '5:3' },
  { name: 'Minor 7th',     semitones: 10, ratio: '9:5' },
  { name: 'Major 7th',     semitones: 11, ratio: '15:8' },
  { name: 'Octave',        semitones: 12, ratio: '2:1' },
];

export { NOTE_NAMES };
