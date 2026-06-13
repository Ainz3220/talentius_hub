import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { documents as docsApi } from '../../api/index.js';

const DOC_TYPES = ['Work Permit', 'Passport Copy', 'Medical Certificate', 'Insurance Policy', 'FOMEMA Certificate', 'Business Registration', 'Service Agreement', 'Contract', 'Other'];

export default function DocumentUploadDialog({ entityType, entityId, onClose }) {
  const [form, setForm] = useState({ documentType: '', expiryDate: '', file: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.file || !form.documentType) { setError('File and document type are required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('entityType', entityType);
      fd.append('entityId', entityId);
      fd.append('documentType', form.documentType);
      if (form.expiryDate) fd.append('expiryDate', form.expiryDate);
      await docsApi.upload(fd);
      qc.invalidateQueries({ queryKey: ['documents', entityType, entityId] });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Upload Document</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ padding: '8px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>{error}</div>}
            <div>
              <label className="form-label">Document Type <span style={{ color: 'var(--accent2)' }}>*</span></label>
              <select className="form-input" value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}>
                <option value="">Select type…</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">File <span style={{ color: 'var(--accent2)' }}>*</span></label>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 16px', border: '2px dashed var(--border)', borderRadius: 'var(--r-sm)',
                cursor: 'pointer', background: form.file ? 'var(--accent-light)' : 'var(--surface2)',
                transition: 'all 0.15s',
              }}>
                <Upload size={20} style={{ color: form.file ? 'var(--accent)' : 'var(--text3)' }} />
                <span style={{ fontSize: 13, color: form.file ? 'var(--accent)' : 'var(--text3)' }}>
                  {form.file ? form.file.name : 'Click to select file (PDF, JPG, PNG)'}
                </span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                  onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))} />
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Uploading…' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
