import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api/client";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type State = "loading" | "set_password" | "setting_password" | "success" | "error";

export default function SecurityAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState("");
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
      .then(async (res) => {
        const data = res.data;
        if (data?.action_type === "password_change" && data?.reset_session_token) {
          // Sign out the local session, then show the password-set form
          await supabase.auth.signOut();
          setResetToken(data.reset_session_token);
          setState("set_password");
        } else {
          // email_change or generic — just show the success message
          setSuccessMsg(data?.message ?? "Your account has been secured.");
          await supabase.auth.signOut();
          setState("success");
        }
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

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setState("setting_password");
    try {
      const res = await apiClient.post("/auth/security-set-password", {
        reset_session_token: resetToken,
        new_password: newPassword,
      });
      setSuccessMsg(res.data?.message ?? "Password updated successfully. You can now log in.");
      setState("success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to set password. The link may have expired.";
      setFormError(msg);
      setState("set_password");
    }
  }

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

            {(state === "set_password" || state === "setting_password") && (
              <div className="flex flex-col gap-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">Set a New Password</h2>
                  <p className="text-sm text-muted-foreground">
                    Your account has been secured. All sessions have been signed out.
                    Please set a new password to regain access.
                  </p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="pr-10"
                        required
                        disabled={state === "setting_password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="pr-10"
                        required
                        disabled={state === "setting_password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {formError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={state === "setting_password"}>
                    {state === "setting_password" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                    ) : (
                      "Set New Password"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {state === "success" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Account Secured</h2>
                  <p className="text-sm text-muted-foreground">{successMsg}</p>
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
