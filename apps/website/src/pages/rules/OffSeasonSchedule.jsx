import React, { useState, useEffect } from 'react';
import { FlaskConical, Users, ArrowLeftRight, RotateCcw, Banknote } from 'lucide-react';
import { loadContent } from '../../utils/contentLoader';

const ICON_MAP = {
  FlaskConical,
  Users,
  ArrowLeftRight,
  RotateCcw,
  Banknote,
};

export default function OffSeasonSchedule({ darkMode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadContent('rules/off-season-schedule.yaml').then(setData);
  }, []);

  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  const accentText = darkMode ? 'text-orange-400' : 'text-blue-600';
  const accentBg = darkMode ? 'bg-orange-500/20' : 'bg-blue-100';
  const accentBorder = darkMode ? 'border-orange-500/30' : 'border-blue-300';
  const lineBg = darkMode ? 'bg-gray-700' : 'bg-stone-300';
  const card = `rounded-xl border p-5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'}`;

  return (
    <div className="max-w-2xl">
      {data.intro && (
        <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>{data.intro}</p>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className={`absolute left-5 top-6 bottom-6 w-0.5 ${lineBg}`} />

        <div className="space-y-5">
          {(data.phases || []).map((phase, i) => {
            const Icon = ICON_MAP[phase.icon] || FlaskConical;
            return (
              <div key={i} className="flex gap-5">
                {/* Icon circle */}
                <div className={`shrink-0 relative z-10 w-10 h-10 rounded-full border flex items-center justify-center ${accentBg} ${accentBorder}`}>
                  <Icon className={`w-4 h-4 ${accentText}`} />
                </div>
                {/* Card */}
                <div className={`flex-1 ${card}`}>
                  <div className={`font-semibold text-sm mb-1.5 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                    {phase.name}
                  </div>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.last_updated && (
        <p className={`mt-8 text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Last updated: {new Date(data.last_updated).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  );
}
