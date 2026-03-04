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
import { useRef, useState } from "react";

// idle → otp_sent → enter_new_email → confirmation_sent
type DialogState = "idle" | "otp_sent" | "enter_new_email" | "confirmation_sent";

export function ChangeEmail() {
  const { user } = useAuth();
  const [dialogState, setDialogState] = useState<DialogState>("idle");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newEmail, setNewEmail] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleClose() {
    setDialogState("idle");
    setOtp(["", "", "", "", "", ""]);
    setNewEmail("");
    setError(null);
  }

  // Step 1: request OTP to current email
  async function handleRequestOtp() {
    setLoading(true);
    setError(null);
    try {
      await authService.requestEmailOtp();
      setOtp(["", "", "", "", "", ""]);
      setDialogState("otp_sent");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Failed to send verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // OTP input helpers
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  }

  // Step 2: verify OTP
  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyEmailOtp(code);
      setDialogState("enter_new_email");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid or expired code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  // Step 3: submit new email
  async function handleSubmitNewEmail() {
    if (!newEmail) {
      setError("Please enter your new email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.requestEmailChange(newEmail);
      setConfirmedEmail(newEmail);
      setDialogState("confirmation_sent");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.new_email?.[0] ||
        "Failed to send confirmation email."
      );
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
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Button variant="outline" size="sm" onClick={handleRequestOtp} disabled={loading}>
            {loading && dialogState === "idle" ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Change
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogState !== "idle"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md border-border">

          {/* Step 1: OTP entry */}
          {dialogState === "otp_sent" && (
            <>
              <DialogHeader>
                <DialogTitle>Verify Your Identity</DialogTitle>
                <DialogDescription>
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{user?.email}</span>. Enter it
                  below to continue.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Verification Code</Label>
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="h-12 w-10 rounded-lg border border-border bg-background text-center text-lg font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
                >
                  Didn't receive it? Resend code
                </button>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyOtp} disabled={loading || otp.join("").length < 6}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 2: New email entry */}
          {dialogState === "enter_new_email" && (
            <>
              <DialogHeader>
                <DialogTitle>Enter New Email Address</DialogTitle>
                <DialogDescription>
                  Identity verified. Enter the new email address you'd like to use.
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
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitNewEmail()}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitNewEmail} disabled={loading || !newEmail}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Confirmation
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 3: Confirmation sent */}
          {dialogState === "confirmation_sent" && (
            <>
              <DialogHeader>
                <DialogTitle>Check Your New Email</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  A confirmation link has been sent to{" "}
                  <span className="font-medium text-foreground">{confirmedEmail}</span>. Click
                  the link to complete your email change.
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
