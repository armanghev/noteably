import GoogleDriveIcon from "@/components/assets/GoogleDriveIcon";
import DropboxIcon from "@/components/assets/DropboxIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, Loader2 } from "lucide-react";
import { cloudService, type CloudProvider } from "@/lib/api/services/cloud";

const PROVIDERS: Array<{
  id: CloudProvider;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { id: "google_drive", name: "Google Drive", icon: GoogleDriveIcon },
  { id: "dropbox", name: "Dropbox", icon: DropboxIcon },
];

export function CloudStorageSettings({ initialConnections }: { initialConnections?: any[] }) {
  const queryClient = useQueryClient();
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["cloud-connections"],
    queryFn: () => cloudService.getConnections(),
    initialData: initialConnections,
  });

  const connectedSet = new Set(
    connections.filter((c) => c.connected).map((c) => c.provider),
  );
  const chooserOnlySet = new Set(
    connections.filter((c) => c.chooser_only).map((c) => c.provider),
  );

  const [connecting, setConnecting] = useState<CloudProvider | null>(null);

  const handleConnect = async (provider: CloudProvider) => {
    try {
      setConnecting(provider);
      if (provider === "dropbox") {
        const redirectUrl = await cloudService.fetchConnectUrl(provider, "/profile");
        window.location.href = redirectUrl;
      } else {
        const win = await cloudService.openConnectPopup(provider, "/auth/cloud-callback");
        if (win) {
          const bc = new BroadcastChannel("cloud-oauth");
          let timeoutId: ReturnType<typeof setTimeout>;
          const cleanup = () => {
            clearTimeout(timeoutId);
            setConnecting(null);
            queryClient.invalidateQueries({ queryKey: ["cloud-connections"] });
            bc.close();
          };
          bc.onmessage = cleanup;
          timeoutId = setTimeout(cleanup, 5 * 60 * 1000); // Fallback if user closes popup during OAuth
        }
      }
    } catch (err) {
      console.error("Failed to get connect URL:", err);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: CloudProvider) => {
    try {
      await cloudService.disconnect(provider);
      queryClient.invalidateQueries({ queryKey: ["cloud-connections"] });
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Cloud Storage
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect your cloud drives to import files directly into Noteably.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map(({ id, name, icon: Icon }) => {
              const connected = connectedSet.has(id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  {connected ? (
                    chooserOnlySet.has(id) ? (
                      <span className="text-sm text-muted-foreground">Available</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Disconnect
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(id)}
                      disabled={connecting === id}
                    >
                      {connecting === id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
