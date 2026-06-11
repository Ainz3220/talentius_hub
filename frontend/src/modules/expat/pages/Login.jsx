import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore.js';
import { authApi } from '../../../api/index.js';

export default function LoginPage() {
  const [step, setStep] = useState('credentials');
  const [userId, setUserId] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const otpRefs = useRef([]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authApi.login({ email: form.email, password: form.password });
      if (result.otpRequired) {
        setUserId(result.userId);
        if (result.devOtp) {
          setDevOtp(result.devOtp);
          const digits = result.devOtp.split('').slice(0, 6);
          setOtp(digits.concat(Array(6 - digits.length).fill('')));
        }
        setStep('otp');
      } else if (result.accessToken) {
        login(result.accessToken, result.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authApi.verifyOtp({ userId, otp: otp.join('') });
      login(result.accessToken, result.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(i, val) {
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '36px 40px', width: 380,
        boxShadow: '0 4px 40px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--accent)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, stroke: '#fff', strokeWidth: 2, fill: 'none' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text)' }}>Talentius Hub</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Expat Management System</div>
        </div>

        {error && (
          <div style={{ background: 'var(--red-light)', border: '1px solid rgba(139,26,26,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {devOtp && step === 'otp' && (
          <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(138,98,0,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--amber)', marginBottom: 16 }}>
            Dev mode: OTP auto-filled — <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{devOtp}</code>
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleLogin}>
            <FormGroup label="Email address">
              <FormInput type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required />
            </FormGroup>
            <FormGroup label="Password">
              <FormInput type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required />
            </FormGroup>
            <LoginBtn disabled={loading}>{loading ? 'Signing in…' : 'Continue'}</LoginBtn>
          </form>
        ) : (
          <form onSubmit={handleOtp}>
            <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 13, color: 'var(--text2)' }}>
              Enter the 6-digit OTP sent to your email
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  value={d}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  maxLength={1}
                  style={{
                    width: 44, height: 52, border: '1.5px solid var(--border)', borderRadius: 6,
                    textAlign: 'center', fontSize: 22, fontWeight: 600, fontFamily: 'inherit',
                    outline: 'none', color: 'var(--text)', background: 'var(--surface)',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              ))}
            </div>
            <LoginBtn disabled={loading || otp.join('').length < 6}>{loading ? 'Verifying…' : 'Verify & Sign In'}</LoginBtn>
            <button
              type="button"
              onClick={() => setStep('credentials')}
              style={{ width: '100%', marginTop: 12, fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}

function FormInput(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
        borderRadius: 6, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)',
        background: 'var(--surface)', outline: 'none', transition: 'border-color 0.15s',
        boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  );
}

function LoginBtn({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: '100%', padding: 10, background: disabled ? 'var(--text3)' : 'var(--accent)',
        color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 6,
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  );
}
