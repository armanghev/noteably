import { useState, useEffect, ReactNode } from 'react';
import { Sidebar } from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { AppSidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'sidebar-open';

export default function Layout({ children }: LayoutProps) {
  // Initialize state from data attribute (set by pre-hydration script) or localStorage
  const [open, setOpen] = useState(() => {
    // First check the data attribute set by the pre-hydration script
    const dataAttr = document.documentElement.getAttribute('data-sidebar-open');
    if (dataAttr !== null) {
      return dataAttr === 'true';
    }
    // Fallback to localStorage
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored !== null ? JSON.parse(stored) : true;
  });

  // Save to localStorage and update data attribute whenever state changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(open));
    document.documentElement.setAttribute('data-sidebar-open', String(open));
  }, [open]);

  return (
    <div className={cn("min-h-screen bg-background flex font-sans w-full")}>
      <Sidebar open={open} setOpen={setOpen}>
        <AppSidebar />
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 rounded-3xl border-l border-l-accent">
        {children}
      </main>
    </div>
  );
}
