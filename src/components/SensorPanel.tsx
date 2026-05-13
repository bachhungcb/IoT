import React from 'react';
import { Thermometer, Droplets, Wind, Volume2, Sun } from 'lucide-react';

interface SensorPanelProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
}

export const SensorPanel: React.FC<SensorPanelProps> = ({ label, value, unit, icon }) => {
  const getProgressColor = () => {
    if (label.toLowerCase().includes('temp')) return 'bg-orange-400';
    if (label.toLowerCase().includes('humid')) return 'bg-blue-400';
    if (label.toLowerCase().includes('air')) return 'bg-emerald-400';
    return 'bg-indigo-400';
  };

  return (
    <div className="glass-card p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="mono-label text-[10px] font-bold tracking-[0.2em]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-light tracking-tight">
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-sm italic font-serif text-slate-400">{unit}</span>
      </div>
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${getProgressColor()}`} 
          style={{ width: `${Math.min(100, Math.max(5, (value / 100) * 100))}%` }}
        ></div>
      </div>
    </div>
  );
};
