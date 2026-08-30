/*!
 * Binaural Beats - brainwave bands and presets
 * https://github.com/evoluteur/binaural-beats
 * (c) 2026 Olivier Giulieri - MIT license
 *
 * A binaural beat is not a sound: it is the difference between two sounds.
 * Feed one ear 200 Hz and the other 210 Hz and the brain reports a 10 Hz
 * pulse that is not present in either ear. The beat frequency is what the
 * bands below refer to; the carrier is the pitch you actually hear.
 */

const BANDS = [
  {
    id: "delta",
    name: "Delta",
    from: 0.5,
    to: 4,
    color: "#5c6bc0",
    state: "Deep sleep",
    blurb:
      "The slowest rhythm, dominant in dreamless sleep and in the first months of life. Associated with physical restoration and the release of growth hormone.",
  },
  {
    id: "theta",
    name: "Theta",
    from: 4,
    to: 8,
    color: "#26a69a",
    state: "Drowsiness and deep meditation",
    blurb:
      "The border between waking and sleep: hypnagogic imagery, deep meditation, REM sleep, and the loose associative thinking that often precedes an idea.",
  },
  {
    id: "alpha",
    name: "Alpha",
    from: 8,
    to: 13,
    color: "#66bb6a",
    state: "Relaxed wakefulness",
    blurb:
      "The rhythm that appears when you close your eyes and stop working at anything. Calm, receptive, awake. The first brainwave ever recorded, by Hans Berger in 1924.",
  },
  {
    id: "beta",
    name: "Beta",
    from: 13,
    to: 30,
    color: "#ffa726",
    state: "Alert and focused",
    blurb:
      "Ordinary waking attention: reading, talking, solving a problem. Low beta is steady focus; high beta shades into alertness and, past a point, anxiety.",
  },
  {
    id: "gamma",
    name: "Gamma",
    from: 30,
    to: 100,
    color: "#ef5350",
    state: "Peak concentration",
    blurb:
      "The fastest band, linked to binding separate perceptions into one experience, and to moments of insight. Hardest to entrain, and the most debated.",
  },
];

// carrier = the pitch in each ear; beat = the difference between the ears
const PRESETS = [
  { band: "delta", beat: 2, carrier: 100, name: "Deep sleep" },
  { band: "delta", beat: 3, carrier: 110, name: "Physical restoration" },
  { band: "delta", beat: 3.5, carrier: 120, name: "Falling asleep" },
  { band: "theta", beat: 4.5, carrier: 140, name: "Drifting off" },
  { band: "theta", beat: 6, carrier: 150, name: "Deep meditation" },
  { band: "theta", beat: 6.3, carrier: 160, name: "Creative reverie" },
  { band: "theta", beat: 7.83, carrier: 180, name: "Schumann resonance" },
  { band: "alpha", beat: 8.5, carrier: 190, name: "Letting go" },
  { band: "alpha", beat: 10, carrier: 200, name: "Calm and relaxed" },
  { band: "alpha", beat: 11, carrier: 210, name: "Light meditation" },
  { band: "alpha", beat: 12, carrier: 220, name: "Effortless flow" },
  { band: "beta", beat: 14, carrier: 230, name: "Settled focus" },
  { band: "beta", beat: 16, carrier: 240, name: "Focused work" },
  { band: "beta", beat: 20, carrier: 250, name: "Alert concentration" },
  { band: "beta", beat: 25, carrier: 260, name: "High alertness" },
  { band: "gamma", beat: 35, carrier: 280, name: "Sharp attention" },
  { band: "gamma", beat: 40, carrier: 300, name: "Insight and binding" },
];

const NOISES = [
  { id: "none", name: "No noise" },
  { id: "pink", name: "Pink noise" },
  { id: "brown", name: "Brown noise" },
];

const bandOf = (beat) =>
  BANDS.find((b) => beat >= b.from && beat < b.to) || BANDS[BANDS.length - 1];

const presetsOf = (bandId) => PRESETS.filter((p) => p.band === bandId);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BANDS, PRESETS, NOISES, bandOf, presetsOf };
}
