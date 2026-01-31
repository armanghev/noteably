import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { ApiError } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, loading } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      handleError({ message: "Passwords do not match" });
      return;
    }

    try {
      await register({ email, password });
      navigate("/login", {
        replace: true,
        state: {
          message: "Account created! Please check your email to verify.",
        },
      });
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      } else {
        handleError(new Error(String(error)));
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md rounded-3xl shadow-xl p-8 md:p-12 relative">
        <Link
          to="/"
          className="absolute top-8 left-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>

        <div className="text-center mb-10 mt-4">
          <h1 className="text-3xl font-serif text-foreground mb-3">
            Create an account
          </h1>
          <p className="text-muted-foreground">
            Enter your details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              placeholder="student@university.edu"
              required
              disabled={loading}
            />
          </div>
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
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-foreground mb-2"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <p className="text-center mt-8 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
