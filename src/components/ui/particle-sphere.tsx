"use client";

import { useEffect, useRef } from 'react';

interface ParticleSphereProps {
  className?: string;
  size?: number;
  opacity?: number;
  color?: string;
  particleCount?: number;
}

interface Particle {
  theta: number;
  phi: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
}

function colorWithAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ParticleSphere({
  className = '',
  size = 500,
  opacity = 0.7,
  color = '#a78bfa',
  particleCount = 260,
}: ParticleSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 1;
    let height = 1;
    let frameId = 0;
    let tick = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = Math.min(Math.max(particleCount, 80), 520);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const particles: Particle[] = Array.from({ length: count }, (_, index) => {
      const y = 1 - (index / Math.max(1, count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      return {
        theta: golden * index,
        phi: Math.asin(y),
        radius,
        speed: 0.35 + Math.random() * 0.45,
        size: 0.55 + Math.random() * 1.2,
        alpha: 0.18 + Math.random() * 0.55,
      };
    });

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width || size);
      height = Math.max(1, bounds.height || size);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const t = reducedMotion ? 0.2 : tick * 0.012;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.34;
      const pulse = 0.5 + Math.sin(t * 1.8) * 0.5;

      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.7);
      glow.addColorStop(0, colorWithAlpha(color, 0.12 + pulse * 0.04));
      glow.addColorStop(0.55, colorWithAlpha(color, 0.035));
      glow.addColorStop(1, colorWithAlpha(color, 0));
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const particle of particles) {
        const theta = particle.theta + t * particle.speed;
        const x3 = Math.cos(theta) * particle.radius;
        const z3 = Math.sin(theta) * particle.radius;
        const y3 = Math.sin(particle.phi + Math.sin(t * 0.33) * 0.08);
        const depth = (z3 + 1) / 2;
        const x = cx + x3 * radius;
        const y = cy + y3 * radius * 0.82;
        const alpha = particle.alpha * (0.22 + depth * 0.78);

        context.beginPath();
        context.arc(x, y, particle.size * (0.72 + depth * 0.72), 0, Math.PI * 2);
        context.fillStyle = colorWithAlpha(color, alpha);
        context.fill();
      }

      if (!reducedMotion && !document.hidden) {
        tick += 1;
        frameId = requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [color, particleCount, size]);

  return (
    <div
      className={`relative aspect-square pointer-events-none ${className}`}
      style={{ width: `min(100%, ${size}px)`, opacity }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
