import React, { useState, useEffect, useRef } from 'react';
import {
  Layers, ArrowUpRight, ShieldCheck, ScanLine, BarChart3,
  FileCheck, CheckCircle2, ChevronRight, Lock, Database,
  Eye, Globe, Sparkles, Building2, UserCheck, ShieldAlert
} from 'lucide-react';
import GovAuthModal from './GovAuthModal';
import CrowdCanvas from './CrowdCanvas';
import CreepyButton from './ui/CreepyButton';

export default function HeroLandingPage({
  onLaunchApp,
  onOpenScanner,
  onOpenAnalytics,
  onAuthSuccess,
  userRole = 'patwari',
  onChangeRole,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const canvasRef = useRef(null);

  // Dynamic Animated Halftone Background Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spacing = 22;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / spacing);
      const rows = Math.ceil(canvas.height / spacing);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          // Sine wave oscillation for subtle breathing dots
          const wave = Math.sin(i * 0.15 + time) * Math.cos(j * 0.15 + time);
          const radius = Math.max(0.6, 1.3 + wave * 0.9);
          const alpha = Math.max(0.12, 0.28 + wave * 0.18);

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 82, 255, ${alpha * 0.4})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="hero-fullscreen-root">
      {/* Dynamic Animated Canvas Dots */}
      <canvas ref={canvasRef} className="hero-animated-canvas" />

      {/* Top Floating Editorial Navbar */}
      <header className="hero-fullscreen-navbar">
        <div className="hero-brand-block">
          <div className="hero-brand-icon">
            <Building2 size={20} color="#ffffff" />
          </div>
          <div className="hero-brand-text">
            <span className="hero-brand-name">LANDX3D</span>
            <span className="hero-gov-badge">SVAMITVA 3.0</span>
          </div>
        </div>
      </header>

      {/* Center Hero Editorial Content */}
      <main className="hero-main-center-wrapper">
        {/* Pill Tag */}
        <div className="hero-kicker-pill animate-fade-in">
          <Sparkles size={13} color="#0052FF" />
          <span>Next-Gen 3D Cadastral Normalizer & Spatial Engine</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-headline-title animate-slide-up">
          Land Records Reimagined<br />With 3D Intelligence.
        </h1>

        {/* Animated Creepy Launch Button */}
        <div className="hero-creepy-cta-wrapper animate-slide-up">
          <CreepyButton
            onClick={() => setShowAuthModal(true)}
            className="hero-launch-creepy-btn"
            coverClassName="hero-launch-creepy-cover"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Authenticate as Official <ArrowUpRight size={16} />
            </span>
          </CreepyButton>
        </div>
      </main>

      {/* ─── ANIMATED OPENPEEPS CROWD TAKING ENTIRE REST OF THE PAGE ─── */}
      <div className="hero-crowd-bottom-container">
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
      </div>

      {/* Gov Auth Modal */}
      {showAuthModal && (
        <GovAuthModal
          currentRole={userRole}
          onSelectRole={(newRole) => {
            if (onChangeRole) onChangeRole(newRole);
          }}
          onAuthSuccess={() => {
            setShowAuthModal(false);
            if (onAuthSuccess) {
              onAuthSuccess();
            }
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
