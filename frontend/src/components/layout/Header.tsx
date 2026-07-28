import React from 'react';
import { Shield, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  loading: boolean;
  error: string | null;
  currentUser: { username?: string; role?: string } | null;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  loading,
  error,
  currentUser,
  onToggleSidebar,
  onLogout,
}) => {
  return (
    <header className="flex items-center justify-between p-4 mb-6 bg-white/80 rounded-lg shadow-sm border">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden inline-flex items-center p-2 rounded-md hover:bg-slate-100"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <Shield className="text-sky-600" size={20} />
        <span className="text-sm font-semibold text-slate-800">Préfecture Porte 407</span>
        {loading && <span className="text-sm text-sky-600 font-medium">• Sync…</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-slate-50 rounded-full px-3 py-1 border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-bold shadow-sm">
            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-bold text-slate-800">{currentUser?.username || 'Utilisateur'}</span>
            <span className="text-xs text-slate-500 uppercase">
              {currentUser?.role === 'admin' ? 'Administrateur' : 'Agent'}
            </span>
          </div>
        </div>
        <button
          className="w-9 h-9 rounded-full border bg-white text-slate-700 flex items-center justify-center"
          onClick={onLogout}
          title="Déconnexion"
        >
          <LogOut size={16} />
        </button>
      </div>
      {error && (
        <div className="w-full bg-red-100 border border-red-200 text-red-700 p-2 rounded-md text-sm text-center mt-3">
          {error}
        </div>
      )}
    </header>
  );
};
