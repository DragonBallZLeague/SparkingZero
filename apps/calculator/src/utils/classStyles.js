/**
 * Colours for character class labels (data/curated/classes.csv `label`), shared by
 * every panel that shows a class badge. Class strings stay literal so Tailwind's
 * content scan picks them up.
 */
const STYLES = {
  'Normal':                         { badge: 'bg-blue-600 text-white',                                 gradient: 'from-blue-950' },
  'Super Saiyan':                   { badge: 'bg-yellow-500 text-black',                               gradient: 'from-yellow-950' },
  'Super Saiyan (Vegeta)':          { badge: 'bg-yellow-400 text-black',                               gradient: 'from-yellow-950' },
  'Ki-Blast':                       { badge: 'bg-purple-600 text-white',                               gradient: 'from-purple-950' },
  'Ki-Blast (Vegeta)':              { badge: 'bg-purple-500 text-white',                               gradient: 'from-purple-950' },
  'Power':                          { badge: 'bg-red-600 text-white',                                  gradient: 'from-red-950' },
  'Villain':                        { badge: 'bg-indigo-800 text-purple-200 border border-purple-600', gradient: 'from-indigo-950' },
  'Fusion':                         { badge: 'bg-sky-600 text-white',                                  gradient: 'from-sky-950' },
  'Almighty':                       { badge: 'bg-orange-500 text-white',                               gradient: 'from-orange-950' },
  'Almighty (Vegeta)':              { badge: 'bg-orange-400 text-black',                               gradient: 'from-orange-950' },
  'Rival':                          { badge: 'bg-emerald-600 text-white',                              gradient: 'from-emerald-950' },
  'Secret':                         { badge: 'bg-pink-600 text-white',                                 gradient: 'from-pink-950' },
  'Skill-User':                     { badge: 'bg-gray-600 text-white',                                 gradient: 'from-gray-950' },
  'Skill-User (Yajirobe)':          { badge: 'bg-gray-500 text-white',                                 gradient: 'from-gray-950' },
  'Skill-User (Mr. Satan)':         { badge: 'bg-stone-500 text-white',                                gradient: 'from-stone-950' },
  'Speed':                          { badge: 'bg-cyan-500 text-black',                                 gradient: 'from-cyan-950' },
  'God':                            { badge: 'bg-amber-400 text-black',                                gradient: 'from-amber-950' },
  'Giant':                          { badge: 'bg-amber-700 text-white',                                gradient: 'from-amber-950' },
  'Legendary Super Saiyan':         { badge: 'bg-green-600 text-white',                                gradient: 'from-green-950' },
  'Infinite Ki Android (Normal)':   { badge: 'bg-indigo-600 text-white',                               gradient: 'from-indigo-950' },
  'Infinite Ki Android (Ki-Blast)': { badge: 'bg-purple-700 text-white',                               gradient: 'from-purple-950' },
  'Infinite Ki Android (Power)':    { badge: 'bg-rose-700 text-white',                                 gradient: 'from-rose-950' },
  'Ki Drain Android (Normal)':      { badge: 'bg-slate-600 text-white',                                gradient: 'from-slate-950' },
  'Ki Drain Android (Power)':       { badge: 'bg-rose-600 text-white',                                 gradient: 'from-rose-950' },
};

const FALLBACK = { badge: 'bg-gray-600 text-white', gradient: 'from-gray-950' };

/** Tailwind classes for a class label's badge. */
export function classBadge(label) {
  return (STYLES[label] || FALLBACK).badge;
}

/** Tailwind gradient start colour for a class label (portrait overlay). */
export function classGradient(label) {
  return (STYLES[label] || FALLBACK).gradient;
}

export const KNOWN_CLASS_LABELS = Object.keys(STYLES);
