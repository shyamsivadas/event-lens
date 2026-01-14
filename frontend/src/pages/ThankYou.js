import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles } from 'lucide-react';

const ThankYou = () => {
  const { shareUrl } = useParams();
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1758186334264-d1ab8a079aa2)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative z-10 glass rounded-2xl p-12 max-w-md w-full mx-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/20 rounded-full">
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">Thank You!</h1>
        
        <p className="text-muted-foreground mb-8">
          Your photos have been captured successfully. The event host will receive all the amazing memories you've shared.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Sparkles className="w-4 h-4" />
          <span>Photos uploaded to event gallery</span>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;