import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-red-100 border-2 border-red-400 rounded-none px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-red-600" />
        <span className="text-red-700 text-sm font-medium">
          You're offline - any changes you make will not be saved until you're back online.
        </span>
      </div>
    </div>
  );
}
