import React from 'react';
import { Camera, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1699616038948-a82d0babcfe7)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      
      <div className="relative z-10 glass rounded-2xl p-12 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/20 rounded-full">
              <Camera className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <div>
            <h1 className="text-4xl font-bold mb-2">Event Lens</h1>
            <p className="text-muted-foreground">Capture memories, together</p>
          </div>
          
          <div className="space-y-4 pt-4">
            <button
              onClick={handleGoogleLogin}
              className="btn-primary w-full flex items-center justify-center gap-3"
              data-testid="google-login-btn"
            >
              <Sparkles className="w-5 h-5" />
              Continue with Google
            </button>
            
            <p className="text-xs text-muted-foreground">
              Sign in to create events and collect photos from your guests
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;