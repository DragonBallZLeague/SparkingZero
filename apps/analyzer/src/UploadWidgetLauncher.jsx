import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import UploadPanel from './UploadPanel';

export default function UploadWidgetLauncher({ darkMode=false }) {
  const [open, setOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    // Check for AI details modal and update button position
    const checkModal = () => {
      const modal = document.querySelector('[data-ai-details-modal="true"]');
      setIsAIModalOpen(!!modal);
    };

    // Initial check
    checkModal();

    // Watch for DOM changes
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const onClick = () => {
    console.log('[UploadWidget] Button clicked');
    setOpen(true);
    setShowBadge(true);
    setTimeout(() => setShowBadge(false), 1500);
  };

  const button = (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: isAIModalOpen ? '5vh' : 16,
        right: 16,
        zIndex: isAIModalOpen ? 9998 : 50000,
        padding: '10px 14px',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        border: darkMode ? '1px solid #4b5563' : '1px solid #d1d5db',
        background: darkMode ? '#1f2937' : '#ffffff',
        color: darkMode ? '#ffffff' : '#111827',
        pointerEvents: 'auto',
        transition: 'bottom 0.3s ease, z-index 0.3s ease'
      }}
      title="Submit Data to GitHub"
    >
      Submit Data
    </button>
  );

  const badge = showBadge
    ? (
        <div style={{position:'fixed',bottom:72,right:16,zIndex:50000,background:'#10b981',color:'#fff',padding:'6px 8px',borderRadius:6}}>Opening panel...</div>
      )
    : null;

  const panel = open ? (<UploadPanel open={open} onClose={() => setOpen(false)} />) : null;

  return (
    <>
      {createPortal(button, document.body)}
      {createPortal(badge, document.body)}
      {createPortal(panel, document.body)}
    </>
  );
}
