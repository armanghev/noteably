import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient as api } from "@/lib/api";
import { ROUTES } from "@/router/routes";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RecoverAccount() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is not logged in or not scheduled for deletion, redirect away
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!user.user_metadata?.deleted_at) {
      navigate(ROUTES.DASHBOARD);
      return;
    }
  }, [user, navigate]);

  const handleRecover = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/me/restore");
      await refreshUser();
      // After refresh, the deleted_at should be gone, and the effect above
      // or the AuthContext logic will redirect to dashboard
      navigate(ROUTES.DASHBOARD);
    } catch (err: any) {
      console.error("Failed to restore account:", err);
      setError(
        err.response?.data?.error ||
          "Failed to restore account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  if (!user || !user.user_metadata?.deleted_at) {
    return null; // or loading spinner while redirecting
  }

  const deletionDate = new Date(user.user_metadata.deleted_at);
  const scheduledDeletion = new Date(
    deletionDate.getTime() + 14 * 24 * 60 * 60 * 1000,
  ); // 14 days later

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">
              Account Scheduled for Deletion
            </CardTitle>
          </div>
          <CardDescription>
            Your account is currently scheduled for permanent deletion on{" "}
            {scheduledDeletion.toLocaleDateString()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can recover your account and all your data by clicking the
            button below. If you do nothing, your account will be permanently
            deleted.
          </p>
          {error && (
            <div className="text-sm font-medium text-destructive">{error}</div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full" onClick={handleRecover} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Recover Account
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel and Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
