import React from 'react';
import { InfoTooltip } from './InfoTooltip';

// Shared formatSiege used by Reception to display a single-line preview
// and a full value in a styled tooltip (shows full siege + district).
export const formatSiege = (d: { siege?: string; district?: string }): React.ReactNode => {
  const lines = (d.siege || '').split('\n');
  const full = lines.join(' · ') + (d.district ? ` — ${d.district}` : '');
  const preview = <>{lines[0]}{lines.length > 1 ? '…' : ''}{d.district ? ` — ${d.district}` : ''}</>;
  return (
    <InfoTooltip items={[{ label: 'Siège', value: full }]} variant="siege" className="">
      {preview}
    </InfoTooltip>
  );
};

export default formatSiege;
