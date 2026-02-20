import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function LinkAccount() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    try {
      setLoading(true);

      // Verify password by attempting a sign-in
      // Since we are already logged in (via Google), this checks if the password is valid for this email
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) throw error;

      // If successful, mark as verified
      localStorage.setItem(`oauth_link_verified_${user.id}`, "true");
      localStorage.removeItem("oauth_login_flow");

      toast.success("Account linked successfully");
      navigate("/dashboard");
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-sm p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-serif font-bold text-center text-foreground mb-2">
          Link your account
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          We found an existing account with this email. Please enter your
          password to link your Google account.
        </p>

        <form onSubmit={handleLink} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
              placeholder="Enter your password"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full py-6 rounded-xl font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Link Account"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-6 rounded-xl font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}
