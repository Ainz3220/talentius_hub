import { useState, useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { documents as docsApi } from '../../api/index.js';
import { formatFileSize } from '../../lib/utils.js';

export default function DocumentPreviewModal({ doc, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPdf = doc.mimeType?.includes('pdf');
  const isImage = doc.mimeType?.startsWith('image/');
  const canPreview = isPdf || isImage;

  useEffect(() => {
    let url;
    docsApi.download(doc.id)
      .then(({ data }) => {
        url = URL.createObjectURL(new Blob([data], { type: doc.mimeType }));
        setObjectUrl(url);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => { if (url) URL.revokeObjectURL(url); };
  }, [doc.id]);

  function handleDownload() {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl; a.download = doc.originalName; a.click();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-lg)',
        width: '90vw', maxWidth: 960, height: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.originalName}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {doc.documentType} · {formatFileSize(doc.fileSizeBytes)}
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleDownload} disabled={!objectUrl} style={{ flexShrink: 0 }}>
            <Download size={13} /> Download
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
          {loading && (
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
          )}
          {!loading && error && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
              Failed to load document.
            </div>
          )}
          {!loading && !error && !canPreview && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📎</div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>Preview not available</div>
              <div style={{ marginBottom: 16 }}>This file type cannot be previewed in the browser.</div>
              <button className="btn btn-primary" onClick={handleDownload}><Download size={14} /> Download to view</button>
            </div>
          )}
          {!loading && !error && objectUrl && isPdf && (
            <iframe
              src={objectUrl}
              title={doc.originalName}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
          {!loading && !error && objectUrl && isImage && (
            <img
              src={objectUrl}
              alt={doc.originalName}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 16 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
