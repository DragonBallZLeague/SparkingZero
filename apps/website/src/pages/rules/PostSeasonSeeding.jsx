import React, { useState, useEffect } from 'react';
import { loadContent } from '../../utils/contentLoader';
import MarkdownContent from './MarkdownContent';

export default function PostSeasonSeeding({ darkMode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadContent('rules/post-season-seeding.yaml').then(setData);
  }, []);

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
