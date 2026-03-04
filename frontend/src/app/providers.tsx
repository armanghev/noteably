"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Correction:
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="noteably-theme">
        <AuthProvider>
          <WebSocketProvider>
            {children}
            <SonnerToaster />
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
