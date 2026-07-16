import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ActivityMapProps {
  center?: { lat: number; lng: number };
  route?: { lat: number; lng: number }[];
  followUser?: boolean;
  height?: string;
}

const MOSCOW = { lat: 55.7558, lng: 37.6173 };

export default function ActivityMap({ center, route, followUser = false, height = '25vh' }: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const routeLatLngs = useMemo(() => {
    if (!route || route.length === 0) return [];
    return route.map((p) => L.latLng(p.lat, p.lng));
  }, [route]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = center || MOSCOW;

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const pulsingIcon = L.divIcon({
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      html: `<div style="
        width: 16px;
        height: 16px;
        background: #34d399;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
        animation: user-pulse 2s ease-in-out infinite;
      "></div>
      <style>
        @keyframes user-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      </style>`,
    });

    const marker = L.marker([initialCenter.lat, initialCenter.lng], { icon: pulsingIcon }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    const timer = setTimeout(() => {
      if (mapRef.current) {
        try {
          map.invalidateSize();
        } catch (e) {}
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch (e) {}
      }
      try {
        map.stop();
        map.remove();
      } catch (err) {
        console.warn('Error during map destruction:', err);
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const pos = center || MOSCOW;
    if (markerRef.current) {
      try {
        markerRef.current.setLatLng([pos.lat, pos.lng]);
      } catch (e) {}
    }

    if (followUser && center) {
      try {
        map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 });
      } catch (e) {}
    }
  }, [center, followUser]);

  useEffect(() => {
    if (!mapRef.current) return;

    try {
      const existingLayers: L.Polyline[] = [];
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polyline && !(layer instanceof L.CircleMarker)) {
          existingLayers.push(layer);
        }
      });
      existingLayers.forEach((l) => {
        try {
          mapRef.current?.removeLayer(l);
        } catch (e) {}
      });

      if (routeLatLngs.length > 1) {
        const polyline = L.polyline(routeLatLngs, {
          color: '#34d399',
          weight: 3,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(L.latLngBounds(routeLatLngs).pad(0.1));
      }
    } catch (e) {}
  }, [routeLatLngs]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-white/[0.04] overflow-hidden`}
      style={{ width: '100%', height }}
    />
  );
}
