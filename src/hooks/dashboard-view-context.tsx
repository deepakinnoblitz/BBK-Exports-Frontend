import React, { useState, useEffect, useContext, useCallback, createContext } from 'react';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

type DashboardView = 'HR' | 'CRM';

type DashboardViewContextType = {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  isHRView: boolean;
  isCRMView: boolean;
};

const DashboardViewContext = createContext<DashboardViewContextType | undefined>(undefined);

export function DashboardViewProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [view, setView] = useState<DashboardView>(() => {
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-view');
      return (saved as DashboardView) || 'HR';
    }
    return 'HR';
  });

  useEffect(() => {
    if (user && user.roles) {
      const hasHR = user.roles.some((role: string) => role.toLowerCase() === 'hr');
      const hasCRM = user.roles.some((role: string) =>
        ['crm user', 'crm and sales'].includes(role.toLowerCase())
      );

      // If user has CRM roles but NOT HR role, force view to CRM
      if (hasCRM && !hasHR && view !== 'CRM') {
        setView('CRM');
      }
      // If user has HR role but NOT CRM roles, force view to HR
      else if (hasHR && !hasCRM && view !== 'HR') {
        setView('HR');
      }
    }
  }, [user, view]);

  const handleSetView = useCallback((newView: DashboardView) => {
    setView(newView);
    localStorage.setItem('dashboard-view', newView);
  }, []);

  const value = {
    view,
    setView: handleSetView,
    isHRView: view === 'HR',
    isCRMView: view === 'CRM',
  };

  return <DashboardViewContext.Provider value={value}>{children}</DashboardViewContext.Provider>;
}

export function useDashboardView() {
  const context = useContext(DashboardViewContext);
  if (context === undefined) {
    throw new Error('useDashboardView must be used within a DashboardViewProvider');
  }
  return context;
}
