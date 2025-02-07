
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RateLimitCountdownProps {
  durationInSeconds: number;
  onComplete: () => void;
}

export const RateLimitCountdown = ({ durationInSeconds, onComplete }: RateLimitCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState(durationInSeconds);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((durationInSeconds - timeLeft) / durationInSeconds) * 100;
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-2">Rate Limit Cooldown</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please wait {minutes}:{seconds.toString().padStart(2, '0')} before trying again
          </p>
        </div>
        <Progress value={progress} className="w-full" />
      </CardContent>
    </Card>
  );
};
