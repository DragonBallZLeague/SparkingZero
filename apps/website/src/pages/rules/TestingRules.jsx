import React, { useState, useEffect } from 'react';
import { loadContent } from '../../utils/contentLoader';

export default function TestingRules({ darkMode }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('rules');

  useEffect(() => {
    loadContent('rules/testing-rules.yaml').then(setData);
  }, []);

  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  const card = `rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'}`;
  const accentText = darkMode ? 'text-orange-400' : 'text-blue-600';
  const accentNum = darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-100 text-blue-700';
  const subText = darkMode ? 'text-gray-400' : 'text-stone-500';
  const heading = darkMode ? 'text-white' : 'text-stone-900';
  const codeChip = darkMode ? 'bg-gray-800 text-orange-300' : 'bg-stone-200 text-stone-700';
  const preBlock = darkMode ? 'bg-gray-950 text-gray-300' : 'bg-stone-100 text-stone-700';

  return (
    <div className="max-w-3xl">
      {/* Tabs */}
      <div className={`flex gap-1 mb-6 p-1 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-stone-100'}`}>
        {['rules', 'template'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? darkMode ? 'bg-gray-800 text-white' : 'bg-white text-stone-900 shadow-sm'
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {tab === 'rules' ? '📋 Rules' : '📝 Template'}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-5">
          {/* General rules */}
          <div className={`p-5 ${card}`}>
            <h3 className={`font-semibold mb-4 ${heading}`}>General Rules</h3>
            <ol className="space-y-3">
              {(data.rules || []).map((rule, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold mt-0.5 ${accentNum}`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>{rule}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Formats */}
          {(data.formats || []).length > 0 && (
            <div className={`p-5 ${card}`}>
              <h3 className={`font-semibold mb-4 ${heading}`}>Test Formats</h3>
              <div className="space-y-5">
                {(data.formats || []).map((fmt) => (
                  <div key={fmt.type}>
                    <div className={`text-sm font-semibold mb-1.5 ${accentText}`}>
                      {fmt.type}
                      {fmt.frequency && (
                        <span className={`ml-2 font-normal text-xs ${subText}`}>— {fmt.frequency}</span>
                      )}
                    </div>
                    <div className="space-y-1.5 ml-0.5">
                      {(fmt.options || []).map((opt) => (
                        <div key={opt.label} className="flex items-center gap-3">
                          <code className={`px-2 py-0.5 rounded text-xs font-mono shrink-0 ${codeChip}`}>
                            {opt.label}
                          </code>
                          <span className={`text-sm ${subText}`}>{opt.description}</span>
                        </div>
                      ))}
                    </div>
                    {fmt.deadline && (
                      <p className={`mt-1.5 text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        ⏰ Deadline: {fmt.deadline}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'template' && (
        <div className="space-y-5">
          <div className={`p-5 ${card}`}>
            <h3 className={`font-semibold mb-3 ${heading}`}>Submission Template</h3>
            <pre className={`p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed ${preBlock}`}>
              {data.template}
            </pre>
          </div>
          {data.template_example && (
            <div className={`p-5 ${card}`}>
              <h3 className={`font-semibold mb-3 ${heading}`}>Example Submission</h3>
              <pre className={`p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed ${preBlock}`}>
                {data.template_example}
              </pre>
            </div>
          )}
        </div>
      )}

      {data.last_updated && (
        <p className={`mt-6 text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Last updated: {new Date(data.last_updated).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  );
}
