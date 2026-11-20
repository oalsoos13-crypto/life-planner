"use client";
import { useEffect, useRef } from "react";
import type { MouthDriver } from "./speech";

/**
 * وجه المستشار مرسوم SVG: بيظهر فوراً وعلى أي جهاز، وبيضل إذا الـ 3D ما اشتغل على الموبايل.
 * نفس الشخصية «الفلكية»: راس زجاجي بحافة ضو، عيون بترمش، فم بيتحرّك مع الحكي، وحلقة نجوم.
 */
export function Face2D({ driver, className }: { driver?: MouthDriver; className?: string }) {
  const mouth = useRef<SVGRectElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const ring = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0, next = 2, blinkAt = -1;
    const t0 = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000;
      const m = driver?.mouth ?? 0;
      mouth.current?.setAttribute("height", String(7 + m * 18));
      mouth.current?.setAttribute("y", String(141 - m * 9));
      let b = 0;
      if (t > next && blinkAt < 0) blinkAt = t;
      if (blinkAt >= 0) {
        const k = (t - blinkAt) / 0.16;
        b = k < 1 ? Math.sin(k * Math.PI) : 0;
        if (k >= 1) { blinkAt = -1; next = t + 2 + Math.random() * 3; }
      }
      // رمش: تصغير عمودي حوالين خط العيون (y = 105.5)
      eyes.current?.setAttribute("transform", `translate(0 ${105.5 * b * 0.9}) scale(1 ${1 - b * 0.9})`);
      ring.current?.setAttribute("transform", `rotate(${(t * (driver?.speaking ? 14 : 5)) % 360} 120 128)`);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [driver]);
  return (
    <svg viewBox="0 0 240 250" className={className} aria-hidden>
      <defs>
        <radialGradient id="f2-head" cx="40%" cy="32%" r="75%">
          <stop offset="0" stopColor="#6f63e8" />
          <stop offset=".55" stopColor="#2a2470" />
          <stop offset="1" stopColor="#120e3a" />
        </radialGradient>
        <radialGradient id="f2-rim" cx="50%" cy="50%" r="50%">
          <stop offset=".82" stopColor="#9f8bff" stopOpacity="0" />
          <stop offset="1" stopColor="#9f8bff" stopOpacity=".9" />
        </radialGradient>
        <filter id="f2-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {/* حلقة نجوم ورا الراس */}
      <g ref={ring}>
        {Array.from({ length: 46 }, (_, i) => {
          const a = (i / 46) * Math.PI * 2;
          return <circle key={i} cx={120 + Math.cos(a) * 108} cy={128 + Math.sin(a) * 26} r={i % 5 ? 1 : 1.8} fill="#dfe8ff" opacity={Math.sin(a) < 0 ? 0.35 : 0.9} />;
        })}
      </g>
      {/* كتاف ورقبة */}
      <path d="M40 250 Q44 196 120 192 Q196 196 200 250Z" fill="url(#f2-head)" />
      <rect x="104" y="168" width="32" height="32" rx="8" fill="#1b1650" />
      {/* الراس */}
      <ellipse cx="120" cy="112" rx="64" ry="76" fill="url(#f2-head)" />
      <ellipse cx="120" cy="112" rx="66" ry="78" fill="url(#f2-rim)" />
      <ellipse cx="96" cy="70" rx="16" ry="9" fill="#fff" opacity=".18" transform="rotate(-25 96 70)" />
      {/* عيون */}
      <g ref={eyes}>
        <rect x="84" y="99" width="22" height="13" rx="6.5" fill="#9fdcff" filter="url(#f2-glow)" opacity=".7" />
        <rect x="134" y="99" width="22" height="13" rx="6.5" fill="#9fdcff" filter="url(#f2-glow)" opacity=".7" />
        <rect x="84" y="99" width="22" height="13" rx="6.5" fill="#eef8ff" />
        <rect x="134" y="99" width="22" height="13" rx="6.5" fill="#eef8ff" />
      </g>
      {/* فم */}
      <rect ref={mouth} x="106" y="141" width="28" height="7" rx="3.5" fill="#c9b8ff" />
    </svg>
  );
}
