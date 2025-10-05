import React, { useState } from 'react';
import AuthService from '../../services/AuthService';
import './AuthenticationView.css';

const AuthenticationView: React.FC = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Check if we're in a native environment
  const isNativeApp = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    
    try {
      await AuthService.signInWithGoogle();
    } catch (error: any) {
      let errorMsg = 'Failed to sign in with Google. Please try again.';
      if (error.message && error.message.includes('not supported in native apps')) {
        errorMsg = 'Google Sign-In is not available in the app. Please use email/password authentication.';
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setErrorMessage(null);
    
    try {
      await AuthService.signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      let errorMsg = 'Failed to sign in. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMsg = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed attempts. Please try again later.';
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailPasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    setErrorMessage(null);
    
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      setIsSigningUp(false);
      return;
    }
    
    try {
      await AuthService.signUpWithEmailAndPassword(email, password, fullName);
    } catch (error: any) {
      let errorMsg = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters.';
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="authentication-view">
      <div className="auth-container">
        <div className="auth-header">
          <div className="paw-icon">🐾</div>
          <h1 className="auth-title">Fetchr</h1>
          <p className="auth-subtitle">Real-time safety for your best friend.</p>
        </div>
        
        <div className="auth-form-container">
          <form 
            onSubmit={isSignUpMode ? handleEmailPasswordSignUp : handleEmailPasswordSignIn}
            className="auth-form"
          >
            {isSignUpMode && (
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
            )}
            
            <div className="form-group">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>
            
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
                minLength={6}
              />
            </div>
            
            <button 
              type="submit"
              className={`auth-submit-button ${(isSigningIn || isSigningUp) ? 'signing-in' : ''}`}
              disabled={isSigningIn || isSigningUp}
            >
              {(isSigningIn || isSigningUp) ? (
                <>
                  <div className="spinner"></div>
                  <span>{isSignUpMode ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{isSignUpMode ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>
          
          {!isNativeApp && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <button 
                className={`google-sign-in-button ${isSigningIn ? 'signing-in' : ''}`}
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <div className="spinner"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </>
          )}
          
          <div className="auth-mode-toggle">
            <p>
              {isSignUpMode ? 'Already have an account?' : "Don't have an account?"}
              <button 
                type="button"
                className="toggle-button"
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setErrorMessage(null);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
              >
                {isSignUpMode ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
        
        {errorMessage && (
          <p className="error-message">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default AuthenticationView;
