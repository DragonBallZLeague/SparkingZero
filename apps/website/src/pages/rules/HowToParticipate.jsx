import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { loadContent } from '../../utils/contentLoader';

export default function HowToParticipate({ darkMode }) {
  const [data, setData] = useState(null);
  const [activeTrack, setActiveTrack] = useState('viewer');

  useEffect(() => {
    loadContent('rules/how-to-participate.yaml').then(setData);
  }, []);

  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  const steps = activeTrack === 'viewer' ? data.viewer_steps : data.participant_steps;
  const accent = darkMode ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-100 text-blue-700 border-blue-300';
  const inactive = darkMode ? 'border-gray-800 text-gray-400 hover:text-white' : 'border-stone-200 text-stone-500 hover:text-stone-800';
  const card = `rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'}`;

  return (
    <div className="max-w-3xl">
      {data.intro && (
        <p className={`mb-6 text-lg ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>{data.intro}</p>
      )}

      {data.overview && (
        <div className={`mb-8 p-5 rounded-xl border ${darkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-blue-50 border-blue-200'}`}>
          <p className={darkMode ? 'text-gray-300' : 'text-stone-600'}>{data.overview}</p>
        </div>
      )}

      {/* Track toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTrack('viewer')}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition-all ${activeTrack === 'viewer' ? accent : inactive}`}
        >
          👀 I'm a Viewer
        </button>
        <button
          onClick={() => setActiveTrack('participant')}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition-all ${activeTrack === 'participant' ? accent : inactive}`}
        >
          ⚡ I Want to Participate
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {(steps || []).map((step, i) => (
          <div key={i} className={`flex gap-4 p-5 ${card}`}>
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${accent}`}>
              {i + 1}
            </div>
            <div>
              <div className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-stone-900'}`}>{step.title}</div>
              <div className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Discord CTA */}
      <div className={`mt-8 p-6 rounded-xl border text-center ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
        <p className={`mb-4 font-medium ${darkMode ? 'text-gray-200' : 'text-stone-800'}`}>
          Ready to get started?
        </p>
        <a
          href={data.discord_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          Join the Discord
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
