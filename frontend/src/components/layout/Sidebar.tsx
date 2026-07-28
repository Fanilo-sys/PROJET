import React from 'react';
import {
  LayoutDashboard, Users, Database,
  Clock, CheckCircle, AlertCircle,
  Send, Archive, History,
  Inbox, Layers, Copy, AlertTriangle,
} from 'lucide-react';
import { TabId } from '../../types';

interface NavItem {
  id: TabId | 'separator1';
  label: string;
  icon: React.ReactNode | null;
  color?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: <LayoutDashboard size={16} /> },
  { id: 'reception', label: 'Réception', icon: <Inbox size={15} /> },
  { id: 'en_attente', label: 'En Pile', icon: <Layers size={15} /> },
  { id: 'en_cours', label: 'En Cours', icon: <Clock size={15} /> },
  { id: 'livraison', label: 'Prêt / Signé', icon: <CheckCircle size={15} /> },
  { id: 'separator1', label: '—', icon: null },
  { id: 'annuaire', label: 'Annuaire Assos', icon: <Users size={15} /> },
  { id: 'registre_chrono', label: 'Registre Chrono', icon: <Database size={15} /> },
  { id: 'defavorable', label: 'Stock Défavorable', icon: <AlertCircle size={15} />, color: 'text-red-300' },
  { id: 'historique_defavorable', label: 'Hist. Défavorable', icon: <History size={15} /> },
  { id: 'historique_sortie', label: 'Hist. Sortie', icon: <Send size={15} /> },
  { id: 'historique_arrivee', label: 'Hist. Arrivée', icon: <Archive size={15} /> },
  { id: 'audit', label: '📋 Journal d\'audit', icon: <History size={15} /> },
];

interface SidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  sidebarOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  sidebarOpen,
  onClose,
  onReset,
}) => {
  return (
    <>
      <aside
        className={`z-40 transform transition-transform duration-200 bg-gradient-to-b from-sky-900 to-sky-800 text-white p-4 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-0'
        } md:w-64`}
      >
        <div className="flex items-center gap-3 mb-4 px-1">
          <Archive className="text-cyan-400" size={22} />
          <span className="text-sm font-extrabold tracking-wider text-white">Préfecture Porte 407</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.id === 'separator1') {
              return <hr key={item.id} className="border-t border-slate-700 my-4" />;
            }
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 text-left ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-sky-100 hover:bg-sky-600/10'
                }`}
                onClick={() => {
                  onTabChange(item.id as TabId);
                  // Fermer le sidebar sur mobile après navigation
                  if (window.innerWidth < 900) onClose();
                }}
              >
                <span className={item.color || (isActive ? 'text-white' : 'text-sky-100')}>
                  {item.icon}
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={onReset}
          className="mt-auto w-full py-2 px-3 rounded-lg border border-red-500 text-red-300 hover:bg-red-600/20 flex items-center gap-2"
        >
          <AlertTriangle className="text-red-300" size={15} />
          <span className="hidden md:inline">Réinitialiser tout</span>
        </button>
      </aside>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};