import React, { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

export default function PdfViewerModal({ url, filename, onClose, onDownload }) {
  const [zoom, setZoom] = useState(100);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isPdf = filename?.toLowerCase().endsWith('.pdf') ||
                url?.includes('application/pdf') ||
                url?.startsWith('blob:') ||
                (!filename?.match(/\.(png|jpg|jpeg|gif|webp)$/i));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
          {filename}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isPdf && (
            <>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.max(50, z - 25))} title="Zoom out">
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'center' }}>{zoom}%</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.min(200, z + 25))} title="Zoom in">
                <ZoomIn size={15} />
              </button>
            </>
          )}
          {onDownload && (
            <button className="btn btn-secondary btn-sm" onClick={onDownload}>
              <Download size={14} /> Download
            </button>
          )}
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 16 }}>
        {isPdf ? (
          <iframe
            src={`${url}#zoom=${zoom}`}
            style={{
              width: `${zoom}%`,
              minWidth: 320,
              maxWidth: '100%',
              height: '100%',
              minHeight: 500,
              border: 'none',
              borderRadius: 6,
              background: '#fff',
            }}
            title={filename}
          />
        ) : (
          <img
            src={url}
            alt={filename}
            style={{
              maxWidth: `${zoom}%`,
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 6,
            }}
          />
        )}
      </div>
    </div>
  );
}