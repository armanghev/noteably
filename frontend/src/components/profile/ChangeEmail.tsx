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
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";

type DialogState = "idle" | "form" | "confirmation_sent";

export function ChangeEmail() {
  const { user } = useAuth();
  const [dialogState, setDialogState] = useState<DialogState>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = user?.app_metadata ?? {};
  const providers: string[] = meta.providers ?? [];
  const hasPassword = providers.includes("email");

  function handleOpen() {
    setNewEmail("");
    setCurrentPassword("");
    setError(null);
    setDialogState("form");
  }

  function handleClose() {
    setDialogState("idle");
    setError(null);
  }

  async function handleSubmit() {
    if (!newEmail || !currentPassword) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.requestEmailChange(newEmail, currentPassword);
      setDialogState("confirmation_sent");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to send confirmation email.";
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
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Email Address</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpen}
              disabled={!hasPassword}
              title={!hasPassword ? "Set a password first to change your email." : undefined}
            >
              Change
            </Button>
          </div>
          {!hasPassword && (
            <p className="text-xs text-muted-foreground">
              Set a password first to change your email address.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogState !== "idle"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md border-border">
          {dialogState === "form" && (
            <>
              <DialogHeader>
                <DialogTitle>Change Email Address</DialogTitle>
                <DialogDescription>
                  Enter your new email address and current password to confirm.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="new_email">New Email Address</Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="current_password_email">Current Password</Label>
                  <Input
                    id="current_password_email"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Your current password"
                    autoComplete="current-password"
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
                  Send Confirmation
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogState === "confirmation_sent" && (
            <>
              <DialogHeader>
                <DialogTitle>Check Your Email</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  A confirmation link has been sent to{" "}
                  <span className="font-medium text-foreground">{newEmail}</span>. Click the link to
                  complete your email change.
                </p>
                <p className="text-xs text-muted-foreground">
                  You'll also receive a security notification at your current email address.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
