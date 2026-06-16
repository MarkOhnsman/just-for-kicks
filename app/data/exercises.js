// =======================================================
// EXERCISE POOLS — the moves the app picks from each day.
// Pure data. `say` is the text spoken aloud (hands-free).
// =======================================================

// Block 2: equipment-free, plyometric strength moves.
export const STRENGTH_POOL = [
  { emoji: "💥", name: "SQUAT JUMPS", sub: "Sink low, jump high, land soft",          say: "Squat jumps" },
  { emoji: "🆙", name: "TUCK JUMPS",  sub: "Jump and pull your knees to your chest",   say: "Tuck jumps" },
  { emoji: "⭐", name: "STAR JUMPS",  sub: "Explode out — arms and legs wide",         say: "Star jumps" },
  { emoji: "⛸️", name: "SKATER HOPS", sub: "Leap side to side, land on one foot",      say: "Skater hops" },
  { emoji: "🏞️", name: "BROAD JUMPS", sub: "Swing arms, jump far, stick the landing",  say: "Broad jumps" },
  { emoji: "🦘", name: "POGO HOPS",   sub: "Fast little bounces on your toes",         say: "Pogo hops" },
  { emoji: "🐸", name: "FROG JUMPS",  sub: "Squat low, hands down, jump forward",      say: "Frog jumps" },
  { emoji: "🦵", name: "SPLIT JUMPS", sub: "Lunge, jump, switch legs in the air",      say: "Split squat jumps" },
  { emoji: "🌀", name: "180 SPINS",   sub: "Jump, spin halfway, land balanced",        say: "One eighty jumps" },
  { emoji: "🦩", name: "1-LEG HOPS",  sub: "Hop on one foot, balance, then switch",    say: "Single leg hops" },
  { emoji: "🐰", name: "BUNNY HOPS",  sub: "Quick light two-foot hops forward",        say: "Bunny hops" },
  { emoji: "🤸", name: "LINE JUMPS",  sub: "Hop fast over an imaginary line",          say: "Line jumps" }
];

// Block 3: countable, equipment-free moves. `unit` is what you count.
export const AMRAP_POOL = [
  { emoji: "💥", name: "SQUAT JUMPS",      sub: "Count each jump",        unit: "jumps", say: "Squat jumps" },
  { emoji: "⭐", name: "STAR JUMPS",       sub: "Count each jump",        unit: "jumps", say: "Star jumps" },
  { emoji: "🆙", name: "TUCK JUMPS",       sub: "Count each jump",        unit: "jumps", say: "Tuck jumps" },
  { emoji: "🏃", name: "HIGH KNEES",       sub: "Count every right knee", unit: "knees", say: "High knees" },
  { emoji: "⛰️", name: "MOUNTAIN CLIMBERS", sub: "Count each knee drive",  unit: "reps",  say: "Mountain climbers" },
  { emoji: "🔥", name: "BURPEES",          sub: "Chest down, jump at the top", unit: "reps", say: "Burpees" },
  { emoji: "⛸️", name: "SKATER HOPS",      sub: "Count each landing",     unit: "hops",  say: "Skater hops" },
  { emoji: "⚡", name: "JUMPING JACKS",    sub: "Count each jack",        unit: "jacks", say: "Jumping jacks" },
  { emoji: "👟", name: "FAST FEET",        sub: "Count every right foot", unit: "steps", say: "Fast feet" },
  { emoji: "🐸", name: "FROG JUMPS",       sub: "Count each jump forward", unit: "jumps", say: "Frog jumps" }
];
