'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

export default function SplashSceneBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#22d3ee', '#38bdf8', '#2563eb', '#67e8f9', '#3b82f6'];
    particlesRef.current = Array.from({ length: 180 }, () => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * 0.58 + Math.random() * window.innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -Math.random() * 0.25 - 0.05,
      size: Math.random() * 2.2 + 0.4,
      opacity: Math.random() * 0.55 + 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx + Math.sin(Date.now() * 0.001 + p.y * 0.01) * 0.28;
        p.y += p.vy;
        p.opacity -= 0.0006;

        if (p.y < canvas.height * 0.48 || p.opacity <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height * 0.62 + Math.random() * canvas.height * 0.38;
          p.opacity = Math.random() * 0.55 + 0.15;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ background: '#050812' }}>
      <picture className="absolute inset-0">
        <source media="(min-width: 768px)" srcSet="/assets/splash/bg-desktop.png" />
        <img
          src="/assets/splash/bg-mobile.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </picture>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(5,8,18,0.28) 0%, rgba(5,8,18,0.12) 42%, rgba(5,8,18,0.45) 100%)',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.55 }} />
    </div>
  );
}
