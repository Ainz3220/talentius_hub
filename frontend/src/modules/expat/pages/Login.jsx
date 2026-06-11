import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore.js';
import { authApi } from '../../../api/index.js';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card.jsx';

export default function LoginPage() {
  const [step, setStep] = useState('credentials');
  const [userId, setUserId] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authApi.login({ email: form.email, password: form.password });
      if (result.otpRequired) {
        setUserId(result.userId);
        // Auto-fill OTP in development when backend returns it
        if (result.devOtp) { setDevOtp(result.devOtp); setForm(p => ({ ...p, otp: result.devOtp })); }
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
      const result = await authApi.verifyOtp({ userId, otp: form.otp });
      login(result.accessToken, result.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              EF
            </div>
            <span className="font-semibold text-lg">ExpatFlow</span>
          </div>
          <CardTitle>
            {step === 'credentials' ? 'Sign in to your account' : 'Enter verification code'}
          </CardTitle>
          <CardDescription>
            {step === 'otp'
              ? `We sent a 6-digit code to ${form.email}`
              : 'Enter your credentials to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {devOtp && step === 'otp' && (
            <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <strong>Dev mode:</strong> OTP auto-filled — <code className="font-mono font-bold">{devOtp}</code>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label>Email address</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="space-y-1">
                <Label>6-digit code</Label>
                <Input
                  value={form.otp}
                  onChange={e => setForm(p => ({ ...p, otp: e.target.value }))}
                  placeholder="000000"
                  maxLength={6}
                  className="tracking-widest text-center text-lg"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Back
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
