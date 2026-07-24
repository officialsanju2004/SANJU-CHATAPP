import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../api/axios.js';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ForgotPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword(email.trim());
      setInfo(data.message || 'If an account exists for that email, a reset code has been sent.');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), otp.trim(), newPassword);
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 animate-floatIn">
          <div className="w-16 h-16 rounded-2xl border-2 border-ember-500 shadow-neon flex items-center justify-center mb-4 bg-void">
            <span className="font-display font-bold text-ember-500 text-xl">SC</span>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-ember-50">
            Reset your password
          </h1>
          <p className="text-sm text-ember-50/50 mt-1 text-center">
            {step === 'email'
              ? "We'll email a one-time code to your recovery email"
              : `Enter the code sent to ${email.trim()}`}
          </p>
        </div>

        <div className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-7 shadow-neon-inset">
          {error && (
            <div className="mb-4 text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="mb-4 text-sm text-ember-200 bg-ember-900/20 border border-ember-700/30 rounded-lg px-3 py-2">
              {info}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
                Recovery email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full mb-6 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-60 disabled:cursor-not-allowed text-void-950 font-display font-semibold text-base sm:text-sm py-3 sm:py-2.5 rounded-lg shadow-neon transition-colors"
              >
                {loading ? 'Sending code…' : 'Send reset code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
                6-digit code
              </label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full mb-4 tracking-[0.3em] text-center bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
              />

              <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
                New password
              </label>
              <PasswordInput
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full mb-4 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
              />

              <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
                Confirm new password
              </label>
              <PasswordInput
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full mb-6 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-60 disabled:cursor-not-allowed text-void-950 font-display font-semibold text-base sm:text-sm py-3 sm:py-2.5 rounded-lg shadow-neon transition-colors"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-sm text-ember-50/40 hover:text-ember-300 mt-4"
              >
                Use a different email
              </button>
            </form>
          )}

          <p className="text-center text-sm text-ember-50/40 mt-5">
            Remembered it?{' '}
            <Link to="/login" className="text-ember-400 hover:text-ember-300 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
