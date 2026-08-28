import React, { useEffect, useRef } from 'react';
import { Shield } from 'lucide-react';

export const MineMindHeroBanner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic canvas animation for the glowing fiber optic streams and constellation network
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 700);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes for the constellation in the lower area
    const nodeCount = 28;
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      glow: string;
    }> = [];

    const colors = [
      { color: '#FCD34D', glow: 'rgba(252, 211, 77, 0.6)' }, // Gold
      { color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.6)' }, // Cyan
      { color: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.7)' }, // White
      { color: '#FB923C', glow: 'rgba(251, 146, 60, 0.5)' }, // Amber
    ];

    for (let i = 0; i < nodeCount; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      nodes.push({
        x: Math.random() * width,
        y: height * 0.55 + Math.random() * (height * 0.42),
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2.2 + 1.2,
        color: col.color,
        glow: col.glow,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Draw flowing fiber optic curved light waves
      const waveCount = 5;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const startY = height * 0.62 + w * 22;
        ctx.moveTo(0, startY);

        for (let x = 0; x <= width; x += 15) {
          const waveY =
            startY +
            Math.sin(x * 0.008 + time + w * 0.8) * 22 +
            Math.cos(x * 0.012 - time * 0.7) * 14;
          ctx.lineTo(x, waveY);
        }

        const isGold = w % 2 === 0;
        const grad = ctx.createLinearGradient(0, startY, width, startY + 40);
        if (isGold) {
          grad.addColorStop(0, 'rgba(217, 119, 6, 0)');
          grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.25)');
          grad.addColorStop(0.7, 'rgba(251, 191, 36, 0.45)');
          grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        } else {
          grad.addColorStop(0, 'rgba(14, 165, 233, 0)');
          grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.25)');
          grad.addColorStop(0.7, 'rgba(96, 165, 250, 0.4)');
          grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = w === 1 || w === 3 ? 2 : 1.2;
        ctx.stroke();
      }

      // Update and connect constellation nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        n1.x += n1.vx;
        n1.y += n1.vy;

        // Bounce within lower bounding box
        if (n1.x < 10 || n1.x > width - 10) n1.vx *= -1;
        if (n1.y < height * 0.52 || n1.y > height - 15) n1.vy *= -1;

        // Connect nearby nodes with fine geometric network lines
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85) {
            const alpha = (1 - dist / 85) * 0.35;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.save();
        ctx.shadowColor = n.glow;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#0A0E17] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden select-none border-r border-[#1E293B]">
      {/* Background radial glow atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1E293B]/60 via-[#0A0E17] to-[#05070B] pointer-events-none" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Animated Canvas for Fiber Optic Wave & Constellation */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-85"
      />

      {/* ============================================================ */}
      {/* 1. TOP 3D GEOMETRIC CRYSTAL PRISM WITH GLOWING BRAIN */}
      {/* ============================================================ */}
      <div className="relative z-10 flex flex-col items-center pt-2 sm:pt-4">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
          {/* Ambient Glow behind crystal */}
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-amber-400/15 to-blue-600/20 rounded-full blur-2xl animate-pulse" />

          {/* Precision 3D Faceted Crystal Polyhedron (SVG) */}
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Hexagonal Prism Facets */}
            {/* Top Pyramid Cap */}
            <polygon
              points="100,20 155,55 100,80"
              fill="url(#crystalTopRight)"
              stroke="#7DD3FC"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
            <polygon
              points="100,20 45,55 100,80"
              fill="url(#crystalTopLeft)"
              stroke="#BAE6FD"
              strokeWidth="1.2"
              strokeOpacity="0.9"
            />

            {/* Mid Facets */}
            <polygon
              points="45,55 100,80 100,140 45,115"
              fill="url(#crystalMidLeft)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
            <polygon
              points="155,55 100,80 100,140 155,115"
              fill="url(#crystalMidRight)"
              stroke="#60A5FA"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />

            {/* Side Outer Wings */}
            <polygon
              points="100,20 155,55 170,100 155,115"
              fill="url(#crystalWingRight)"
              stroke="#38BDF8"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <polygon
              points="100,20 45,55 30,100 45,115"
              fill="url(#crystalWingLeft)"
              stroke="#7DD3FC"
              strokeWidth="1"
              strokeOpacity="0.6"
            />

            {/* Bottom Pyramid Inverted Cap */}
            <polygon
              points="45,115 100,140 100,180"
              fill="url(#crystalBottomLeft)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
            <polygon
              points="155,115 100,140 100,180"
              fill="url(#crystalBottomRight)"
              stroke="#60A5FA"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
            <polygon
              points="30,100 45,115 100,180"
              fill="url(#crystalBottomWingLeft)"
              stroke="#0284C7"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
            <polygon
              points="170,100 155,115 100,180"
              fill="url(#crystalBottomWingRight)"
              stroke="#0284C7"
              strokeWidth="1"
              strokeOpacity="0.5"
            />

            {/* Glowing Neural Network Brain inside the Crystal */}
            <g className="animate-pulse">
              {/* Brain Hemispheres Neural Nodes & Synapses */}
              {/* Left Hemisphere */}
              <path
                d="M 82 72 Q 70 70, 68 85 Q 66 100, 78 112 Q 88 120, 95 118 Q 94 100, 92 88 Z"
                fill="url(#brainGlowLeft)"
                opacity="0.6"
              />
              {/* Right Hemisphere */}
              <path
                d="M 118 72 Q 130 70, 132 85 Q 134 100, 122 112 Q 112 120, 105 118 Q 106 100, 108 88 Z"
                fill="url(#brainGlowRight)"
                opacity="0.6"
              />

              {/* Neural Synapse Lines */}
              <path
                d="M 72 82 Q 85 78, 92 88 T 108 88 T 128 82 M 70 95 Q 82 92, 94 98 T 106 98 T 130 95 M 76 108 Q 88 105, 100 114 T 124 108 M 85 75 L 88 110 M 115 75 L 112 110 M 92 88 L 108 102 M 108 88 L 92 102"
                stroke="#FDE047"
                strokeWidth="1"
                strokeOpacity="0.85"
                strokeDasharray="2 1"
              />

              {/* Glowing Synapse Node Spheres */}
              <circle cx="100" cy="80" r="2.5" fill="#FFFFFF" />
              <circle cx="85" cy="76" r="2" fill="#FCD34D" />
              <circle cx="115" cy="76" r="2" fill="#FCD34D" />
              <circle cx="72" cy="86" r="2.2" fill="#38BDF8" />
              <circle cx="128" cy="86" r="2.2" fill="#38BDF8" />
              <circle cx="92" cy="94" r="2.5" fill="#FFFFFF" />
              <circle cx="108" cy="94" r="2.5" fill="#FFFFFF" />
              <circle cx="76" cy="104" r="2" fill="#FCD34D" />
              <circle cx="124" cy="104" r="2" fill="#FCD34D" />
              <circle cx="100" cy="112" r="2.5" fill="#38BDF8" />
            </g>

            {/* Glowing Vertex Highlight Dots */}
            <circle cx="100" cy="20" r="2.5" fill="#FFFFFF" filter="url(#glowFilter)" />
            <circle cx="45" cy="55" r="2" fill="#BAE6FD" />
            <circle cx="155" cy="55" r="2" fill="#BAE6FD" />
            <circle cx="30" cy="100" r="2" fill="#38BDF8" />
            <circle cx="170" cy="100" r="2" fill="#38BDF8" />
            <circle cx="100" cy="80" r="2" fill="#FFFFFF" />
            <circle cx="100" cy="140" r="2.2" fill="#7DD3FC" />
            <circle cx="100" cy="180" r="2.5" fill="#FFFFFF" filter="url(#glowFilter)" />

            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="crystalTopLeft" x1="45" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="1" stopColor="#0C4A6E" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="crystalTopRight" x1="155" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA" stopOpacity="0.3" />
                <stop offset="1" stopColor="#1E3A8A" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="crystalMidLeft" x1="45" y1="55" x2="100" y2="140" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284C7" stopOpacity="0.25" />
                <stop offset="1" stopColor="#0F172A" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="crystalMidRight" x1="155" y1="55" x2="100" y2="140" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" stopOpacity="0.2" />
                <stop offset="1" stopColor="#0F172A" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="crystalWingLeft" x1="30" y1="50" x2="45" y2="115" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0EA5E9" stopOpacity="0.2" />
                <stop offset="1" stopColor="#0369A1" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="crystalWingRight" x1="170" y1="50" x2="155" y2="115" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" stopOpacity="0.2" />
                <stop offset="1" stopColor="#1D4ED8" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="crystalBottomLeft" x1="45" y1="115" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284C7" stopOpacity="0.35" />
                <stop offset="1" stopColor="#38BDF8" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="crystalBottomRight" x1="155" y1="115" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1E40AF" stopOpacity="0.3" />
                <stop offset="1" stopColor="#60A5FA" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="crystalBottomWingLeft" x1="30" y1="100" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0369A1" stopOpacity="0.15" />
                <stop offset="1" stopColor="#0284C7" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="crystalBottomWingRight" x1="170" y1="100" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1E3A8A" stopOpacity="0.15" />
                <stop offset="1" stopColor="#2563EB" stopOpacity="0.3" />
              </linearGradient>
              <radialGradient id="brainGlowLeft" cx="82" cy="95" r="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" stopOpacity="0.5" />
                <stop offset="0.7" stopColor="#38BDF8" stopOpacity="0.2" />
                <stop offset="1" stopColor="#0284C7" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="brainGlowRight" cx="118" cy="95" r="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" stopOpacity="0.5" />
                <stop offset="0.7" stopColor="#38BDF8" stopOpacity="0.2" />
                <stop offset="1" stopColor="#0284C7" stopOpacity="0" />
              </radialGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
          </svg>
        </div>

        {/* Brand Name Typography */}
        <div className="text-center mt-3 sm:mt-4 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-serif font-extrabold text-2xl sm:text-3xl tracking-widest text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              MINEMIND <span className="text-[#38BDF8]">AI</span>
            </h1>
          </div>
          <p className="text-[10px] sm:text-[11px] font-mono tracking-wider text-[#94A3B8] uppercase">
            From scattered reports to smarter mining decision
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CENTER HEADLINES */}
      {/* ============================================================ */}
      <div className="relative z-10 text-center my-auto py-6 sm:py-8 space-y-2">
        <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          SECURE INTELLIGENCE <br />
          <span className="text-[#F1F5F9]">PORTAL</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#CBD5E1] font-normal tracking-wide max-w-xs mx-auto">
          From scattered reports to smarter mining decision
        </p>
      </div>

      {/* ============================================================ */}
      {/* 3. BOTTOM FOOTER MARKER */}
      {/* ============================================================ */}
      <div className="relative z-10 pt-4 border-t border-[#1E293B]/70 flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span className="flex items-center gap-1.5 font-medium text-[#CBD5E1]">
          <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
          Secure Organizational Access
        </span>
        <span className="font-mono text-[#64748B]">Enterprise Edition</span>
      </div>
    </div>
  );
};
