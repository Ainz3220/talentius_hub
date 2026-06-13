import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, Plus } from 'lucide-react';
import { settings as settingsApi, users as usersApi } from '../../../api/index.js';
import { useAuthStore } from '../../../store/authStore.js';
import StatusBadge from '../../../components/shared/StatusBadge.jsx';

const TABS = ['General', 'Files', 'Security', 'Users'];

function Toggle({ checked, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

function Field({ label, description, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ minWidth: 220 }}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { hasRole } = useAuthStore();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const qc = useQueryClient();
  const [tab, setTab] = useState('General');
  const [local, setLocal] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'STAFF' });
  const [inviting, setInviting] = useState(false);

  const { data: cfg } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
    enabled: tab === 'Users',
  });

  useEffect(() => {
    if (cfg) setLocal(cfg);
  }, [cfg]);

  function set(key, val) {
    setLocal(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsApi.update(local);
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await usersApi.create({ ...inviteForm, emailVerified: true, isActive: true });
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowInvite(false);
      setInviteForm({ name: '', email: '', role: 'STAFF' });
    } finally {
      setInviting(false);
    }
  }

  const inp = (key, type = 'text') => (
    <input
      type={type}
      className="form-input"
      style={{ fontSize: 13 }}
      value={local[key] ?? ''}
      disabled={!isSuperAdmin}
      onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="tab-group">
          {TABS.map(t => <button key={t} className={`tab-item${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        {tab !== 'Users' && isSuperAdmin && (
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                : saved ? '✓ Saved'
                : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        )}
      </div>

      {!isSuperAdmin && tab !== 'Users' && (
        <div style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Settings are read-only for your role.
        </div>
      )}

      {tab === 'General' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '0 24px' }}>
          <Field label="Company Name" description="Displayed in emails and the app header">{inp('appName')}</Field>
          <Field label="Accent Color" description="Primary brand color (hex)">{inp('accentColor')}</Field>
          <Field label="Timezone">{inp('timezone')}</Field>
          <Field label="Date Format">{inp('dateFormat')}</Field>
          <Field label="Page Size" description="Default rows per page in tables">{inp('pageSize', 'number')}</Field>
        </div>
      )}

      {tab === 'Files' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '0 24px' }}>
          <Field label="Max File Size (bytes)" description="Maximum upload size per file">{inp('maxFileSize', 'number')}</Field>
          <Field label="Document Alert (days)" description="First alert threshold before expiry">{inp('docAlertDays1', 'number')}</Field>
          <Field label="Urgent Alert (days)" description="Second urgent alert threshold">{inp('docAlertDays2', 'number')}</Field>
          <Field label="Overdue Checklist (days)" description="Days before checklist flagged overdue">{inp('checklistOverdueDays', 'number')}</Field>
        </div>
      )}

      {tab === 'Security' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '0 24px' }}>
          <Field label="Transfer Requires Approval" description="All transfer requests need manager approval">
            <Toggle checked={!!local.transferRequiresApproval} onChange={v => set('transferRequiresApproval', v)} disabled={!isSuperAdmin} />
          </Field>
          <Field label="OTP Expiry (minutes)">{inp('otpTtlMinutes', 'number')}</Field>
          <Field label="Max Login Attempts" description="Before account lockout">{inp('loginMaxAttempts', 'number')}</Field>
          <Field label="Lockout Duration (minutes)">{inp('loginLockoutMinutes', 'number')}</Field>
        </div>
      )}

      {tab === 'Users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            {isSuperAdmin && (
              <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Plus size={14} /> Invite User</button>
            )}
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {!users?.length && (
                  <tr><td colSpan={4}><div className="empty-state" style={{ padding: 32 }}>No users found.</div></td></tr>
                )}
                {users?.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{u.name || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{u.email}</td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                        background: u.role === 'SUPER_ADMIN' ? 'rgba(31,78,61,0.12)' : u.role === 'MANAGER' ? 'rgba(196,82,26,0.08)' : 'var(--surface2)',
                        color: u.role === 'SUPER_ADMIN' ? 'var(--accent)' : u.role === 'MANAGER' ? 'var(--accent2)' : 'var(--text2)',
                      }}>{u.role}</span>
                    </td>
                    <td><StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showInvite && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
              <div className="modal">
                <div className="modal-header">
                  <h3 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 18 }}>Invite Team Member</h3>
                  <button onClick={() => setShowInvite(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
                </div>
                <form onSubmit={handleInvite}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label className="form-label">Full Name <span style={{ color: 'var(--accent2)' }}>*</span></label>
                      <input type="text" className="form-input" required value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ahmad Karim" />
                    </div>
                    <div>
                      <label className="form-label">Email <span style={{ color: 'var(--accent2)' }}>*</span></label>
                      <input type="email" className="form-input" required value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" />
                    </div>
                    <div>
                      <label className="form-label">Role</label>
                      <select className="form-input" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="STAFF">Staff</option>
                        <option value="MANAGER">Manager</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={() => setShowInvite(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={inviting}>{inviting ? 'Creating…' : 'Create User'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
