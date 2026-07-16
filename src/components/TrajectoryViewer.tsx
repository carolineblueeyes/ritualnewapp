import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Clock, Flame, Navigation, ChevronRight } from 'lucide-react';

interface WorkoutRecord {
  type: string;
  date: string;
  duration: number;
  distance: number;
  calories: number;
  route: { lat: number; lng: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  run: 'Бег',
  walk: 'Ходьба',
  bike: 'Велосипед',
  swim: 'Плавание',
  dance: 'Танцы',
  yoga: 'Йога',
  gym: 'Силовая',
};

function MiniMap({ route }: { route: { lat: number; lng: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || route.length === 0) return;

    const bounds = L.latLngBounds(route.map(p => L.latLng(p.lat, p.lng)));
    const center = bounds.getCenter();

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.polyline(route.map(p => L.latLng(p.lat, p.lng)), {
      color: '#34d399',
      weight: 3,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    map.fitBounds(bounds.pad(0.2));

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [route]);

  return <div ref={containerRef} className="w-full h-28 rounded-xl overflow-hidden" />;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}с`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${day} ${months[d.getMonth()]}`;
}

export default function TrajectoryViewer() {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ritual_workouts');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setWorkouts(data.filter((w: WorkoutRecord) => w.route && w.route.length > 1));
      } catch { /* ignore */ }
    }
  }, []);

  if (workouts.length === 0) return null;

  const recentWorkouts = workouts.slice(0, 7);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] text-white/60 uppercase px-1 tracking-wider font-semibold">Траектории</span>

      {selectedIdx !== null && recentWorkouts[selectedIdx] && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-2">
          <MiniMap route={recentWorkouts[selectedIdx].route} />
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[10px] text-white/50 font-medium">
              {TYPE_LABELS[recentWorkouts[selectedIdx].type] || recentWorkouts[selectedIdx].type} · {formatDate(recentWorkouts[selectedIdx].date)}
            </span>
            <span className="text-[10px] text-white/50 font-medium">
              {recentWorkouts[selectedIdx].distance.toFixed(1)} км
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 px-1">
        {recentWorkouts.map((w, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
            className={`flex-none flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
              selectedIdx === i
                ? 'bg-[#34d399]/10 border-[#34d399]/30 text-white'
                : 'bg-white/[0.02] border-white/[0.04] text-white/50'
            }`}
          >
            <span className="text-[10px] font-medium">{TYPE_LABELS[w.type] || w.type}</span>
            <span className="text-[9px] opacity-50">{formatDate(w.date)}</span>
            {w.route.length > 1 && (
              <MapPin className="w-3 h-3 text-emerald-400/60" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
