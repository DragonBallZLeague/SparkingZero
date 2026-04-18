import React, { useState, useEffect } from 'react';
import { XCircle, Star, AlertTriangle } from 'lucide-react';
import { loadContent } from '../../utils/contentLoader';
import MarkdownContent from './MarkdownContent';

export default function BuildRules({ darkMode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadContent('rules/build-rules.yaml').then(setData);
  }, []);

  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  const card = `rounded-xl border p-5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'}`;
  const accentText = darkMode ? 'text-orange-400' : 'text-blue-600';
  const accentBg = darkMode ? 'bg-orange-500/20 border-orange-500/30' : 'bg-blue-100 border-blue-300';
  const subText = darkMode ? 'text-gray-400' : 'text-stone-500';

  return (
    <div className="max-w-3xl space-y-5">

      {/* Point Budget */}
      <div className={card}>
        <h3 className={`font-semibold text-base mb-3 ${darkMode ? 'text-white' : 'text-stone-900'}`}>Point Budget</h3>
        <div className="flex items-center gap-5">
          <div className={`text-6xl font-black leading-none ${accentText}`}>{data.point_budget}</div>
          <div>
            <div className={`font-medium ${darkMode ? 'text-white' : 'text-stone-900'}`}>points per character</div>
            <div className={`text-sm mt-0.5 ${subText}`}>{data.max_per_capsule_note}</div>
          </div>
        </div>
      </div>

      {/* Banned Capsules */}
      <div className={card}>
        <h3 className={`font-semibold text-base mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
          <XCircle className="w-5 h-5 text-red-500" />
          Banned Capsules
        </h3>
        <div className="flex flex-wrap gap-2">
          {(data.banned_capsules || []).map((c) => (
            <span
              key={c.name}
              className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Health Capsule Limit */}
      {data.health_capsule_limit && (
        <div className={card}>
          <h3 className={`font-semibold text-base mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            Health Capsule Limit
          </h3>
          <p className={`text-sm mb-3 ${subText}`}>{data.health_capsule_limit.description}</p>
          <div className="grid grid-cols-2 gap-3">
            {['option_a', 'option_b'].map((key, i) => {
              const opt = data.health_capsule_limit[key];
              if (!opt) return null;
              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-stone-200'}`}
                >
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${accentText}`}>
                    Option {i === 0 ? 'A' : 'B'}
                  </div>
                  <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-stone-900'}`}>{opt.label}</div>
                  <div className={`text-xs mt-0.5 ${subText}`}>{opt.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boost Cap */}
      {data.boost_cap && (
        <div className={card}>
          <h3 className={`font-semibold text-base mb-1 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            <Star className="w-5 h-5 text-yellow-400" />
            Boost Cap
          </h3>
          <p className={`text-sm mb-3 ${subText}`}>{data.boost_cap.description}</p>
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: data.boost_cap.max_stars }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className={`ml-2 text-sm ${subText}`}>maximum combined</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.boost_cap.categories || []).map((cat) => (
              <span
                key={cat}
                className={`px-2 py-1 rounded text-xs border ${accentBg} ${accentText}`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Form Restriction */}
      {data.form_restriction && (
        <div className={`rounded-xl border p-5 ${darkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <div className={`font-semibold text-sm mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                Form Restriction
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{data.form_restriction}</div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Notes */}
      {data.additional_notes && (
        <div className={card}>
          <MarkdownContent content={data.additional_notes} darkMode={darkMode} />
        </div>
      )}

      {data.last_updated && (
        <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Last updated: {new Date(data.last_updated).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  );
}
