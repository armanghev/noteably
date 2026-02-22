import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/api/services/auth";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export function ChangePassword() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const providers: string[] = user?.app_metadata?.providers ?? [];
  const hasPassword = providers.includes("email");

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  function handleOpen() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    setOpen(true);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setError(null);
    setSuccess(false);
  }

  function getValidationError(): string | null {
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) return strengthError;
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    if (hasPassword && newPassword === currentPassword)
      return "New password must be different from your current password.";
    return null;
  }

  async function handleSubmit() {
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (hasPassword && !currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (hasPassword) {
        await authService.changePassword(currentPassword, newPassword);
      } else {
        await authService.setPassword(newPassword);
      }
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to update password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Password</h3>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {hasPassword ? "••••••••••••" : "No password set — you sign in with OAuth."}
          </p>
          <Button variant="outline" size="sm" onClick={handleOpen}>
            {hasPassword ? "Change" : "Set Password"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md border-border">
          {success ? (
            <>
              <DialogHeader>
                <DialogTitle>{hasPassword ? "Password Changed" : "Password Set"}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  {hasPassword
                    ? "Your password has been changed successfully."
                    : "Your password has been set successfully."}
                </p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{hasPassword ? "Change Password" : "Set Password"}</DialogTitle>
                <DialogDescription>
                  {hasPassword
                    ? "Enter your current password and choose a new one."
                    : "Add a password to your account alongside your OAuth login."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {hasPassword && (
                  <div className="space-y-1.5">
                    <Label htmlFor="current_password_pw">Current Password</Label>
                    <Input
                      id="current_password_pw"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                      autoComplete="current-password"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hasPassword ? "Change Password" : "Set Password"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
