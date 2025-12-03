import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import UploadPanel from './UploadPanel';

export default function UploadWidgetLauncher({ darkMode=false }) {
  const [open, setOpen] = useState(false);
  const button = (
    <button
      onClick={() => setOpen(true)}
      style={{
        position: 'fixed', bottom: 16, right: 16,
        zIndex: 50000,
        padding: '10px 14px', borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        border: darkMode ? '1px solid #4b5563' : '1px solid #d1d5db',
        background: darkMode ? '#1f2937' : '#ffffff',
        color: darkMode ? '#ffffff' : '#111827',
        pointerEvents: 'auto'
      }}
      title="Submit Data to GitHub"
    >
      Submit Data
    </button>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(button, document.body) : button}
      {open && typeof document !== 'undefined' ? createPortal(<UploadPanel onClose={() => setOpen(false)} />, document.body) : (open && <UploadPanel onClose={() => setOpen(false)} />)}
    </>
  );
}
