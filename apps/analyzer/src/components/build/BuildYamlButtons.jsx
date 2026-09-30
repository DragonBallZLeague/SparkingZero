import React from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { generateBuildYaml, useCopyFeedback } from './buildYaml.js';

const BTN = 'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-solid bg-transparent px-2.5 text-[12px] font-medium cursor-pointer';

/**
 * Copy YAML / Download: a build in the Match Builder's format (buildYaml.js),
 * to paste or load there. The shell's outline buttons; Copy turns green for a
 * moment once copied. `capsules` are names or { name }.
 */
export function BuildYamlButtons({ characterName, capsules, aiStrategy, className = '' }) {
  const [copied, triggerCopied] = useCopyFeedback();
  const getYaml = () => generateBuildYaml(characterName, capsules, aiStrategy);

  const handleCopy = async e => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getYaml());
    } catch {
      // An older browser, or no clipboard permission: the textarea route.
      const ta = document.createElement('textarea');
      ta.value = getYaml();
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    triggerCopied();
  };

  const handleDownload = e => {
    e.stopPropagation();
    const filename = `${(characterName || 'build').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.yaml`;
    const url = URL.createObjectURL(new Blob([getYaml()], { type: 'text/yaml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button type="button" onClick={handleCopy} title="Copy the build as Match Builder YAML"
        className={`${BTN} ${copied ? 'border-rank-good/50 text-rank-good' : 'border-gray-700 text-slate-200 hover:border-slate-400/[.35]'}`}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy YAML'}
      </button>
      <button type="button" onClick={handleDownload} title="Download the build as a .yaml file"
        className={`${BTN} border-gray-700 text-slate-200 hover:border-slate-400/[.35]`}>
        <Download className="h-3.5 w-3.5" />
        Download
      </button>
    </div>
  );
}
