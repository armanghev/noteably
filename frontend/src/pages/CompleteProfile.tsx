import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { authService } from "@/lib/api/services/auth";
import type { ApiError } from "@/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill from OAuth user_metadata (Google provides given_name / family_name / full_name)
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (meta.given_name && !firstName) setFirstName(meta.given_name as string);
      if (meta.family_name && !lastName) setLastName(meta.family_name as string);
      // Also try full_name as fallback
      if (!meta.given_name && meta.full_name && !firstName) {
        const parts = (meta.full_name as string).split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      // If profile is already completed, redirect to dashboard
      if (meta.profile_completed) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      handleError({ message: "First name and last name are required" });
      return;
    }
    try {
      setLoading(true);
      await authService.completeProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || undefined,
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      } else {
        handleError(new Error(String(error)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md rounded-3xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif text-foreground mb-3">
            Complete your profile
          </h1>
          <p className="text-muted-foreground">
            Just a few more details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="firstName">
                First name *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="John"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="lastName">
                Last name *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="Doe"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="phone">
              Phone number <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              placeholder="+1 (555) 123-4567"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !firstName.trim() || !lastName.trim()}
            className="w-full py-6 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
