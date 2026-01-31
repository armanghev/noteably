import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Check, Copy, Key, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export function APIKeys() {
  const { session } = useAuth();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch keys
  const fetchKeys = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/api-keys`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      }
    } catch (error) {
      console.error("Failed to fetch API keys", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchKeys();
    }
  }, [session]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/api-keys/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ name: newKeyName }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.key);
        fetchKeys(); // Refresh list
        setNewKeyName("");
      }
    } catch (error) {
      console.error("Failed to create API key", error);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This action cannot be undone.",
      )
    )
      return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/auth/api-keys/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );

      if (response.ok) {
        setKeys(keys.filter((k) => k.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete API key", error);
    }
  };

  const copyToClipboard = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Keys
            </CardTitle>
            <CardDescription className="mt-1">
              Manage API keys for external access (e.g., ESP32 devices).
            </CardDescription>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) setCreatedKey(null); // Reset on close
            }}
          >
            <DialogTrigger asChild>
              <Button>Create New Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Enter a name for your new API key to identify it later.
                </DialogDescription>
              </DialogHeader>

              {!createdKey ? (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Input
                      id="name"
                      placeholder="e.g. ESP32 Device 1"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim()}
                  >
                    Generate Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <Alert
                    variant="destructive"
                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50"
                  >
                    <AlertTitle>Save this key!</AlertTitle>
                    <AlertDescription>
                      This is the only time the full key will be shown. You
                      won't be able to see it again.
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                      {createdKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-secondary/20 rounded-lg border border-dashed border-border">
            No API keys found. Create one to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      sk_{key.prefix}...
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(key.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.last_used_at
                        ? format(new Date(key.last_used_at), "MMM d, HH:mm")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
