import React, { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileAuthProps {
  onAuthenticated: (token: string) => void;
}

export default function TurnstileAuth({ onAuthenticated }: TurnstileAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSuccess = (token: string) => {
    console.log('Turnstile token:', token);
    setIsAuthenticated(true);
    onAuthenticated(token);
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-bold font-mono text-foreground">
            AUTHENTICATION REQUIRED
          </h2>
          <p className="text-sm text-muted-foreground">
            Please complete the verification to continue
          </p>
          <div className="flex justify-center">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={handleSuccess}
              options={{
                theme: 'auto',
                size: 'normal'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}