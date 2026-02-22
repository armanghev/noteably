import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/api/services/auth";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Phone,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

export function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const meta = user?.user_metadata ?? {};

  const [form, setForm] = useState({
    first_name: meta.first_name ?? "",
    last_name: meta.last_name ?? "",
    phone_number: meta.phone_number ?? "",
  });

  function handleEdit() {
    setForm({
      first_name: meta.first_name ?? "",
      last_name: meta.last_name ?? "",
      phone_number: meta.phone_number ?? "",
    });
    setMessage(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {};
      if (form.first_name !== (meta.first_name ?? "")) payload.first_name = form.first_name;
      if (form.last_name !== (meta.last_name ?? "")) payload.last_name = form.last_name;
      if (form.phone_number !== (meta.phone_number ?? "")) payload.phone_number = form.phone_number;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      await authService.updateProfile(payload);
      await refreshUser();
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to update profile.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Personal Information</h3>
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={handleEdit} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-xs text-muted-foreground">
              First Name
            </Label>
            {editing ? (
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="First name"
              />
            ) : (
              <p className="text-sm">{meta.first_name || <span className="text-muted-foreground">—</span>}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-xs text-muted-foreground">
              Last Name
            </Label>
            {editing ? (
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Last name"
              />
            ) : (
              <p className="text-sm">{meta.last_name || <span className="text-muted-foreground">—</span>}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone_number" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            Phone Number
            {!editing && meta.phone_number && (
              <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(Not verified)</span>
            )}
          </Label>
          {editing ? (
            <Input
              id="phone_number"
              value={form.phone_number}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          ) : (
            <p className="text-sm">
              {meta.phone_number || <span className="text-muted-foreground">—</span>}
            </p>
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
