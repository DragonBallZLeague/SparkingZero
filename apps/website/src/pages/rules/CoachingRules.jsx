import React, { useState, useEffect } from 'react';
import { loadContent } from '../../utils/contentLoader';
import MarkdownContent from './MarkdownContent';

/**
 * Presentational CoachingRules rules section: renders one already-loaded rules YAML file.
 *
 * Pure props in, markup out - no fetching - so the site (container below) and the
 * CMS preview pane (`cms/previews.jsx`) render the exact same section.
 */
export function CoachingRulesView({ data, darkMode = true }) {
  if (!data) return <div className="animate-pulse py-20 text-center text-sm">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <MarkdownContent content={data.content} darkMode={darkMode} />
      {data.last_updated && (
        <p className={`mt-8 text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Last updated: {new Date(data.last_updated).toLocaleDateString('en-US')}
        </p>
      )}
    </div>
  );
}

export default function CoachingRules({ darkMode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadContent('rules/coaching-rules.yaml').then(setData);
  }, []);

  return <CoachingRulesView data={data} darkMode={darkMode} />;
}
