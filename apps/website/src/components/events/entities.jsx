import React from 'react';
import { ExternalLink } from 'lucide-react';

// Every side named in an event block (team_a, winner, opponent, run.team, …)
// is a plain name. It resolves first against the event's own `participants`
// (ad-hoc squads, tag pairs, bosses) and then against that season's league
// teams, so authors write "Budokai" or "Team Beerus" and get icon/color/banner
// either way.
export function makeResolver(event, teamsData) {
  const participants = event?.participants || [];
  const teams = teamsData?.teams || [];
  const cache = new Map();
  return (name) => {
    if (!name) return null;
    if (cache.has(name)) return cache.get(name);
    let entity;
    const p = participants.find((x) => x.name === name);
    const t = teams.find((x) => x.name === name);
    if (p) {
      entity = { name, kind: 'participant', color: p.color || '#6B7280', icon: p.icon || null, banner: p.banner || null, participant: p };
    } else if (t) {
      entity = { name, kind: 'team', color: t.color || '#6B7280', icon: t.icon || null, banner: t.banner || null, team: t };
    } else {
      entity = { name, kind: 'unknown', color: '#6B7280', icon: null, banner: null };
    }
    cache.set(name, entity);
    return entity;
  };
}

// Adapts a resolver to the getTeamIcon/getTeamColor/getTeamBanner prop trio
// PlayoffBracket & friends expect.
export function lookupsFromResolver(resolve) {
  return {
    getTeamIcon: (name) => resolve(name)?.icon || null,
    getTeamColor: (name) => resolve(name)?.color || '#6B7280',
    getTeamBanner: (name) => resolve(name)?.banner || null,
  };
}

const SIZES = {
  sm: 'w-6 h-6 rounded-md text-xs',
  md: 'w-8 h-8 rounded-lg text-sm',
  lg: 'w-12 h-12 rounded-xl text-lg',
};

export function EntityAvatar({ entity, size = 'md', dim = false, className = '' }) {
  const cls = `${SIZES[size] || SIZES.md} flex-shrink-0 object-cover ${className}`;
  const style = { opacity: dim ? 0.35 : 1 };
  if (entity?.icon) {
    return <img src={entity.icon} alt={entity.name} className={cls} style={style} />;
  }
  return (
    <div
      className={`${cls} flex items-center justify-center text-white font-bold`}
      style={{ ...style, backgroundColor: entity?.color || '#6B7280' }}
    >
      {entity?.name ? entity.name.replace(/^(Team|The)\s+/i, '').charAt(0) : '?'}
    </div>
  );
}

const STATUS_STYLES = {
  upcoming: { label: 'Upcoming', dark: 'bg-gray-800 text-gray-400', light: 'bg-stone-200 text-stone-500' },
  in_progress: { label: 'In Progress', dark: 'bg-orange-500/20 text-orange-400', light: 'bg-orange-100 text-orange-700' },
  live: { label: '● Live', dark: 'bg-red-500/20 text-red-400', light: 'bg-red-100 text-red-600' },
  completed: { label: 'Completed', dark: 'bg-green-500/15 text-green-400', light: 'bg-green-100 text-green-700' },
};

export function StatusBadge({ status, darkMode, className = '' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.upcoming;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${darkMode ? s.dark : s.light} ${className}`}>
      {s.label}
    </span>
  );
}

export const TIMING_LABELS = {
  preseason: 'Pre-Season',
  'mid-season': 'Mid-Season',
  'off-season': 'Off-Season',
};

export function TimingBadge({ timing, darkMode, className = '' }) {
  if (!timing) return null;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
      darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
    } ${className}`}>
      {TIMING_LABELS[timing] || timing}
    </span>
  );
}

export function WatchLink({ href, darkMode, label = 'Watch' }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`text-xs flex items-center gap-1 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`}>
      <ExternalLink className="w-3 h-3 flex-shrink-0" /> {label}
    </a>
  );
}

// Card chrome shared by every block so the detail page reads as one system.
export function BlockSection({ title, darkMode, children, actions = null }) {
  return (
    <section className={`rounded-xl border overflow-hidden ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
    }`}>
      {(title || actions) && (
        <div className={`flex items-center justify-between gap-3 px-5 py-3 border-b ${
          darkMode ? 'border-gray-800' : 'border-stone-200'
        }`}>
          <h2 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-stone-900'}`}>{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
