import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import apiClient from "@/lib/api/client";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type State = "loading" | "success" | "error";

export default function SecurityAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setErrorMsg("No security token provided.");
      setState("error");
      return;
    }

    apiClient
      .post("/auth/security-action", { token })
      .then(() => {
        setState("success");
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Invalid or expired security link. Your account may have already been secured.";
        setErrorMsg(msg);
        setState("error");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-8 pb-8">
            {state === "loading" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Securing your account…</p>
              </div>
            )}

            {state === "success" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Account Secured</h2>
                  <p className="text-sm text-muted-foreground">
                    Your account has been secured. Your password has been reset and all
                    sessions have been logged out.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please use <span className="font-medium text-foreground">Forgot Password</span> on
                    the login page to set a new password and regain access.
                  </p>
                </div>
                <Button className="mt-2" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              </div>
            )}

            {state === "error" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Action Failed</h2>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
