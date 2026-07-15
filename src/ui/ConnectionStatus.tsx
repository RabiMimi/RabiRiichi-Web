import React from 'react';
import { useConnectionStatus, usePing } from '../state/store';
import type { ConnectionStatus } from '../net/client';

interface SignalIconProps {
  ping: number;
  connStatus: ConnectionStatus;
}

function SignalIcon({ ping, connStatus }: SignalIconProps): React.JSX.Element {
  let activeBars = 0;
  let color = '#888'; // disconnected

  if (connStatus === 'connected' && ping >= 0) {
    if (ping <= 150) {
      activeBars = 4;
      color = '#00ff00'; // green
    } else if (ping <= 300) {
      activeBars = 3;
      color = '#99ff33'; // light green
    } else if (ping <= 500) {
      activeBars = 2;
      color = '#ffcc00'; // yellow
    } else {
      activeBars = 1;
      color = '#ff3333'; // red
    }
  }

  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      style={{ display: 'block' }}
    >
      <rect
        x="0"
        y="11"
        width="3"
        height="3"
        rx="0.5"
        fill={activeBars >= 1 ? color : '#444'}
      />
      <rect
        x="5"
        y="8"
        width="3"
        height="6"
        rx="0.5"
        fill={activeBars >= 2 ? color : '#444'}
      />
      <rect
        x="10"
        y="4"
        width="3"
        height="10"
        rx="0.5"
        fill={activeBars >= 3 ? color : '#444'}
      />
      <rect
        x="15"
        y="0"
        width="3"
        height="14"
        rx="0.5"
        fill={activeBars >= 4 ? color : '#444'}
      />
    </svg>
  );
}

export function ConnectionStatusIndicator(): React.JSX.Element {
  const connStatus = useConnectionStatus();
  const ping = usePing();

  return (
    <div className="pointer-events-auto absolute top-5 right-5 z-[50] flex items-center gap-2 rounded-lg border-[1.5px] border-[#444] bg-[#141414]/85 px-3 py-2 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
      <span className="font-mono text-[0.9rem] font-bold">
        {connStatus === 'connecting'
          ? 'Connecting...'
          : connStatus === 'disconnected'
            ? 'Disconnected'
            : `${ping}ms`}
      </span>
      <SignalIcon ping={ping} connStatus={connStatus} />
    </div>
  );
}
