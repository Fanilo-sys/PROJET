import React, { useState, useEffect, useRef } from 'react';
import {
  User, Lock, AlertCircle, Loader2, ChevronRight,
  Mail, Info, BookOpen, Headphones,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types & data
   ───────────────────────────────────────────── */

interface LoginPageProps {
  onLogin: () => void;
}

interface FloatingShape {
  width: number;
  height: number;
  top: string;
  left: string;
  delay: string;
  duration: string;
  z: number;
  rotateX: number;
  rotateY: number;
  border?: string;
  borderRadius: string;
  background?: string;
  filter?: string;
  boxShadow?: string;
  opacity?: number;
}

const NAV_ITEMS = [
  { id: 'contact',    label: 'Contact',    icon: Mail },
  { id: 'apropos',    label: 'À propos',   icon: Info },
  { id: 'guide',      label: 'Guide',      icon: BookOpen },
  { id: 'assistance', label: 'Assistance',  icon: Headphones },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];

const MODAL_CONTENT: Record<NavId, { title: string; body: string }> = {
  contact: {
    title: 'Contact',
    body: 'Pour toute question relative à votre espace de gestion, contactez le service des associations — Préfecture, Porte 407.\n\nTéléphone : 01 23 45 67 89\nEmail : associations@prefecture.gouv.fr\nHoraires : lun–ven, 8h–16h.',
  },
  apropos: {
    title: 'À propos',
    body: 'Cette application interne est destinée au personnel habilité de la Préfecture pour le suivi des dossiers associatifs, la gestion du registre chrono, et la consultation des historiques.\n\nVersion 2.0 — Mise en service 2026.',
  },
  guide: {
    title: "Guide d'utilisation",
    body: 'Consultez le manuel utilisateur en ligne pour découvrir les fonctionnalités de l\'application :\n\n• Réception et enregistrement des dossiers\n• Suivi des dossiers en cours et en attente\n• Gestion de l\'annuaire des associations\n• Registre chronologique\n• Historiques complets',
  },
  assistance: {
    title: 'Assistance technique',
    body: 'En cas de difficulté technique, veuillez contacter le service informatique de la Préfecture.\n\nEmail : support.informatique@prefecture.gouv.fr\nTéléphone : 01 23 45 67 88\nOuverture : lun–ven, 8h–17h.',
  },
};

/* ─────────────────────────────────────────────
   3D floating shape descriptors
   ───────────────────────────────────────────── */

const FLOATING_SHAPES: FloatingShape[] = [
  { width: 220, height: 220, top: '15%', left: '55%', delay: '0s', duration: '28s', z: 120, rotateX: 15, rotateY: 25, border: '2px solid rgba(59,130,246,0.12)', borderRadius: '50%' },
  { width: 300, height: 300, top: '40%', left: '10%', delay: '0s', duration: '20s', z: -60, rotateX: 0, rotateY: 0, background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' },
  { width: 50, height: 50, top: '70%', left: '65%', delay: '1.5s', duration: '22s', z: 80, rotateX: 35, rotateY: 45, border: '2px solid rgba(96,165,250,0.15)', borderRadius: '8px', background: 'rgba(96,165,250,0.04)' },
  { width: 20, height: 20, top: '30%', left: '80%', delay: '3s', duration: '18s', z: -30, rotateX: 0, rotateY: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.12)' },
  { width: 70, height: 70, top: '80%', left: '40%', delay: '0.8s', duration: '26s', z: 50, rotateX: -20, rotateY: 30, border: '2px solid rgba(59,130,246,0.08)', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' },
  { width: 100, height: 100, top: '10%', left: '25%', delay: '2.5s', duration: '24s', z: -20, rotateX: 10, rotateY: -15, border: '1.5px solid rgba(147,197,253,0.15)', borderRadius: '50%' },
  { width: 8, height: 8, top: '50%', left: '75%', delay: '1s', duration: '15s', z: 100, rotateX: 0, rotateY: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.3)', boxShadow: '0 0 16px rgba(59,130,246,0.2)' },
  { width: 150, height: 150, top: '25%', left: '15%', delay: '4s', duration: '30s', z: 40, rotateX: -10, rotateY: 40, border: '1px solid rgba(147,197,253,0.08)', borderRadius: '50%' },
  { width: 30, height: 80, top: '60%', left: '30%', delay: '2s', duration: '23s', z: -50, rotateX: 25, rotateY: -35, border: '2px solid rgba(96,165,250,0.06)', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' },
];

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<NavId | null>(null);

  const [mounted, setMounted] = useState(false);
  const [heroMounted, setHeroMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setHeroMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  /* ── Mouse parallax for hero 3D ── */
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const handleHeroMouse = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseX(x);
    setMouseY(y);
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Identifiants invalides');
        return;
      }

      const data = await response.json();
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      onLogin();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* ====================================================================
          TOP NAVBAR — full-width glass
          ==================================================================== */}
      <header className="sticky top-0 z-30 w-full">
        <nav className="h-16 flex items-center justify-between px-6 sm:px-10 lg:px-14 bg-white/70 backdrop-blur-xl border-b border-blue-100/60 shadow-[0_1px_12px_rgba(59,130,246,0.04)]">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md shadow-blue-600/20">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-gray-800 tracking-tight">
                Préfecture <span className="text-blue-500 mx-0.5">·</span> Porte 407
              </span>
            </div>
          </div>

          {/* Right: nav items */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveModal(id)}
                className="group relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-blue-700 hover:bg-blue-50/80 transition-all duration-200 font-medium"
              >
                <Icon
                  size={16}
                  className="transition-all duration-200 group-hover:text-blue-500 group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]"
                />
                <span className="hidden sm:inline">{label}</span>
                {/* active underline on hover */}
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500/0 rounded-full transition-all duration-200 group-hover:bg-blue-500/40" />
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ====================================================================
          MAIN CONTENT — two columns
          ==================================================================== */}
      <div className="flex-1 flex">
        {/* ──────── LEFT HERO ──────── */}
        <div
          ref={heroRef}
          onMouseMove={handleHeroMouse}
          className="relative hidden lg:flex w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950"
        >
          {/* 3D scene container */}
          <div
            className="absolute inset-0"
            style={{
              perspective: '1000px',
              perspectiveOrigin: `${50 + mouseX * 20}% ${50 + mouseY * 20}%`,
              transition: 'perspective-origin 0.4s ease-out',
            }}
          >
            {FLOATING_SHAPES.map((s, i) => {
              const tx = mouseX * (s.z * 0.15);
              const ty = mouseY * (s.z * 0.15);
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: s.width,
                    height: s.height,
                    top: s.top,
                    left: s.left,
                    marginLeft: -(s.width / 2),
                    marginTop: -(s.height / 2),
                    border: s.border,
                    borderRadius: s.borderRadius,
                    background: s.background,
                    filter: s.filter,
                    boxShadow: s.boxShadow,
                    opacity: s.opacity ?? 1,
                    transformStyle: 'preserve-3d',
                    animation: `hero-float-${i} ${s.duration} ${s.delay} ease-in-out infinite alternate`,
                    transform: `translate3d(${tx}px, ${ty}px, ${s.z}px) rotateX(${s.rotateX + mouseY * 8}deg) rotateY(${s.rotateY + mouseX * 8}deg)`,
                    willChange: 'transform',
                  }}
                />
              );
            })}
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 via-transparent to-blue-950/40 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)] pointer-events-none" />

          {/* Content */}
          <div
            className="relative z-10 px-16 max-w-xl"
            style={{
              opacity: heroMounted ? 1 : 0,
              transform: heroMounted ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
            }}
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 mb-6 text-xs font-semibold tracking-widest uppercase text-blue-200 bg-blue-500/10 rounded-full border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Application interne
            </span>

            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.15] mb-5 tracking-tight">
              Gestion des<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">
                Associations
              </span>
            </h1>

            <p className="text-base xl:text-lg text-blue-200/70 leading-relaxed max-w-md">
              Plateforme centralisée de suivi des dossiers associatifs —
              enregistrement, instruction, suivi chronologique et historiques
              complets.
            </p>

            <div className="mt-10 flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-bold text-white">1 200+</p>
                <p className="text-[11px] text-blue-300/50 font-medium tracking-widest uppercase mt-1">Dossiers traités</p>
              </div>
              <div className="w-px h-10 bg-blue-400/20 self-center" />
              <div>
                <p className="text-2xl font-bold text-white">98 %</p>
                <p className="text-[11px] text-blue-300/50 font-medium tracking-widest uppercase mt-1">Satisfaction</p>
              </div>
              <div className="w-px h-10 bg-blue-400/20 self-center" />
              <div>
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="text-[11px] text-blue-300/50 font-medium tracking-widest uppercase mt-1">Disponibilité</p>
              </div>
            </div>
          </div>
        </div>

        {/* ──────── RIGHT LOGIN CARD ──────── */}
        <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10">
          <div
            className="w-full max-w-[420px]"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            {/* Mobile-only logo */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md shadow-blue-600/20">
                <span className="text-white text-sm font-bold">P</span>
              </div>
              <span className="text-sm font-bold text-gray-800">
                Préfecture · Porte 407
              </span>
            </div>

            {/* Login card */}
            <div className="bg-white rounded-2xl border border-blue-100/60 shadow-xl shadow-blue-900/5 p-8 sm:p-10">
              {/* Top decorative accent bar */}
              <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-6" />

              {/* Title */}
              <h1 className="text-[26px] font-extrabold text-gray-900 mb-1 tracking-tight">
                Connexion
              </h1>
              <p className="text-sm text-gray-400 mb-8">
                Accédez à votre espace de gestion
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── Identifiant ── */}
                <div>
                  <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Identifiant
                  </label>
                  <div className="group relative">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 focus-within:border-blue-400 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] group-hover:border-gray-300">
                      <div className="flex items-center justify-center w-11 h-11 bg-gray-50/80 border-r border-gray-200 flex-shrink-0 transition-colors group-focus-within:bg-blue-50">
                        <User size={16} className="text-gray-350 transition-colors group-focus-within:text-blue-500" />
                      </div>
                      <input
                        id="username"
                        type="text"
                        className="flex-1 px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none font-medium"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        autoFocus
                        placeholder="Votre identifiant"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Mot de passe ── */}
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Mot de passe
                  </label>
                  <div className="group relative">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 focus-within:border-blue-400 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] group-hover:border-gray-300">
                      <div className="flex items-center justify-center w-11 h-11 bg-gray-50/80 border-r border-gray-200 flex-shrink-0 transition-colors group-focus-within:bg-blue-50">
                        <Lock size={16} className="text-gray-350 transition-colors group-focus-within:text-blue-500" />
                      </div>
                      <input
                        id="password"
                        type="password"
                        className="flex-1 px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none font-medium"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Forgot password link ── */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* ── Error ── */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-red-600 text-sm font-medium animate-error-shake">
                    <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                    <span className="flex-1">{error}</span>
                  </div>
                )}

                {/* ── Submit ── */}
                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="relative w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm hover:from-blue-700 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-400 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-700/30 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Connexion…
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-[11px] text-gray-300 font-medium mt-8 tracking-widest uppercase flex items-center justify-center gap-2">
              <span className="w-6 h-px bg-gray-200" />
              Préfecture — Porte 407
              <span className="w-6 h-px bg-gray-200" />
            </p>
          </div>
        </main>
      </div>

      {/* ====================================================================
          MODALS
          ==================================================================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-7 animate-float-in border border-blue-50"
            onClick={e => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div className="w-10 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4" />

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {MODAL_CONTENT[activeModal].title}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">
              {MODAL_CONTENT[activeModal].body}
            </p>
          </div>
        </div>
      )}

      {/* ──────── 3D floating shape keyframes ──────── */}
      <style>{`
        ${FLOATING_SHAPES.map((s, i) => `
          @keyframes hero-float-${i} {
            0%   { transform: translate3d(0, 0, 0) rotateX(${s.rotateX}deg) rotateY(${s.rotateY}deg); }
            100% { transform: translate3d(0, ${-20 - i * 3}px, ${s.z * 0.3}px) rotateX(${s.rotateX + 10}deg) rotateY(${s.rotateY + 15}deg); }
          }
        `).join('')}

        @keyframes hero-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};
