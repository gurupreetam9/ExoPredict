"use client";

import React, { useState, useEffect } from "react";

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 180,
  strokeWidth = 14,
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    setAnimatedProgress(0);
    if (progress > 0) {
      // Using a timeout for a simple animation effect on load
      const timer = setTimeout(() => setAnimatedProgress(progress), 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center p-8" style={{ width: size + 60, height: size + 60 }}>
      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible" width={size} height={size}>
        <defs>
          <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#4facfe" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle
          stroke="rgba(255,255,255,0.05)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          className="transition-all duration-1000 ease-out"
          stroke="url(#cyanGlow)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#glow)"
          r={radius}
          cx={center}
          cy={center}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-extrabold text-white font-headline text-glow tracking-tighter" style={{ textShadow: "0 0 30px rgba(0,242,254,0.6)" }}>
          {Math.round(progress)}
          <span className="text-3xl text-white/70">%</span>
        </span>
      </div>
    </div>
  );
};

export default CircularProgress;
