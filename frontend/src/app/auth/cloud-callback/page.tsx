"use client";
import { Suspense } from "react";


import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Dedicated OAuth callback for cloud connect popup. Loads outside ProtectedRoute
 * so it runs immediately without auth loading delay. Detects popup=1, invalidates
 * connections, and closes the window.
 */
function CloudOAuthCallbackContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get("popup") !== "1") return;
    // Only way to reach this URL is from our OAuth callback redirect - safe to close.
    queryClient.invalidateQueries({ queryKey: ["cloud-connections"] });
    try {
      window.opener?.postMessage?.({ type: "cloud-oauth-done" }, window.location.origin);
    } catch {
      /* postMessage not supported */
    }
    // Notify opener via BroadcastChannel (works when COOP clears window.opener)
    try {
      new BroadcastChannel("cloud-oauth").postMessage({ type: "cloud-oauth-done" });
    } catch {
      /* BroadcastChannel not supported */
    }
    window.close();
  }, [searchParams, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-muted-foreground">Connecting your account...</p>
    </div>
  );
}


export default function CloudOAuthCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CloudOAuthCallbackContent />
    </Suspense>
  );
}
