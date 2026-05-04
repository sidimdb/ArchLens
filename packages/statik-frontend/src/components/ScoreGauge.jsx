import React from 'react';

function gaugeColor(score) {
  if (score >= 70) return '#16A34A'; // pass
  if (score >= 50) return '#F59E0B'; // warn
  return '#DC2626'; // fail
}

export default function ScoreGauge({ score, size = 192 }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = gaugeColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-outline-variant"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 800ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-on-surface">
          {Math.round(score)}
        </span>
        <span className="text-on-surface-variant text-mono-label">/ 100</span>
      </div>
    </div>
  );
}

export { gaugeColor };
