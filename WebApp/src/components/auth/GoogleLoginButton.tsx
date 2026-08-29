import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  disabled
}) => {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '324729375491-nl1j4657c42169gptkb1tm8ttoqkce8q.apps.googleusercontent.com';

  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      if (onError) onError('No credential received from Google.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithGoogle(response.credential);
      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        if (onError) onError(result.message || 'Google Sign-In failed');
      }
    } catch (err: any) {
      if (onError) onError(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let timer: any;

    const setupGoogleButton = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleBtnRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: '320',
            logo_alignment: 'left',
          });
          setIsRendered(true);
        } catch (e) {
          console.error('Google button rendering error:', e);
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      setupGoogleButton();
    } else {
      timer = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(timer);
          setupGoogleButton();
        }
      }, 250);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [clientId]);

  const handleFallbackClick = () => {
    if (disabled || isLoading) return;
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
        (window as any).google.accounts.id.prompt();
      } catch (err: any) {
        console.error('Google prompt trigger error:', err);
      }
    } else {
      if (onError) onError('Connecting to Google services. Please try in a moment...');
    }
  };

  return (
    <div className="auth-google-btn-container">
      {isLoading ? (
        <button type="button" className="auth-social-btn is-loading" disabled>
          <Loader2 size={18} className="spin-animation" />
          <span>Connecting to Google...</span>
        </button>
      ) : (
        <>
          <div 
            ref={googleBtnRef} 
            className={`auth-google-native-host ${isRendered ? 'visible' : 'hidden'}`}
          />
          {!isRendered && (
            <button
              type="button"
              className="auth-social-btn"
              onClick={handleFallbackClick}
              disabled={disabled}
            >
              <svg className="social-svg-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
