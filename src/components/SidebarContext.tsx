'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

type SidebarContextValue = {
  isDesktop: boolean;
  isOpenMobile: boolean;
  isCollapsedDesktop: boolean;
  toggle: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = (e: MediaQueryList | MediaQueryListEvent) => {
      const matches = 'matches' in e ? (e as MediaQueryListEvent).matches : (e as MediaQueryList).matches;
      setIsDesktop(matches);
      if (matches) {
        try {
          const saved = localStorage.getItem('sidebar:collapsed');
          setIsCollapsedDesktop(saved === '1');
        } catch {}
        setIsOpenMobile(false);
      } else {
        setIsOpenMobile(false);
      }
    };
    sync(mq);
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync as any);
    
    // Listen for sidebar toggle events from the header button
    const handleSidebarToggle = () => {
      toggle();
    };
    window.addEventListener('sidebar:toggle', handleSidebarToggle);
    
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', sync) : mq.removeListener(sync as any);
      window.removeEventListener('sidebar:toggle', handleSidebarToggle);
    };
  }, [isDesktop]);

  const toggle = useCallback(() => {
    if (isDesktop) {
      setIsCollapsedDesktop((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('sidebar:collapsed', next ? '1' : '0');
        } catch {}
        return next;
      });
    } else {
      setIsOpenMobile((prev) => !prev);
    }
  }, [isDesktop]);

  const value = useMemo<SidebarContextValue>(
    () => ({ isDesktop, isOpenMobile, isCollapsedDesktop, toggle, closeMobile: () => setIsOpenMobile(false) }),
    [isDesktop, isOpenMobile, isCollapsedDesktop, toggle]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}


