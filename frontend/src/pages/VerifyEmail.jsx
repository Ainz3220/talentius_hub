import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/index.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [resendEmail, setResendEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi.verifyEmail(token)
      .then(r => setState(r.alreadyVerified ? 'already' : 'success'))
      .catch(err => {
        const msg = err.response?.data?.error || '';
        setState(msg.includes('expired') ? 'expired' : 'error');
      });
  }, [token]);

  async function handleResend(e) {
    e.preventDefault();
    await authApi.resendVerification(resendEmail).catch(() => {});
    setResent(true);
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
          <CardTitle>Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {state === 'loading' && <p className="text-slate-500">Verifying your email...</p>}

          {state === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto text-green-500" size={40} />
              <p className="font-medium text-green-700">Email verified! Your account is active.</p>
              <Link to="/login">
                <Button className="w-full">Sign In</Button>
              </Link>
            </div>
          )}

          {state === 'already' && (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto text-slate-400" size={40} />
              <p className="font-medium">Already verified.</p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
            </div>
          )}

          {state === 'expired' && (
            <div className="space-y-4">
              <div className="flex gap-2 text-amber-700 bg-amber-50 rounded-md p-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm">This link has expired. Request a new one.</p>
              </div>
              {!resent ? (
                <form onSubmit={handleResend} className="space-y-2">
                  <Input
                    type="email"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                  <Button type="submit" className="w-full">Resend verification link</Button>
                </form>
              ) : (
                <p className="text-sm text-green-700 text-center">New link sent! Check your inbox.</p>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="mx-auto text-red-500" size={40} />
              <p className="text-red-700 font-medium">Invalid verification link.</p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
