import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../../store/authStore.js';
import { auth as authApi } from '../../../api/index.js';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);

  async function handleCredentials(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      if (data.otpRequired) {
        setUserId(data.userId);
        setStep('otp');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e) {
    e.preventDefault();
    setError('');
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp({ userId, otp: otpStr });
      login(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpDigit(index, val) {
    if (val.length > 1) val = val.slice(-1);
    const next = [...otp];
    next[index] = val.replace(/\D/, '');
    setOtp(next);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '36px 40px',
        width: 380,
        boxShadow: '0 4px 40px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--accent)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: 'var(--text)' }}>Talentius Hub</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Expat Management System</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 12px', background: 'var(--red-light)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Credentials step */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 10, background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 6,
              transition: 'background 0.15s', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </form>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <form onSubmit={handleOtp}>
            <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 13, color: 'var(--text2)' }}>
              Enter the 6-digit OTP sent to your email
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  value={digit}
                  onChange={e => handleOtpDigit(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  maxLength={1}
                  style={{
                    width: 44, height: 52,
                    border: `1.5px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-sm)',
                    textAlign: 'center',
                    fontSize: 22, fontWeight: 600, fontFamily: 'inherit',
                    outline: 'none',
                    color: 'var(--text)',
                    background: 'var(--surface)',
                    transition: 'border-color 0.15s',
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep('credentials')}
              style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}
            >
              ← Back to login
            </button>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 10, background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
