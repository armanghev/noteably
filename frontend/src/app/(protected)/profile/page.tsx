"use client";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/api/services/auth";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Sun,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { APIKeys } from "@/components/profile/APIKeys";
import { AccountSettings } from "@/components/profile/AccountSettings";
import { CloudStorageSettings } from "@/components/profile/CloudStorageSettings";
import { ChangeEmail } from "@/components/profile/ChangeEmail";
import { ChangePassword } from "@/components/profile/ChangePassword";
import { ROUTES } from "@/router/routes";

export default function Profile() {
  const { user, logout, refreshUser, session } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setLoadingProfile(true);
      const data = await authService.getCurrentUser();
      setProfileData(data);
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoadingProfile(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) return null;

  const fullName =
    user.user_metadata?.first_name + " " + user.user_metadata?.last_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0];
  const email = user.email;
  const avatarUrl =
    user.user_metadata?.picture ?? user.user_metadata?.avatar_url;

  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    // Redirect handled by AuthContext/Router
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await authService.deleteAccount();
      await logout();
      router.push(ROUTES.ACCOUNT_DELETED);
    } catch (error) {
      console.error("Account deletion failed:", error);
      setDeleting(false);
    }
  };

  const resizeImage = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Center-crop to fit 400x400
        const scale = Math.max(400 / img.width, 400 / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (400 - scaledWidth) / 2;
        const y = (400 - scaledHeight) / 2;

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploading(true);
        const blob = await resizeImage(file);

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`${user.id.toLowerCase()}/avatar.jpg`, blob, {
            upsert: true,
            contentType: "image/jpeg",
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("avatars")
          .getPublicUrl(`${user.id.toLowerCase()}/avatar.jpg`);

        await supabase.auth.updateUser({
          data: {
            picture: publicUrl + "?t=" + Math.floor(Date.now() / 1000),
            avatar_url: null,
          },
        });

        await refreshUser();
      } catch (error) {
        console.error("Avatar upload failed:", error);
      } finally {
        setUploading(false);
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [user.id, resizeImage, refreshUser],
  );

  return (
<>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl font-serif text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings.</p>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4 bg-background border border-border/50">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="developers">Developers</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="flex flex-row items-center gap-6 pb-6 border-b border-border">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UserAvatar
                    src={avatarUrl}
                    name={fullName}
                    className="h-24 w-24 border-4 border-background shadow-md"
                    textClassName="text-2xl"
                  />
                  <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background group-hover:scale-110 transition-transform">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">{fullName}</h2>
                  <p className="text-muted-foreground">{email}</p>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <div className="p-3 bg-secondary/50 rounded-md text-sm text-foreground">
                    {email}
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    User ID
                  </label>
                  <div className="p-3 bg-secondary/50 rounded-md text-sm text-foreground font-mono">
                    {user.id}
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={(open) => {
                      if (deleting && !open) return;
                      setDeleteDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="border-border"
                      onInteractOutside={(e) => {
                        if (deleting) e.preventDefault();
                      }}
                      onEscapeKeyDown={(e) => {
                        if (deleting) e.preventDefault();
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription className="space-y-3">
                          <div>
                            <strong>
                              Your account will be locked immediately
                            </strong>
                            , but your data will be preserved for 14 days. You
                            can recover your account during this grace period.
                          </div>
                          <div>
                            <strong>What happens:</strong>
                            <ul className="list-disc ml-4 mt-2 space-y-1 text-sm">
                              <li>
                                We'll send you a recovery email with a link
                              </li>
                              <li>
                                Click the link and set a new password to restore
                                access
                              </li>
                              <li>
                                After 14 days, your account and all data will be
                                permanently deleted
                              </li>
                            </ul>
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteDialogOpen(false)}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Delete Account
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <AccountSettings />
            <ChangeEmail />
            <ChangePassword />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <CloudStorageSettings initialConnections={profileData?.cloud_connections} />

            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Appearance
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred interface theme.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-full border border-border">
                    <Button
                      variant={theme === "light" ? "default" : "ghost"}
                      size="sm"
                      onClick={(e) => setTheme("light", { x: e.clientX, y: e.clientY })}
                      className="rounded-full px-3 h-8"
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "ghost"}
                      size="sm"
                      onClick={(e) => setTheme("dark", { x: e.clientX, y: e.clientY })}
                      className="rounded-full px-3 h-8"
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "ghost"}
                      size="sm"
                      onClick={(e) => setTheme("system", { x: e.clientX, y: e.clientY })}
                      className="rounded-full px-3 h-8"
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about your account activity.
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about new features and offers.
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="developers" className="space-y-6">
            <APIKeys initialKeys={profileData?.api_keys} />
          </TabsContent>
        </Tabs>
      </div>
</>
);
}
