import Layout from "@/components/layout/Layout";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Sun,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { APIKeys } from "@/components/profile/APIKeys";

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const email = user.email;
  const avatarUrl = user.user_metadata?.avatar_url;
  const initials = fullName.charAt(0).toUpperCase();

  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    // Redirect handled by AuthContext/Router
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
            avatar_url: publicUrl + "?t=" + Math.floor(Date.now() / 1000),
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
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl font-serif text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings.</p>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-4 bg-background border border-border/50">
            <TabsTrigger value="general">General</TabsTrigger>
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
                  <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                    {avatarUrl ? (
                      <AvatarImage
                        key={avatarUrl}
                        src={avatarUrl}
                        alt={fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
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

                <div className="pt-4 flex justify-end">
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

          <TabsContent value="settings" className="space-y-6">
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
                      onClick={() => setTheme("light")}
                      className="rounded-full px-3 h-8"
                    >
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="rounded-full px-3 h-8"
                    >
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTheme("system")}
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
            <APIKeys />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
