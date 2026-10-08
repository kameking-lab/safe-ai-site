"use client";

import Image from "next/image";
import { useState } from "react";

export function HomeChihuahuaCompanion() {
  const [greeting, setGreeting] = useState(0);
  return (
    <figure className="flex flex-col items-center gap-3 text-center">
      <style>{`
        @keyframes home-companion-greeting {
          0%,100% { transform: translateY(0) rotate(0); }
          35% { transform: translateY(-3px) rotate(-2deg); }
          70% { transform: translateY(-1px) rotate(2deg); }
        }
        .home-companion-greeting { animation: home-companion-greeting 2s ease-in-out 1; }
        @media(prefers-reduced-motion:reduce) {
          .home-companion-greeting { animation: none; transform: none; }
        }
      `}</style>
      <Image key={greeting} src="/mascot/mascot-tablet-dx.webp" alt="ヘルメットをかぶり、タブレットを持つチワワ" width={274} height={320} sizes="(min-width: 1024px) 280px, 140px" className="home-companion-greeting h-auto w-[140px] lg:w-[280px]" />
      <figcaption className="text-sm tracking-wide text-[#F4F1E8]">現場の、ちいさな相棒。</figcaption>
      <button type="button" onClick={() => setGreeting((value) => value + 1)} className="min-h-11 rounded-full border border-[#F4F1E8]/40 px-5 text-sm text-[#F4F1E8] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#DCEF9A]">チワワをなでる</button>
    </figure>
  );
}
