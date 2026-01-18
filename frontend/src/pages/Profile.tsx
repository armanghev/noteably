import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Monitor, Bell, Moon, Sun } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/theme-provider";

export default function Profile() {
    const { user, logout } = useAuth();

    if (!user) return null;

    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const email = user.email;
    const avatarUrl = user.user_metadata?.avatar_url;
    const initials = fullName.charAt(0).toUpperCase();

    const { theme, setTheme } = useTheme();

    const handleLogout = async () => {
        await logout();
        // Redirect handled by AuthContext/Router
    };

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
                    </TabsList>

                    <TabsContent value="general">
                        <Card className="bg-card border-border shadow-sm">
                            <CardHeader className="flex flex-row items-center gap-6 pb-6 border-b border-border">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                                    ) : (
                                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                            {initials}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
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
                                    <Button variant="destructive" onClick={handleLogout} className="flex items-center gap-2">
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
                                            variant={theme === 'light' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setTheme('light')}
                                            className="rounded-full px-3 h-8"
                                        >
                                            <Sun className="w-4 h-4 mr-2" />
                                            Light
                                        </Button>
                                        <Button
                                            variant={theme === 'dark' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setTheme('dark')}
                                            className="rounded-full px-3 h-8"
                                        >
                                            <Moon className="w-4 h-4 mr-2" />
                                            Dark
                                        </Button>
                                        <Button
                                            variant={theme === 'system' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setTheme('system')}
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
                </Tabs>
            </div>
        </Layout>
    );
}
