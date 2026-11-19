import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

export interface AnimatedCounterProps {
  value: string | number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1.6,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [displayValue, setDisplayValue] = useState<string>('0');

  useEffect(() => {
    const rawStr = String(value).trim();
    // Match numeric portion (int or float) and prefix/suffix
    const match = rawStr.match(/^([^0-9.]*)([0-9.]+)(.*)$/);

    if (!match) {
      setDisplayValue(rawStr);
      return;
    }

    const prefix = match[1] || '';
    const targetNum = parseFloat(match[2]);
    const suffix = match[3] || '';
    const hasDecimal = match[2].includes('.');
    const decimalPlaces = hasDecimal ? match[2].split('.')[1].length : 0;

    if (!isInView || isNaN(targetNum)) {
      setDisplayValue(`${prefix}0${hasDecimal ? '.0' : ''}${suffix}`);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // easeOutExpo easing function
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentNum = targetNum * easeProgress;

      setDisplayValue(
        `${prefix}${currentNum.toFixed(decimalPlaces)}${suffix}`
      );

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(rawStr);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {displayValue}
    </span>
  );
};

export default AnimatedCounter;
