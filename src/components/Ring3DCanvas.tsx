import { useEffect, useRef } from 'react';

interface Ring3DCanvasProps {
  className?: string;
  speed?: number;
  glowColor?: string;
  particleCount?: number;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
}

function colorWithAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map(char => `${char}${char}`).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function Ring3DCanvas({
  className = 'w-full h-full min-h-[220px]',
  speed = 1,
  glowColor = '#8debd0',
  particleCount = 150,
}: Ring3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 300;
    let height = 240;
    let frame = 0;
    let animationFrame = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles: Particle[] = Array.from({ length: Math.min(particleCount, 260) }, (_, index) => ({
      angle: (index / Math.max(1, particleCount)) * Math.PI * 2 + Math.random() * 0.4,
      radius: 0.65 + Math.random() * 1.75,
      speed: 0.25 + Math.random() * 0.65,
      size: 0.6 + Math.random() * 1.5,
      opacity: 0.18 + Math.random() * 0.55,
    }));

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width || 300);
      height = Math.max(1, bounds.height || 240);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const time = frame * 0.016 * speed;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.27;
      const tilt = 0.48 + Math.sin(time * 0.65) * 0.08;
      const rotation = -0.28 + Math.sin(time * 0.45) * 0.18;
      const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;

      context.clearRect(0, 0, width, height);

      const ambient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.2);
      ambient.addColorStop(0, colorWithAlpha(glowColor, 0.12 + pulse * 0.05));
      ambient.addColorStop(0.45, colorWithAlpha(glowColor, 0.035));
      ambient.addColorStop(1, colorWithAlpha(glowColor, 0));
      context.fillStyle = ambient;
      context.fillRect(0, 0, width, height);

      for (const particle of particles) {
        const progress = reduceMotion ? particle.radius : ((particle.radius - time * particle.speed * 0.12) % 2.15 + 2.15) % 2.15 + 0.25;
        const angle = particle.angle + time * particle.speed * 0.45;
        const x = centerX + Math.cos(angle) * radius * progress;
        const y = centerY + Math.sin(angle) * radius * progress * 0.58;
        const fade = Math.min(1, Math.max(0, (progress - 0.25) / 0.65));
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fillStyle = colorWithAlpha(glowColor, particle.opacity * fade);
        context.fill();
      }

      context.save();
      context.translate(centerX, centerY);
      context.rotate(rotation);

      context.beginPath();
      context.ellipse(0, 0, radius, radius * tilt, 0, 0, Math.PI * 2);
      context.lineWidth = radius * 0.34;
      context.strokeStyle = colorWithAlpha(glowColor, 0.08 + pulse * 0.08);
      context.shadowColor = colorWithAlpha(glowColor, 0.8);
      context.shadowBlur = 26 + pulse * 15;
      context.stroke();

      const metal = context.createLinearGradient(-radius, -radius * tilt, radius, radius * tilt);
      metal.addColorStop(0, '#111617');
      metal.addColorStop(0.25, '#506263');
      metal.addColorStop(0.43, '#d7efea');
      metal.addColorStop(0.55, '#405253');
      metal.addColorStop(0.78, '#121718');
      metal.addColorStop(1, '#627777');
      context.beginPath();
      context.ellipse(0, 0, radius, radius * tilt, 0, 0, Math.PI * 2);
      context.lineWidth = radius * 0.25;
      context.strokeStyle = metal;
      context.shadowBlur = 8;
      context.stroke();

      context.beginPath();
      context.ellipse(0, -radius * 0.018, radius, radius * tilt, 0, Math.PI * 1.04, Math.PI * 1.93);
      context.lineWidth = Math.max(1, radius * 0.035);
      context.strokeStyle = colorWithAlpha(glowColor, 0.55 + pulse * 0.25);
      context.shadowBlur = 12;
      context.stroke();
      context.restore();

      if (!reduceMotion) {
        frame += 1;
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [glowColor, particleCount, speed]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
