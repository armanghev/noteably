"use client";
import { Suspense } from "react";


import { Card, CardContent } from "@/components/ui/card";
import apiClient from "@/lib/api/client";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type State = "loading" | "success" | "error";

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [newEmail, setNewEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setErrorMsg("No token provided.");
      setState("error");
      return;
    }

    apiClient
      .post("/auth/confirm-email-change", { token })
      .then((res) => {
        setNewEmail(res.data.new_email ?? "");
        setState("success");
        setTimeout(() => router.push("/profile"), 3000);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Invalid or expired confirmation link.";
        setErrorMsg(msg);
        setState("error");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-8 pb-8">
            {state === "loading" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Confirming your email change…</p>
              </div>
            )}

            {state === "success" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Email Changed</h2>
                  {newEmail && (
                    <p className="text-sm text-muted-foreground">
                      Your email has been updated to{" "}
                      <span className="font-medium text-foreground">{newEmail}</span>.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Redirecting to your profile…
                  </p>
                </div>
              </div>
            )}

            {state === "error" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Confirmation Failed</h2>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export default function ConfirmEmailChange() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}
