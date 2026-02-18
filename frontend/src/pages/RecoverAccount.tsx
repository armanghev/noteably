import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/api/services/auth";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function RecoverAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const oauthComplete = searchParams.get("oauth_complete");
  const { user } = useAuth();

  const [step, setStep] = useState<
    "verifying" | "reset" | "oauth" | "success" | "error"
  >("verifying");
  const [recoveryToken, setRecoveryToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Validate password requirements
  const validatePassword = (
    password: string,
  ): { valid: boolean; errors: string[] } => {
    const errors = [];
    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("At least one uppercase letter");
    }
    if (!/\d/.test(password)) {
      errors.push("At least one digit");
    }
    return { valid: errors.length === 0, errors };
  };

  // Step 1: Verify recovery token on mount
  const verifyRecoveryToken = async () => {
    if (!token) {
      setErrorMessage("No recovery token found. Invalid recovery link.");
      setStep("error");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.recoverAccount(token);
      setRecoveryToken(response.recovery_session_token);
      setAuthProvider(response.auth_provider);
      // If OAuth user, show OAuth login instead of password reset
      const nextStep = response.auth_provider ? "oauth" : "reset";
      setStep(nextStep);
    } catch (error: any) {
      const message =
        error.response?.data?.error || "Failed to verify recovery token";
      setErrorMessage(message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setErrorMessage("Both password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setErrorMessage(`Password must meet: ${validation.errors.join(", ")}`);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await authService.confirmRecovery(recoveryToken, newPassword);
      setStep("success");
    } catch (error: any) {
      const message = error.message || "Failed to reset password";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback - complete recovery after user authenticates
  const completeOAuthRecovery = async (sessionToken: string) => {
    setLoading(true);
    try {
      await authService.confirmRecoveryOAuth(sessionToken);
      setStep("success");
    } catch (error: any) {
      const message = error.message || "Failed to complete recovery";
      setErrorMessage(message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google sign in for OAuth recovery
  const handleGoogleRecovery = async () => {
    try {
      setGoogleLoading(true);
      await authService.signInWithGoogleForRecovery(recoveryToken);
      // User will be redirected back to this page with oauth_complete=1 after auth
    } catch (error: any) {
      const message = error.message || "Failed to sign in with Google";
      setErrorMessage(message);
      setGoogleLoading(false);
    }
  };

  // Re-verify token on mount and check for OAuth callback
  useEffect(() => {
    if (oauthComplete && user && token) {
      // User just authenticated via OAuth, the token param is the recovery_session_token
      // Complete recovery directly (skip re-verification)
      completeOAuthRecovery(token);
    } else if (token && !oauthComplete) {
      // Initial page load with recovery token from email
      verifyRecoveryToken();
    }
  }, [token, oauthComplete, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        {step === "verifying" && (
          <>
            <CardHeader className="text-center">
              <CardTitle>Recovering Your Account</CardTitle>
              <CardDescription>
                Please wait while we verify your recovery link...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full" />
              </div>
            </CardContent>
          </>
        )}

        {step === "oauth" && (
          <>
            <CardHeader>
              <CardTitle>Verify Your Identity</CardTitle>
              <CardDescription>
                Sign in with {authProvider || "your provider"} to restore your
                account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account was created with {authProvider}. To complete the
                recovery process and verify you own this account, sign in with
                the same method.
              </p>
              <Button
                onClick={handleGoogleRecovery}
                className="w-full"
                disabled={googleLoading}
              >
                {googleLoading ? "Signing in..." : `Sign in with Google`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                After you authenticate, your account will be immediately
                restored.
              </p>
            </CardContent>
          </>
        )}

        {step === "reset" && (
          <>
            <CardHeader>
              <CardTitle>Reset Your Password</CardTitle>
              <CardDescription>
                Enter a new password to restore access to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                {errorMessage && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded text-sm flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-2 bg-muted/50 p-3 rounded">
                  <p className="text-xs font-medium text-foreground">
                    Password requirements:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• At least 8 characters</li>
                    <li>• At least one uppercase letter</li>
                    <li>• At least one digit</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Account Recovered</CardTitle>
              <CardDescription>
                Your account has been successfully restored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/10 text-primary-foreground p-4 rounded text-center text-sm">
                <span className="text-primary font-medium">
                  Your account is now active and your new password is set. You
                  can log in now.
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Click below to return to the login page.
              </p>
              <Button onClick={() => navigate("/login")} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </>
        )}

        {step === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Recovery Failed</CardTitle>
              <CardDescription>Unable to recover your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 text-destructive p-4 rounded text-sm">
                {errorMessage ||
                  "An error occurred during account recovery. The recovery link may have expired."}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                If you continue to have issues, please contact support at
                support@noteably.app
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
