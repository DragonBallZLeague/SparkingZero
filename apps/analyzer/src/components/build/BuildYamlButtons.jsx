import React from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { generateBuildYaml, useCopyFeedback } from './buildYaml.js';

/**
 * Reusable pair of Copy-YAML / Download-YAML buttons
 */
export function BuildYamlButtons({ characterName, capsules, aiStrategy, darkMode }) {
  const [copied, triggerCopied] = useCopyFeedback();

  const getYaml = () => generateBuildYaml(characterName, capsules, aiStrategy);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getYaml());
      triggerCopied();
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = getYaml();
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      triggerCopied();
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const yaml = getYaml();
    const filename = `${(characterName || 'build').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.yaml`;
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const btnBase = `flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border`;
  const copyBtn = copied
    ? darkMode
      ? `${btnBase} bg-green-900/40 border-green-600 text-green-300`
      : `${btnBase} bg-green-50 border-green-400 text-green-700`
    : darkMode
      ? `${btnBase} bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600`
      : `${btnBase} bg-white border-gray-300 text-gray-600 hover:bg-gray-50`;
  const dlBtn = darkMode
    ? `${btnBase} bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600`
    : `${btnBase} bg-white border-gray-300 text-gray-600 hover:bg-gray-50`;

  return (
    <div className="flex items-center gap-1.5 pt-1">
      <button onClick={handleCopy} className={copyBtn} title="Copy build as YAML">
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Copy YAML'}
      </button>
      <button onClick={handleDownload} className={dlBtn} title="Download build as .yaml file">
        <Download className="w-3 h-3" />
        Download
      </button>
    </div>
  );
}
