import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { auth } from '../../../api/index.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage('No verification token provided.');
      return;
    }
    auth.verifyEmail(token)
      .then(() => {
        setState('success');
      })
      .catch(err => {
        setState('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {state === 'loading' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, marginBottom: 8 }}>Verifying your email</div>
            <div style={{ fontSize: 14, color: 'var(--text3)' }}>Please wait…</div>
          </>
        )}
        {state === 'success' && (
          <>
            <div style={{ width: 56, height: 56, background: 'rgba(0,160,90,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px' }}>✓</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, marginBottom: 8, color: 'var(--accent)' }}>Email Verified!</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 28 }}>Your email address has been successfully verified. You can now log in.</div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Continue to Login
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <div style={{ width: 56, height: 56, background: 'rgba(196,82,26,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px' }}>✕</div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, marginBottom: 8, color: 'var(--accent2)' }}>Verification Failed</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 28 }}>{message}</div>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
