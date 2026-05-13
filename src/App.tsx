import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Volume2, 
  Sun, 
  Lightbulb, 
  Bell as Alarm,
  Activity,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react';
import { SensorPanel } from './components/SensorPanel';
import { DevicePanel } from './components/DevicePanel';
import { ChartPanel } from './components/ChartPanel';

interface SensorData {
  temperature: number;
  humidity: number;
  air_quality: number;
  noise: number;
  light: number;
}

interface DeviceStatus {
  lights: boolean;
  alarm: boolean;
}

interface HistoryPoint {
  time: string;
  value: number;
}

export default function App() {
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    air_quality: 0,
    noise: 0,
    light: 0
  });

  const [devices, setDevices] = useState<DeviceStatus>({
    lights: false,
    alarm: false
  });

  const [tempHistory, setTempHistory] = useState<HistoryPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to Backend');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('init_state', (data: { sensorData: SensorData, deviceStatus: DeviceStatus }) => {
      setSensors(data.sensorData);
      setDevices(data.deviceStatus);
    });

    socket.on('sensor_update', (data: { sensor: string, value: number }) => {
      setSensors(prev => {
        const next = { ...prev, [data.sensor]: data.value };
        if (data.sensor === 'temperature') {
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          setTempHistory(h => [...h.slice(-19), { time: timeStr, value: data.value }]);
        }
        return next;
      });
    });

    socket.on('device_update', (data: { device: string, status: boolean }) => {
      setDevices(prev => ({ ...prev, [data.device]: data.status }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleToggle = (device: string, status: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('toggle_device', { device, status });
      setDevices(prev => ({ ...prev, [device]: status }));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background Mesh */}
      <div className="frosted-bg">
        <div className="mesh-1"></div>
        <div className="mesh-2"></div>
        <div className="mesh-3"></div>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 z-10 backdrop-blur-md bg-white/5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SMART HUB</h1>
            <p className="mono-label !text-slate-400 font-bold uppercase tracking-widest">Duy's Residence • MQTT Live</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-2xl font-light tracking-tighter tabular-nums">
              {currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="mono-label !text-slate-400 font-bold uppercase tracking-widest">
              {currentTime.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
            </div>
          </div>
          <div className="h-10 w-10 rounded-full border border-white/20 p-0.5">
            <div className="h-full w-full rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 shadow-inner"></div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col gap-8 p-8 border-r border-white/10 overflow-y-auto shrink-0 bg-white/2">
          <nav className="space-y-4">
            <div className="bg-white/10 border border-white/20 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
              <span className="text-sm font-semibold">Dashboard</span>
            </div>
            <div className="hover:bg-white/5 p-3 rounded-2xl flex items-center gap-3 transition-colors opacity-60">
              <div className="w-2 h-2 rounded-full bg-slate-500"></div>
              <span className="text-sm font-semibold">Devices</span>
            </div>
            <div className="hover:bg-white/5 p-3 rounded-2xl flex items-center gap-3 transition-colors opacity-60">
              <div className="w-2 h-2 rounded-full bg-slate-500"></div>
              <span className="text-sm font-semibold">Security</span>
            </div>
          </nav>

          <div className="mt-auto bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl">
            <p className="mono-label !text-emerald-400 font-bold uppercase mb-1">System Status</p>
            <p className="text-xs text-emerald-100 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              Broker: {connected ? 'Connected' : 'Offline'}
            </p>
            <p className="text-xs text-emerald-100/60 mt-1">Latency: 14ms</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* Sensor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <SensorPanel 
              label="Temperature" 
              value={sensors.temperature} 
              unit="°C" 
              icon={<Thermometer />} 
            />
            <SensorPanel 
              label="Humidity" 
              value={sensors.humidity} 
              unit="%" 
              icon={<Droplets />} 
            />
            <SensorPanel 
              label="Air Quality" 
              value={sensors.air_quality} 
              unit="AQI" 
              icon={<Wind />} 
            />
            <SensorPanel 
              label="Noise Level" 
              value={sensors.noise} 
              unit="dB" 
              icon={<Volume2 />} 
            />
            <SensorPanel 
              label="Brightness" 
              value={sensors.light} 
              unit="Lux" 
              icon={<Sun />} 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="xl:col-span-2">
              <ChartPanel 
                title="Ambient Temperature" 
                data={tempHistory} 
                color="#6366f1" 
              />
            </div>

            {/* Controls Area */}
            <div className="space-y-6">
              <div className="glass-panel p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-semibold tracking-tight">Rapid Controls</h3>
                  <span className="mono-label !text-indigo-400 font-bold uppercase tracking-widest">2 Active</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <DevicePanel 
                    device="lights" 
                    label="Main Lighting" 
                    status={devices.lights} 
                    onToggle={(s) => handleToggle('lights', s)} 
                    icon={<Lightbulb />} 
                  />
                  <DevicePanel 
                    device="alarm" 
                    label="Perimeter Alarm" 
                    status={devices.alarm} 
                    onToggle={(s) => handleToggle('alarm', s)} 
                    icon={<Alarm />} 
                  />
                </div>
              </div>

              <div className="glass-panel p-6 flex items-center justify-between">
                <div>
                  <p className="mono-label">Main Gate Status</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">LOCKED & SECURE</p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <div className="text-emerald-400 w-5 h-5 flex items-center justify-center">✓</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="px-8 py-4 z-10 flex items-center justify-between border-t border-white/10 bg-black/40 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="mono-label !text-slate-400">MQTT: {connected ? '192.168.1.50' : 'SCANNING...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="mono-label !text-slate-400">SYSTEM STABLE</span>
          </div>
        </div>
        <div className="mono-label !text-slate-500 font-medium">
          © 2026 Duy • SMARTHUB HUB V4.2.1-STABLE
        </div>
      </footer>
    </div>
  );
}
