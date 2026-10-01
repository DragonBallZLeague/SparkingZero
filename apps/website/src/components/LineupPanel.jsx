import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';

// Lineup / build display primitives shared by the Season page (schedule +
// playoffs) and the Events page. All data comes from content/lineups/*.yaml
// files (team1/team2 arrays of { character, costume, capsules, ai, transformAi }).

export function parseCapsule(str) {
  const m = str.match(/^(.+?)\s+\((\d+)\)$/);
  return m ? { name: m[1], cost: m[2] } : { name: str, cost: null };
}

export function CharacterCard({ char, darkMode }) {
  const hasTransformAi = char.transformAi && char.transformAi !== '';
  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800/80' : 'bg-stone-100'}`}>
      <div className={`font-bold text-sm mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
        {char.character}
      </div>
      {char.costume && (
        <div className={`text-xs mb-1.5 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          {char.costume}
        </div>
      )}
      <div className='space-y-0.5'>
        {(char.capsules || []).map((cap, ci) => {
          const { name, cost } = parseCapsule(cap);
          return (
            <div key={ci} className={`flex justify-between items-center text-xs ${darkMode ? 'text-gray-200' : 'text-stone-700'}`}>
              <span>{name}</span>
              {cost !== null && (
                <span className={`font-bold ml-3 shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{cost}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700/50' : 'border-stone-200'} flex items-start justify-between gap-2 text-xs`}>
        <span className={`shrink-0 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>AI Strategy</span>
        <span className={`text-right font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{char.ai}</span>
      </div>
      {hasTransformAi && (
        <div className={`flex items-start justify-between gap-2 text-xs mt-0.5`}>
          <span className={`shrink-0 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>Transformation AI</span>
          <span className={`text-right ${darkMode ? 'text-purple-400/70' : 'text-purple-500/80'}`}>{char.transformAi}</span>
        </div>
      )}
    </div>
  );
}

// A playoff match can carry up to two lineup files — one per week of the
// series. `lineup_file` is kept as a fallback so existing match data
// (uploaded before week 2 support existed) keeps working as 'week 1'.
export function getLineupWeekFiles(match) {
  const week1 = match?.lineup_file_week1 || match?.lineup_file || null;
  const week2 = match?.lineup_file_week2 || null;
  return { week1, week2, hasLineup: !!(week1 || week2), hasBothWeeks: !!(week1 && week2) };
}

// A playoff match can carry up to two video links — one per week of the
// series. `video_url` is kept as a fallback so existing match data
// (uploaded before week 2 support existed) keeps working as 'week 1'.
export function getVideoWeekUrls(match) {
  const week1 = match?.video_url_week1 || match?.video_url || null;
  const week2 = match?.video_url_week2 || null;
  return { week1, week2, hasVideo: !!(week1 || week2), hasBothWeeks: !!(week1 && week2) };
}

export function PlayoffVideoLinks({ week1, week2, darkMode }) {
  const linkClass = `text-xs flex items-center gap-1 leading-tight ${darkMode ? 'text-orange-400' : 'text-blue-600'}`;
  return (
    <div className='flex items-center gap-2'>
      {week1 && (
        <a href={week1} target='_blank' rel='noopener noreferrer' className={linkClass}>
          <ExternalLink className='w-3 h-3 flex-shrink-0' />
          <span>Watch{week2 && <><br />Week 1</>}</span>
        </a>
      )}
      {week2 && (
        <a href={week2} target='_blank' rel='noopener noreferrer' className={linkClass}>
          <ExternalLink className='w-3 h-3 flex-shrink-0' />
          <span>Watch<br />Week 2</span>
        </a>
      )}
    </div>
  );
}

export function LineupWeekSwitcher({ activeWeek, onSelectWeek, darkMode }) {
  return (
    <div className='flex justify-center mx-3 sm:mx-4 mt-3'>
      <div className={`inline-flex gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-800/60' : 'bg-stone-200'}`}>
        {[1, 2].map((wk) => (
          <button
            key={wk}
            onClick={() => onSelectWeek(wk)}
            className={`px-4 py-1 text-xs rounded-md font-medium transition-colors ${
              activeWeek === wk
                ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Week {wk}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LineupPanel({ data, loading, darkMode, homeTeam, awayTeam, homeBanner, awayBanner }) {
  const [activeTeam, setActiveTeam] = useState(0);
  const [homeBannerRatio, setHomeBannerRatio] = useState(null);
  const [awayBannerRatio, setAwayBannerRatio] = useState(null);
  if (loading) {
    return (
      <div className={`p-6 text-center text-sm animate-pulse ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
        Loading lineup...
      </div>
    );
  }
  if (!data) return null;
  const team1 = data.team1 || [];
  const team2 = data.team2 || [];
  return (
    <div className='relative'>
      {/* Desktop: banner backgrounds behind the full panel, split left/right */}
      <div className='hidden sm:block absolute inset-0 pointer-events-none overflow-hidden'>
        {homeBanner && (
          <div
            className='absolute left-0 top-0 w-1/2 h-full overflow-hidden'
            style={{
              containerType: 'size',
              maskImage: 'linear-gradient(to right, transparent 0%, black 10%, transparent 50%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, transparent 50%)',
            }}
          >
            <img
              src={homeBanner}
              alt=''
              aria-hidden='true'
              onLoad={(e) => setHomeBannerRatio(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth)}
              style={{
                position: 'absolute',
                top: '50%',
                left: homeBannerRatio !== null ? `calc(50cqh * ${homeBannerRatio - 1})` : '-9999px',
                width: '100cqh',
                height: 'auto',
                maxWidth: 'none',
                transform: 'translateY(-50%) rotate(-90deg)',
                opacity: 0.75,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
        {awayBanner && (
          <div
            className='absolute right-0 top-0 w-1/2 h-full overflow-hidden'
            style={{
              containerType: 'size',
              maskImage: 'linear-gradient(to left, transparent 0%, black 10%, transparent 50%)',
              WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 10%, transparent 50%)',
            }}
          >
            <img
              src={awayBanner}
              alt=''
              aria-hidden='true'
              onLoad={(e) => setAwayBannerRatio(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth)}
              style={{
                position: 'absolute',
                top: '50%',
                right: awayBannerRatio !== null ? `calc(50cqh * ${awayBannerRatio - 1})` : '-9999px',
                width: '100cqh',
                height: 'auto',
                maxWidth: 'none',
                transform: 'translateY(-50%) rotate(90deg)',
                opacity: 0.75,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </div>
      {/* Content */}
      <div className='relative p-3 sm:p-4'>
        {/* Mobile: tab switcher */}
        <div className={`flex sm:hidden gap-1 p-1 rounded-xl mb-3 ${darkMode ? 'bg-gray-800/60' : 'bg-stone-200'}`}>
          <button
            onClick={() => setActiveTeam(0)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors truncate px-2 ${
              activeTeam === 0
                ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {homeTeam}
          </button>
          <button
            onClick={() => setActiveTeam(1)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors truncate px-2 ${
              activeTeam === 1
                ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {awayTeam}
          </button>
        </div>
        {/* Mobile: single active team */}
        <div className='sm:hidden space-y-2'>
          {(activeTeam === 0 ? team1 : team2).map((char, i) => (
            <CharacterCard key={i} char={char} darkMode={darkMode} />
          ))}
        </div>
        {/* Desktop: side-by-side */}
        <div className='hidden sm:flex items-start justify-center gap-4'>
          <div className='w-full max-w-xs'>
            <div className='space-y-2'>
              {team1.map((char, i) => (
                <CharacterCard key={i} char={char} darkMode={darkMode} />
              ))}
            </div>
          </div>
          <div className={`flex-shrink-0 self-center text-lg font-bold px-2 ${darkMode ? 'text-gray-600' : 'text-stone-300'}`}>
            Vs
          </div>
          <div className='w-full max-w-xs'>
            <div className='space-y-2'>
              {team2.map((char, i) => (
                <CharacterCard key={i} char={char} darkMode={darkMode} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
