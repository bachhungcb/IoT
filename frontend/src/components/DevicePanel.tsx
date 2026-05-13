import React from 'react';
import { Lightbulb, Bell as Alarm } from 'lucide-react';
import { motion } from 'motion/react';

interface DevicePanelProps {
  device: string;
  label: string;
  status: boolean;
  onToggle: (status: boolean) => void;
  icon: React.ReactNode;
}

export const DevicePanel: React.FC<DevicePanelProps> = ({ device, label, status, onToggle, icon }) => {
  const isAlarm = device.toLowerCase().includes('alarm');

  return (
    <div className={`glass-card p-6 flex flex-col items-center gap-4 ${status && isAlarm ? 'bg-red-500/10 border-red-500/20' : ''}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
        status 
          ? isAlarm ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
          : 'bg-slate-800'
      } ${status && isAlarm ? 'animate-pulse' : ''}`}>
        <div className={status ? (isAlarm ? 'text-white' : 'text-slate-900') : 'text-slate-500'}>
          {icon}
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm font-bold tracking-tight">{label}</p>
        <p className={`mono-label text-[10px] mt-1 ${status ? (isAlarm ? 'text-red-400' : 'text-yellow-400') : 'text-slate-400'}`}>
          {status ? (isAlarm ? 'ARMED' : 'ON • 100%') : 'OFF'}
        </p>
      </div>

      <button 
        onClick={() => onToggle(!status)}
        className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
          status 
            ? 'bg-white/10 hover:bg-white/15' 
            : isAlarm ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'
        }`}
      >
        {status ? `Switch ${isAlarm ? 'Disarm' : 'Off'}` : `Switch ${isAlarm ? 'Arm' : 'On'}`}
      </button>
    </div>
  );
};
