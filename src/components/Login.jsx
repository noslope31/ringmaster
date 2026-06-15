import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Gem, LogIn, Eye, EyeOff } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // App.jsx listens to onAuthStateChange and will automatically update when login succeeds
    } catch (err) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.05), transparent 40%), radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.03), transparent 40%)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="animate-fade-in">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: 'rgba(212, 175, 55, 0.1)',
            borderRadius: '50%',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)',
            marginBottom: '1rem',
          }}>
            <Gem size={32} color="var(--accent-gold)" />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            backgroundImage: 'linear-gradient(to right, var(--accent-gold), #fff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.25rem',
          }}>
            RingMaster
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Sign in to access your inventory
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="login-email" style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="input-field"
                style={{ width: '100%' }}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="login-password" style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="input-field"
                  style={{ width: '100%', paddingRight: '2.75rem' }}
                  disabled={loading}
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background: 'var(--accent-danger-light)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--border-radius-md)',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: '#fca5a5',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="sign-in-button"
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'var(--accent-gold)',
                color: '#0a0a0c',
                fontWeight: '600',
                padding: '0.75rem',
                fontSize: '0.9375rem',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <LogIn size={17} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Private access only. Contact the administrator to request access.
        </p>
      </div>
    </div>
  );
}

export default Login;
