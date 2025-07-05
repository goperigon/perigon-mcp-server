import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileOverlayProps {
  isVisible: boolean;
  onSuccess: (token: string) => void;
  onError?: (error: any) => void;
  isLoading?: boolean;
}

export function TurnstileOverlay({ 
  isVisible, 
  onSuccess, 
  onError, 
  isLoading = false 
}: TurnstileOverlayProps) {
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isVisible) return null;

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileError(null);
    onSuccess(token);
  };

  const handleTurnstileError = (error: any) => {
    console.error('Turnstile error:', error);
    setTurnstileError('Verification failed. Please try again.');
    onError?.(error);
  };

  const handleTurnstileExpired = () => {
    setTurnstileError('Verification expired. Please try again.');
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setTurnstileError(null);
    // Force re-render of Turnstile component
    setTimeout(() => setIsRetrying(false), 100);
  };

  // Get Turnstile site key from environment or use the existing one
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAABihR9-NN72ssFjf';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6 font-mono">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-accent rounded-full">
            <svg 
              className="w-6 h-6 text-accent-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            VERIFICATION REQUIRED
          </h3>
          <p className="text-sm text-muted-foreground">
            Please complete the security check to continue using the playground
          </p>
        </div>

        {/* Turnstile Widget */}
        <div className="flex justify-center mb-6">
          {!isRetrying ? (
            <Turnstile
              siteKey={siteKey}
              onSuccess={handleTurnstileSuccess}
              onError={handleTurnstileError}
              onExpired={handleTurnstileExpired}
              options={{
                theme: 'auto',
                size: 'normal'
              }}
            />
          ) : (
            <div className="w-[300px] h-[65px] flex items-center justify-center border border-border rounded bg-muted">
              <div className="text-xs text-muted-foreground">Loading verification...</div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {turnstileError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-center">
            <p className="text-sm text-destructive font-medium">{turnstileError}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying...</span>
            </div>
          </div>
        )}

        {/* Retry Button */}
        {turnstileError && !isLoading && (
          <div className="text-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded hover:bg-accent/80 transition-colors"
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Your work is preserved and will continue after verification
          </p>
        </div>
      </div>
    </div>
  );
}