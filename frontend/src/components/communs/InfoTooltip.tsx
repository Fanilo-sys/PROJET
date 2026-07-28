import React, { useRef, useState, useEffect } from 'react';

interface InfoItem {
  label: string;
  value: string | React.ReactNode;
}

interface InfoTooltipProps {
  children: React.ReactNode;
  items: InfoItem[];
  className?: string;
  variant?: 'default' | 'siege';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ children, items, className, variant = 'default' }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 80;
      setPosition({
        top: rect.top - tooltipHeight - 12,
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleEnter = () => {
    // If this tooltip is inside another InfoTooltip, don't show it
    if (!wrapperRef.current) return;
    const ancestor = wrapperRef.current.parentElement?.closest('[data-info-tooltip="true"]');
    if (ancestor) return;
    updatePosition();
    setVisible(true);
  };

  useEffect(() => {
    if (!visible) return;
    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [visible]);

  return (
    <span
      ref={wrapperRef}
      data-info-tooltip="true"
      className={`inline-block relative ${className || ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setVisible(false)}
    >
      <span className={variant === 'siege' ? 'inline' : 'inline border-b border-dashed border-sky-300 hover:text-sky-600 transition'}>{children}</span>
      <div
        ref={tooltipRef}
        className={`info-tooltip fixed z-50 transition-opacity duration-150 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
      >
        <div className={`${variant === 'siege' ? 'bg-white text-slate-900 border border-slate-200 shadow-lg p-3 rounded-md min-w-[260px] max-w-[420px] font-mono text-sm break-words' : 'bg-slate-800 text-slate-100 p-3 rounded-lg text-sm leading-6 shadow-xl min-w-[220px] max-w-[380px] break-words'}`}>
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)' }}>
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 L8 8 L16 0 Z" fill={variant === 'siege' ? '#ffffff' : '#0f172a'} />
          </svg>
        </div>
          {items.map((item, idx) => (
            <div key={idx} className={`${variant === 'siege' ? 'flex flex-col gap-1' : 'flex flex-col gap-1'}`}>
              {variant === 'siege' ? (
                <>
                  <span className="text-xs font-semibold uppercase text-slate-500">{item.label}</span>
                  <div className="text-sm font-medium text-slate-900 break-words whitespace-pre-wrap">{item.value || '—'}</div>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold uppercase text-sky-300">{item.label}</span>
                  <span className="text-sm font-medium text-slate-100 break-words">{item.value || '—'}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </span>
  );
};
