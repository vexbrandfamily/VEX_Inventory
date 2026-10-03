'use client';

import React from 'react';
import SplashSceneBackground from '@/components/SplashSceneBackground';
import VexWordmark from '@/components/VexWordmark';

const FONT = 'var(--font-montserrat), Montserrat, sans-serif';

export default function OfflineScreen() {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-montserrat"
      style={{ background: '#050812', fontFamily: FONT }}
    >
      <SplashSceneBackground />

      <div className="relative z-10 flex flex-col items-center text-center px-6 py-10">
        <img
          src="/assets/splash/cube-logo.png"
          alt=""
          className="mx-auto mb-0 h-[72px] w-[72px] object-contain md:h-[96px] md:w-[96px]"
          style={{ filter: 'drop-shadow(0 12px 28px rgba(0, 180, 255, 0.35))' }}
        />
        <VexWordmark className="w-[min(88vw,460px)] h-[76px] md:h-[100px] -mt-2" />

        <p
          className="font-semibold uppercase"
          style={{
            fontFamily: FONT,
            fontWeight: 600,
            color: '#67e8f9',
            letterSpacing: '0.28em',
            fontSize: 'clamp(10px, 2.1vw, 13px)',
            marginTop: '10px',
          }}
        >
          INVENTORY MANAGEMENT SYSTEM
        </p>

        <div className="relative mt-10 mb-6">
          <div
            className="h-[108px] w-[108px] md:h-[124px] md:w-[124px] rounded-full flex items-center justify-center"
            style={{
              border: '2px dashed rgba(34, 211, 238, 0.55)',
              boxShadow: '0 0 24px rgba(34, 211, 238, 0.12)',
            }}
          >
            <svg
              width="56"
              height="56"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 18c8.4-8 23.6-8 32 0"
                stroke="#38bdf8"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M14 24.5c5.6-5.2 14.4-5.2 20 0"
                stroke="#38bdf8"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M19.5 30.5c2.6-2.4 6.4-2.4 9 0"
                stroke="#38bdf8"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle cx="24" cy="36.5" r="2.2" fill="#38bdf8" />
              <line
                x1="12"
                y1="12"
                x2="36"
                y2="38"
                stroke="#38bdf8"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div
            className="absolute bottom-1 right-1 h-7 w-7 rounded-full flex items-center justify-center"
            style={{
              background: '#f59e0b',
              border: '2px solid #050812',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.45)',
            }}
          >
            <span className="text-white font-black text-sm leading-none">!</span>
          </div>
        </div>

        <h2
          className="font-bold text-white"
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 'clamp(22px, 4.4vw, 32px)',
            letterSpacing: '-0.02em',
          }}
        >
          No Internet Connection
        </h2>
        <p
          className="mt-3 max-w-sm"
          style={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: 'clamp(13px, 2.3vw, 16px)',
            color: 'rgba(203, 213, 225, 0.78)',
            lineHeight: 1.5,
          }}
        >
          You are currently offline.
          <br />
          Check your Internet Connection.
        </p>
      </div>
    </div>
  );
}
