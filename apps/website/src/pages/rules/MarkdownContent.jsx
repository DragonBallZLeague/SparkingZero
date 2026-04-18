import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownContent({ content, darkMode }) {
  const heading1 = `text-2xl font-bold mt-8 mb-4 first:mt-0 ${darkMode ? 'text-white' : 'text-stone-900'}`;
  const heading2 = `text-xl font-semibold mt-6 mb-3 pb-2 border-b ${darkMode ? 'text-white border-gray-800' : 'text-stone-900 border-stone-200'}`;
  const heading3 = `text-lg font-semibold mt-5 mb-2 ${darkMode ? 'text-gray-100' : 'text-stone-800'}`;
  const body = `leading-relaxed ${darkMode ? 'text-gray-300' : 'text-stone-600'}`;
  const strong = `font-semibold ${darkMode ? 'text-white' : 'text-stone-900'}`;
  const blockquote = `border-l-4 pl-4 py-2 pr-4 my-4 rounded-r-lg italic ${
    darkMode ? 'border-orange-500 bg-orange-500/5 text-gray-400' : 'border-blue-400 bg-blue-50 text-stone-500'
  }`;
  const inlineCode = `px-1.5 py-0.5 rounded text-xs font-mono ${
    darkMode ? 'bg-gray-800 text-orange-300' : 'bg-stone-200 text-stone-800'
  }`;
  const preBlock = `p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono ${
    darkMode ? 'bg-gray-950 text-gray-300' : 'bg-stone-100 text-stone-700'
  }`;
  const link = `underline underline-offset-2 transition-colors ${
    darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-blue-600 hover:text-blue-700'
  }`;
  const hr = `my-6 ${darkMode ? 'border-gray-700' : 'border-stone-200'}`;

  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className={heading1}>{children}</h1>,
        h2: ({ children }) => <h2 className={heading2}>{children}</h2>,
        h3: ({ children }) => <h3 className={heading3}>{children}</h3>,
        p: ({ children }) => <p className={`mb-4 ${body}`}>{children}</p>,
        ul: ({ children }) => <ul className={`mb-4 pl-5 space-y-1.5 list-disc ${body}`}>{children}</ul>,
        ol: ({ children }) => <ol className={`mb-4 pl-5 space-y-1.5 list-decimal ${body}`}>{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className={strong}>{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => <blockquote className={blockquote}>{children}</blockquote>,
        hr: () => <hr className={hr} />,
        pre: ({ children }) => <pre className={preBlock}>{children}</pre>,
        code: ({ className, children }) =>
          className ? (
            <code className={`font-mono text-sm ${className}`}>{children}</code>
          ) : (
            <code className={inlineCode}>{children}</code>
          ),
        a: ({ href, children }) => (
          <a href={href} className={link} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content || ''}
    </ReactMarkdown>
  );
}
