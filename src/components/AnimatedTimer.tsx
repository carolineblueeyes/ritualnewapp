import NumberFlow from '@number-flow/react';
import React from 'react';

interface AnimatedTimerProps {
  totalSeconds: number;
  className?: string;
  showHours?: boolean;
}

export default function AnimatedTimer({ totalSeconds, className, showHours }: AnimatedTimerProps) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const useHours = showHours || hrs > 0;

  return (
    <span className={className}>
      {useHours && (
        <>
          <NumberFlow value={hrs} format={{ minimumIntegerDigits: 1 }} />
          :
        </>
      )}
      <NumberFlow
        value={mins}
        format={{ minimumIntegerDigits: useHours ? 2 : 1 }}
      />
      :
      <NumberFlow
        value={secs}
        format={{ minimumIntegerDigits: 2 }}
      />
    </span>
  );
}
