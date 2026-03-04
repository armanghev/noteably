"use client";

import { AppSidebar } from "@/components/layout/Sidebar";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SIDEBAR_STORAGE_KEY = "sidebar-open";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, profileCompleted, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setOpen(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(open));
      document.documentElement.setAttribute("data-sidebar-open", String(open));
    }
  }, [open, mounted]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const searchParams = new URLSearchParams();
      // Only set returnTo if it's not the root or dashboard to keep URLs clean
      if (pathname !== "/" && pathname !== "/dashboard") {
        searchParams.set("returnTo", pathname);
        router.replace(`/login?${searchParams.toString()}`);
      } else {
        router.replace("/login");
      }
      return;
    }

    if (user?.user_metadata?.deleted_at) {
      router.replace("/recover-account");
      return;
    }

    if (!profileCompleted) {
      router.replace("/login");
      return;
    }
  }, [isAuthenticated, loading, profileCompleted, user, router, pathname]);

  if (loading || !isAuthenticated || !profileCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background flex font-sans w-full")}>
      <Sidebar open={open} setOpen={setOpen}>
        <AppSidebar />
      </Sidebar>
      <main className="flex-1 p-4 lg:p-8 rounded-3xl border-l border-l-accent w-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
