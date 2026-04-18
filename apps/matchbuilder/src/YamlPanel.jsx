import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, ClipboardPaste } from "lucide-react";
import yaml from "js-yaml";

/**
 * YamlPanel — floating modal for inspecting/editing/applying YAML at any level.
 *
 * Props:
 *   title        {string}   — header label shown in the panel
 *   initialYaml  {string}   — YAML text to seed the editor with
 *   onApply      {function} — called with the current textarea text when Apply is clicked
 *   onClose      {function} — called when the panel is dismissed
 */
export function YamlPanel({ title, initialYaml, onApply, onClose }) {
  const [text, setText] = useState(initialYaml || "");
  const [parseError, setParseError] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef(null);
  const textareaRef = useRef(null);

  // Refresh text whenever initialYaml changes (e.g. panel re-opened)
  useEffect(() => {
    setText(initialYaml || "");
    setParseError("");
  }, [initialYaml]);

  // Focus textarea on open
  useEffect(() => {
    const t = setTimeout(() => {
      try { textareaRef.current?.focus(); } catch (_) {}
    }, 50);
    return () => clearTimeout(t);
  }, []);

  // Escape key closes panel
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // fallback
      try {
        const ta = textareaRef.current;
        if (ta) { ta.select(); document.execCommand("copy"); }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Copy failed", err);
      }
    }
  };

  const handleApply = () => {
    setParseError("");
    try {
      yaml.load(text); // validate
    } catch (e) {
      setParseError(`YAML parse error: ${e.message}`);
      return;
    }
    if (typeof onApply === "function") {
      onApply(text);
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`YAML editor: ${title}`}
        className="relative z-10 w-full max-w-2xl bg-slate-900 border-2 border-orange-400/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: "min(170vh, 95vh)", maxHeight: "95vh" }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={18} className="text-orange-400" />
            <span className="text-white font-bold text-sm uppercase tracking-wider">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold border border-slate-500 transition-all"
              title="Copy all text"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-500 transition-all"
              aria-label="Close YAML panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* textarea */}
        <div className="flex-1 overflow-hidden p-4 min-h-0 flex flex-col">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setParseError(""); }}
            className="flex-1 w-full bg-slate-950 text-green-300 font-mono text-xs p-3 rounded-lg border border-slate-700 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 resize-none overflow-y-auto"
            spellCheck={false}
          />
        </div>

        {/* error */}
        {parseError && (
          <div className="px-4 pb-2 text-red-400 text-xs font-semibold">
            ⚠ {parseError}
          </div>
        )}

        {/* footer */}
        <div className="flex justify-end gap-3 px-5 py-3 bg-slate-800 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold border border-slate-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-sm font-bold border border-orange-400 shadow transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
