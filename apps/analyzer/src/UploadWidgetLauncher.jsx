import React, { useState } from 'react';
import UploadPanel from './UploadPanel';

export default function UploadWidgetLauncher({ darkMode=false }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          `fixed bottom-4 right-4 z-40 px-3 py-2 rounded shadow-lg border ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`
        }
        title="Submit Data to GitHub"
      >
        Submit Data
      </button>
      {open && <UploadPanel onClose={() => setOpen(false)} />}
    </>
  );
}
