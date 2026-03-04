import type { MaterialType, ProcessUploadResponse } from "@/types";
import apiClient from "../client";

export type CloudProvider = "google_drive" | "dropbox";

export interface CloudConnection {
  provider: CloudProvider;
  connected: boolean;
  chooser_only?: boolean; // Dropbox: uses Chooser, no OAuth to disconnect
}

export interface CloudImportParams {
  provider: CloudProvider;
  fileId?: string;
  fileLink?: string; // Dropbox Chooser temporary link
  materialTypes: MaterialType[];
  options?: Record<string, unknown>;
}

export const cloudService = {
  getConnections: async (): Promise<CloudConnection[]> => {
    const response = await apiClient.get<CloudConnection[]>("/cloud/connections/");
    return response.data;
  },

  getConnectUrl: (provider: CloudProvider, next?: string): string => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const url = `${base.replace(/\/$/, "")}/cloud/connect/${provider}/`;
    return next ? `${url}?next=${encodeURIComponent(next)}` : url;
  },

  /** Fetch redirect URL via authenticated request. Use openInPopup: true to open in a small window. */
  fetchConnectUrl: async (
    provider: CloudProvider,
    next?: string,
    openInPopup?: boolean,
  ): Promise<string> => {
    const nextPath = openInPopup && next ? `${next}${next.includes("?") ? "&" : "?"}popup=1` : next;
    const params = nextPath ? { next: nextPath } : undefined;
    const response = await apiClient.get<{ redirect_url: string }>(
      `/cloud/connect-url/${provider}/`,
      { params },
    );
    return response.data.redirect_url;
  },

  /** Open cloud OAuth in a popup window (for Google Drive connect). Returns the popup window or null if blocked. */
  openConnectPopup: async (provider: CloudProvider, next: string): Promise<Window | null> => {
    const redirectUrl = await cloudService.fetchConnectUrl(provider, next, true);
    const w = 520;
    const h = 680;
    const left = Math.round((window.screen.width - w) / 2);
    const top = Math.round((window.screen.height - h) / 2);
    const win = window.open(
      redirectUrl,
      `cloud-oauth-${provider}`,
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`,
    );
    if (!win) {
      window.location.href = redirectUrl;
      return null;
    }
    return win;
  },

  disconnect: async (provider: CloudProvider): Promise<void> => {
    await apiClient.delete(`/cloud/connections/${provider}/`);
  },

  getPickerToken: async (provider: CloudProvider): Promise<{ access_token: string }> => {
    const response = await apiClient.get<{ access_token: string }>(
      `/cloud/picker-token/${provider}/`,
    );
    return response.data;
  },

  importFromCloud: async (
    params: CloudImportParams,
  ): Promise<ProcessUploadResponse> => {
    const body: Record<string, unknown> = {
      provider: params.provider,
      material_types: params.materialTypes,
      options: params.options,
    };
    if (params.fileId) body.file_id = params.fileId;
    if (params.fileLink) body.file_link = params.fileLink;
    const response = await apiClient.post<ProcessUploadResponse>(
      "/cloud/import/",
      body,
    );
    return response.data;
  },
};
