import React, { useEffect, useRef } from 'react';
import fragmentShaderSource from './silkShader.frag?raw';

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const BASE_COLORS = ['#02010A', '#04052E', '#3D2C8D', '#916BBF'] as const;

function hexToRgb(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '916BBF';
  return [0, 2, 4].map(offset => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
}

function buildPalette(accentColor: string) {
  const accent = hexToRgb(accentColor);
  const accentWeights = [0.04, 0.18, 0.48, 0.72];
  const palette = new Float32Array(24);
  BASE_COLORS.forEach((hex, colorIndex) => {
    const base = hexToRgb(hex);
    const weight = accentWeights[colorIndex];
    for (let channel = 0; channel < 3; channel += 1) {
      palette[colorIndex * 3 + channel] = base[channel] * (1 - weight) + accent[channel] * weight;
    }
  });
  return palette;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Silk shader compilation failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

interface SilkShaderBackgroundProps {
  accentColor: string;
}

export default function SilkShaderBackground({ accentColor }: SilkShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef(accentColor);
  accentRef.current = accentColor;

  useEffect(() => {
    canvasRef.current?.dispatchEvent(new Event('silk-palette-change'));
  }, [accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Silk shader linking failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const locations = {
      colors: uniform('u_colors[0]'),
      scene: uniform('u_scene'),
      shape: uniform('u_shape'),
      surface: uniform('u_surface'),
      finish: uniform('u_finish'),
      transform: uniform('u_transform'),
      space: uniform('u_space'),
      cursor: uniform('u_cursor'),
    };
    let palette = buildPalette(accentRef.current);
    gl.uniform3fv(locations.colors, palette);
    gl.uniform4f(locations.shape, 1.26, 0.28, 0.5, 0);
    gl.uniform4f(locations.surface, 2.4, 1.11, 0, 1);
    gl.uniform4f(locations.finish, 0, 0, 0, 0.05);
    gl.uniform4f(locations.transform, 1581, 0, 0, 0);
    gl.uniform4f(locations.space, 0, 0, 0, 0);
    gl.uniform4f(locations.cursor, 0, 2, 0.65, 0.46);

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const nextHeight = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (nextWidth === width && nextHeight === height) return;
      width = canvas.width = nextWidth;
      height = canvas.height = nextHeight;
      gl.viewport(0, 0, width, height);
    };

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      resize();
      const targetPalette = buildPalette(accentRef.current);
      if (media.matches) {
        palette = targetPalette;
      } else {
        for (let index = 0; index < palette.length; index += 1) {
          palette[index] += (targetPalette[index] - palette[index]) * 0.045;
        }
      }
      gl.uniform3fv(locations.colors, palette);
      const seconds = media.matches ? 0 : ((now - start) / 1000) * 0.76;
      gl.uniform4f(locations.scene, width, height, seconds, 4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!media.matches && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resume);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    canvas.addEventListener('silk-palette-change', resume);
    media.addEventListener?.('change', resume);
    resume();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      canvas.removeEventListener('silk-palette-change', resume);
      media.removeEventListener?.('change', resume);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full bg-[#02010A] pointer-events-none"
    />
  );
}
