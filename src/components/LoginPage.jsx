import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, signup } = useAuth();

  // Tab: 'user' or 'admin'
  const [selectedRole, setSelectedRole] = useState('user');
  // Mode: 'login' or 'signup' (only applicable to normal user)
  const [isSignUp, setIsSignUp] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (isSignUp && selectedRole === 'user') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        setErrorMsg('Please enter your phone number.');
        return;
      }
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp && selectedRole === 'user') {
        const res = await signup(name, email, password, 'user', phone);
        if (res.pendingApproval) {
          setSuccessMsg('🎉 Registration Request Sent! Your account has been forwarded to the Admin Portal for approval. Once an administrator approves your request, you will be able to sign in here.');
          setIsSignUp(false);
          setPassword('');
          setPhone('');
        } else {
          setSuccessMsg('Account created successfully! You can now log in.');
          setIsSignUp(false);
          setPhone('');
        }
      } else {
        await login(email, password, selectedRole);
        setSuccessMsg(`Welcome back! Logged in as ${selectedRole.toUpperCase()}.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card glass-panel">
        
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="brand-logo-icon">⚡</div>
          <h1 className="brand-title">QuizCraft</h1>
          <p className="brand-subtitle">Multiple Choice Questions & Assessment Platform</p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="role-switch-container">
          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'user' ? 'active user-tab' : ''}`}
            onClick={() => {
              setSelectedRole('user');
              setErrorMsg('');
            }}
          >
            <span className="role-icon">👤</span>
            <span>Normal User</span>
          </button>

          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'admin' ? 'active admin-tab' : ''}`}
            onClick={() => {
              setSelectedRole('admin');
              setIsSignUp(false);
              setErrorMsg('');
            }}
          >
            <span className="role-icon">🛡️</span>
            <span>Admin Login</span>
          </button>
        </div>

        {/* Mode & Title */}
        <div className="auth-action-header">
          <h2>
            {selectedRole === 'admin' ? 'Administrator Portal' : isSignUp ? 'Create New Account' : 'Student & Candidate Login'}
          </h2>
          <p className="auth-mode-desc">
            {selectedRole === 'admin'
              ? 'Sign in with your administrator credentials'
              : isSignUp
                ? 'Create a new student / candidate account'
                : 'Sign in to access your assessments & tests'}
          </p>
        </div>

        {/* Error and Success Alerts */}
        {errorMsg && (
          <div className="alert-box alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box alert-success">
            <span className="alert-icon">✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && selectedRole === 'user' && (
            <>
              <div className="input-field-group">
                <label htmlFor="auth-name">Full Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label htmlFor="auth-phone">Phone Number</label>
                <div className="input-wrapper">
                  <span className="input-icon">📱</span>
                  <input
                    id="auth-phone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-field-group">
            <label htmlFor="auth-email">
              {selectedRole === 'admin' ? 'Admin Email Address' : 'Email Address'}
            </label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                id="auth-email"
                type="email"
                placeholder={selectedRole === 'admin' ? 'admin@organization.com' : 'student@school.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="input-field-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-submit ${selectedRole === 'admin' ? 'admin-gradient' : 'user-gradient'}`}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-text">Authenticating...</span>
            ) : isSignUp && selectedRole === 'user' ? (
              'Create User Account'
            ) : (
              selectedRole === 'admin' ? 'Sign In as Admin' : 'Sign In as User'
            )}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up - Only for Normal User */}
        {selectedRole === 'user' && (
          <div className="auth-toggle-footer">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMsg('');
                  }}
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMsg('');
                  }}
                >
                  Register as User
                </button>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
