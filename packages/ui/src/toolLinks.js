// Shared production URLs for the DBSZL app suite (website + tool apps).
// Kept as absolute URLs since each app is an independently-deployed build
// under a different GitHub Pages subpath.
const ORIGIN = 'https://dragonballzleague.github.io/SparkingZero';

export const APPS = [
  { key: 'home', label: 'Home', href: `${ORIGIN}/` },
  { key: 'analyzer', label: 'Analyzer', href: `${ORIGIN}/analyzer/` },
  { key: 'matchbuilder', label: 'Match Builder', href: `${ORIGIN}/matchbuilder/` },
  { key: 'calculator', label: 'Calculator', href: `${ORIGIN}/calculator/` },
];

export const LOGO_SRC = `${ORIGIN}/images/SZLEmblem.png`;
