'use client';

import React, { useEffect, useState } from 'react';
import SplashSceneBackground from '@/components/SplashSceneBackground';
import VexWordmark from '@/components/VexWordmark';

const SPLASH_FONT = 'var(--font-montserrat), Montserrat, sans-serif';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 700);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden font-montserrat"
      style={{
        background: '#050812',
        fontFamily: SPLASH_FONT,
        transition: 'opacity 0.7s ease',
        opacity: fadeOut ? 0 : 1,
      }}
    >
      <SplashSceneBackground />

      <div className="relative z-10 flex flex-col items-center text-center px-6 -mt-6 md:-mt-4">
        <div className="mb-1 animate-[splashFadeDown_0.8s_ease_forwards]">
          <img
            src="/assets/splash/cube-logo.png"
            alt=""
            className="mx-auto mb-0 h-[88px] w-[88px] object-contain md:h-[118px] md:w-[118px]"
            style={{ filter: 'drop-shadow(0 12px 28px rgba(0, 180, 255, 0.35))' }}
          />
          <VexWordmark className="w-[min(92vw,520px)] h-[88px] md:h-[118px] -mt-3" />
        </div>

        <p
          className="font-semibold uppercase animate-[splashFade_1s_ease_0.35s_forwards] opacity-0"
          style={{
            fontFamily: SPLASH_FONT,
            fontWeight: 600,
            color: '#67e8f9',
            letterSpacing: '0.28em',
            fontSize: 'clamp(10px, 2.1vw, 14px)',
            marginTop: '10px',
          }}
        >
          INVENTORY MANAGEMENT SYSTEM
        </p>

        <div
          className="flex items-center gap-2 my-5 animate-[splashFade_1s_ease_0.45s_forwards] opacity-0"
        >
          <div
            className="h-px w-[72px] md:w-28"
            style={{ background: 'linear-gradient(to right, transparent, #22d3ee)' }}
          />
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: '#22d3ee', boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.6)' }}
          />
          <div
            className="h-px w-[72px] md:w-28"
            style={{ background: 'linear-gradient(to left, transparent, #22d3ee)' }}
          />
        </div>

        <h2
          className="font-bold text-white animate-[splashFade_1s_ease_0.55s_forwards] opacity-0"
          style={{
            fontFamily: SPLASH_FONT,
            fontWeight: 700,
            fontSize: 'clamp(20px, 4.2vw, 28px)',
            letterSpacing: '-0.01em',
          }}
        >
          Manage. Track. Grow.
        </h2>

        <p
          className="mt-2 mb-12 animate-[splashFade_1s_ease_0.65s_forwards] opacity-0"
          style={{
            fontFamily: SPLASH_FONT,
            fontWeight: 400,
            fontSize: 'clamp(13px, 2.4vw, 16px)',
            color: 'rgba(226, 232, 240, 0.78)',
          }}
        >
          Smart inventory. Stronger business.
        </p>

        <div
          className="flex flex-col items-center gap-3 animate-[splashFade_1s_ease_0.85s_forwards] opacity-0"
        >
          <div
            className="h-10 w-10 rounded-full border-[2.5px] border-transparent animate-spin"
            style={{
              borderTopColor: '#22d3ee',
              borderRightColor: 'rgba(34, 211, 238, 0.28)',
              borderBottomColor: 'rgba(34, 211, 238, 0.08)',
              borderLeftColor: 'rgba(34, 211, 238, 0.16)',
              boxShadow: '0 0 14px rgba(34, 211, 238, 0.35)',
            }}
          />
          <span
            style={{
              fontFamily: SPLASH_FONT,
              fontWeight: 400,
              fontSize: '14px',
              color: 'rgba(203, 213, 225, 0.72)',
            }}
          >
            Loading...
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes splashFadeDown {
          from { opacity: 0; transform: translateY(-18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
