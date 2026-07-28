import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count: number;
  gradient?: string;
  children?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  count,
  gradient = 'from-sky-500 to-cyan-500',
  children,
}) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <span>{title}</span>
          {subtitle && (
            <p className="text-xs font-medium text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="inline-flex items-center bg-sky-100 text-sky-800 text-sm font-bold px-2.5 py-0.5 rounded-full border-2 border-sky-200">
          {count}
        </span>
      </h2>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
};
