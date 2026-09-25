import type { Socket } from 'socket.io-client';
import type { UnreadCounts } from 'src/api/unread-counts';

import React, { useMemo, useContext, createContext } from 'react';

import { useUnreadCounts } from './useUnreadCounts';

// ----------------------------------------------------------------------

type UnreadCountsContextType = {
  unreadCounts: UnreadCounts;
  refreshUnreadCounts: () => Promise<void>;
};

const UnreadCountsContext = createContext<UnreadCountsContextType | undefined>(undefined);

export const useUnreadCountsContext = () => {
  const context = useContext(UnreadCountsContext);
  if (!context) {
    throw new Error('useUnreadCountsContext must be used within a UnreadCountsProvider');
  }
  return context;
};

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
  socket?: Socket | null;
};

export function UnreadCountsProvider({ children, socket }: Props) {
  const { unreadCounts, refreshUnreadCounts } = useUnreadCounts({ socket });

  const memoizedValue = useMemo(
    () => ({
      unreadCounts,
      refreshUnreadCounts,
    }),
    [unreadCounts, refreshUnreadCounts]
  );

  return (
    <UnreadCountsContext.Provider value={memoizedValue}>
      {children}
    </UnreadCountsContext.Provider>
  );
}
