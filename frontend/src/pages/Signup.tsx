import { UserAvatar } from "@/components/profile/UserAvatar";
import { ImageCropper } from "@/components/shared/ImageCropper";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { authService } from "@/lib/api/services/auth";
import { supabase } from "@/lib/supabase";
import type { ApiError } from "@/types";
import {
  Camera,
  Check,
  FileText,
  FlaskConical,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

// Floating UI card component for the brand panel
function FloatingCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl ${className}`}
      style={{
        animation: `float 6s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function Signup() {
  // Signup step
  const [step, setStep] = useState<"signup" | "profile">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEmailForm, setIsEmailForm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Profile step
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { register, loading, user, refreshUser, profileCompleted } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth return: if user is authenticated but profile not completed, show profile step
  useEffect(() => {
    if (user && !profileCompleted && searchParams.get("oauth") === "1") {
      setStep("profile");
      // Pre-fill name from OAuth metadata
      const meta = user.user_metadata;
      if (meta?.given_name) setFirstName(meta.given_name as string);
      if (meta?.family_name) setLastName(meta.family_name as string);
      if (!meta?.given_name && meta?.full_name) {
        const parts = (meta.full_name as string).split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
    } else if (user && profileCompleted) {
      // Already completed profile, go to dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [user, profileCompleted, searchParams, navigate]);

  const oauthAvatar =
    user?.user_metadata?.picture ?? user?.user_metadata?.avatar_url ?? null;
  const displayAvatar = previewUrl ?? oauthAvatar;

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      await authService.signInWithGoogle();
    } catch (error) {
      setGoogleLoading(false);
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      }
    }
  };

  const handleAppleSignUp = () => {
    handleError({ message: "Apple Sign-In is coming soon!" });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      handleError({ message: "Passwords do not match" });
      return;
    }
    try {
      await register({ email, password });
      setStep("profile");
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      } else {
        handleError(new Error(String(error)));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleCrop = (blob: Blob) => {
    setCroppedBlob(blob);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      handleError({ message: "First name and last name are required" });
      return;
    }
    try {
      setProfileLoading(true);
      await authService.completeProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || undefined,
      });
      if (croppedBlob && user) {
        const filePath = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, croppedBlob, {
            upsert: true,
            contentType: "image/jpeg",
          });
        if (!uploadError) {
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          await supabase.auth.updateUser({
            data: { picture: data.publicUrl, avatar_url: null },
          });
        }
      }
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      } else {
        handleError(new Error(String(error)));
      }
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary via-primary/90 to-emerald-700 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Logo */}
          <div>
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-serif font-bold text-white">
                Noteably
              </span>
            </Link>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center pb-12 mb-auto">
            <h1 className="text-4xl xl:text-5xl font-serif font-bold text-white mb-6 leading-tight">
              Study smarter,
              <br />
              not harder
            </h1>
            <p className="text-lg text-white/70 mb-12 max-w-md">
              Join thousands of students who are transforming their learning
              with AI-powered study materials.
            </p>

            {/* Floating UI mockups */}
            <div className="relative h-64 xl:h-80">
              {/* Flashcard preview */}
              <FloatingCard
                className="absolute top-0 left-0 p-4 w-56"
                delay={0}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-medium text-white/80">
                    Flashcards
                  </span>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-sm text-white font-medium">
                    What is photosynthesis?
                  </p>
                </div>
                <div className="mt-2 text-xs text-white/50">Tap to flip</div>
              </FloatingCard>

              {/* Notes preview */}
              <FloatingCard
                className="absolute top-8 right-0 xl:right-12 p-4 w-52"
                delay={1}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-blue-300" />
                  <span className="text-xs font-medium text-white/80">
                    Smart Notes
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-white/20 rounded w-full" />
                  <div className="h-2 bg-white/20 rounded w-4/5" />
                  <div className="h-2 bg-white/20 rounded w-3/5" />
                </div>
              </FloatingCard>

              {/* Quiz preview */}
              <FloatingCard
                className="absolute bottom-0 left-16 p-4 w-60"
                delay={2}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-purple-300" />
                  <span className="text-xs font-medium text-white/80">
                    Quiz
                  </span>
                </div>
                <p className="text-sm text-white mb-2">
                  Which process converts CO₂?
                </p>
                <div className="space-y-1.5">
                  <div className="bg-white/10 rounded px-2 py-1 text-xs text-white/70">
                    A. Respiration
                  </div>
                  <div className="flex items-center justify-between bg-emerald-500/30 border border-emerald-400/50 rounded px-2 py-1 text-xs text-white">
                    <span>B. Photosynthesis</span> <Check size={15} />
                  </div>
                </div>
              </FloatingCard>

              {/* Nota AI assistant */}
              <FloatingCard
                className="absolute bottom-4 right-0 xl:right-4 p-4 w-56"
                delay={2.5}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                    Nota
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <img
                    src="/nota.png"
                    alt="Nota"
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-white/30 flex-shrink-0"
                  />
                  <div className="bg-white/15 rounded-2xl rounded-bl-sm px-3 py-2">
                    <p className="text-sm text-white">Ready to study?</p>
                  </div>
                </div>
              </FloatingCard>
            </div>
          </div>

          {/* Benefits list */}
          <div className="space-y-3 min-h-[88px]">
            {[
              "Upload any lecture, video, or PDF",
              "AI generates notes, flashcards & quizzes",
              "Study anywhere, anytime",
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/80 text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-serif font-bold text-foreground">
                Noteably
              </span>
            </Link>
          </div>

          {step === "signup" ? (
            <div className="animate-stepIn">
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-foreground mb-2">
                  Create an account
                </h1>
                <p className="text-muted-foreground">
                  Get started with Noteably for free.
                </p>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading || loading}
                  className="w-full py-6 rounded-xl font-medium flex items-center justify-center gap-3 border-border/60 hover:bg-muted/50"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAppleSignUp}
                  disabled={loading}
                  className="w-full py-6 rounded-xl font-medium flex items-center justify-center gap-3 border-border/60 hover:bg-muted/50 opacity-60"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                  <span className="text-xs text-muted-foreground">(Soon)</span>
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              {/* Email form */}
              {!isEmailForm ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEmailForm(true)}
                  className="w-full py-6 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                >
                  Sign up with email
                </Button>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div
                    className="animate-slideDown"
                    style={{ animationDelay: "0ms" }}
                  >
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
                      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <div
                    className="animate-slideDown"
                    style={{ animationDelay: "50ms" }}
                  >
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
                      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <div
                    className="animate-slideDown"
                    style={{ animationDelay: "100ms" }}
                  >
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
                      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <div
                    className="animate-slideDown"
                    style={{ animationDelay: "150ms" }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full py-6 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </form>
              )}

              <p className="text-center mt-8 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <p className="text-center mt-4 text-xs text-muted-foreground/70">
                By signing up, you agree to our{" "}
                <Link
                  to="/terms"
                  className="underline hover:text-muted-foreground"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="underline hover:text-muted-foreground"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          ) : (
            /* Profile step */
            <div className="animate-stepIn">
              {cropSrc && (
                <ImageCropper
                  imageSrc={cropSrc}
                  onCrop={handleCrop}
                  onCancel={() => {
                    URL.revokeObjectURL(cropSrc);
                    setCropSrc(null);
                  }}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="mb-8">
                <h1 className="text-3xl font-serif text-foreground mb-2">
                  Complete your profile
                </h1>
                <p className="text-muted-foreground">
                  Just a few details to get started.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Avatar */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group focus:outline-none"
                    aria-label="Choose profile photo"
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                      <UserAvatar
                        src={displayAvatar}
                        name={`${firstName} ${lastName}`.trim() || "?"}
                        className="w-full h-full"
                        textClassName="text-3xl"
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card shadow-sm transition-transform group-hover:scale-110">
                      <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  </button>
                </div>
                <p className="text-center text-xs text-muted-foreground -mt-2">
                  {displayAvatar
                    ? "Tap to change photo"
                    : "Tap to add a photo (optional)"}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-foreground mb-2"
                      htmlFor="firstName"
                    >
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
                      disabled={profileLoading}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-foreground mb-2"
                      htmlFor="lastName"
                    >
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
                      disabled={profileLoading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-foreground mb-2"
                    htmlFor="phone"
                  >
                    Phone number{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                    placeholder="+1 (555) 123-4567"
                    disabled={profileLoading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    profileLoading || !firstName.trim() || !lastName.trim()
                  }
                  className="w-full py-6 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
          opacity: 0;
        }
        .animate-stepIn {
          animation: stepIn 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
