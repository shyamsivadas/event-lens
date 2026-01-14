import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error('Invalid session');
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/session?session_id=${sessionId}`,
          {},
          { withCredentials: true }
        );

        const user = response.data;
        navigate('/dashboard', { state: { user }, replace: true });
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        navigate('/login');
      }
    };

    processSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;