import { cloudService, type CloudProvider } from "@/lib/api/services/cloud";
import type { CloudFile } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void;
      client: {
        init: (args: {
          apiKey: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        setToken: (token: { access_token: string }) => void;
      };
    };
    google?: {
      picker: {
        PickerBuilder: new () => {
          setOAuthToken: (token: string) => unknown;
          setAppId: (id: string) => unknown;
          addView: (view: unknown) => unknown;
          setCallback: (
            cb: (data: {
              action: string;
              docs?: Array<{ id: string; name: string }>;
            }) => void,
          ) => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        };
        DocsView: new (viewId?: unknown) => {
          setIncludeFolders: (include: boolean) => unknown;
        };
        ViewId: { DOCS: unknown };
      };
    };
    Dropbox?: {
      choose: (options: {
        success: (files: Array<{ link: string; name: string }>) => void;
        cancel?: () => void;
        linkType: string;
        multiselect: boolean;
        extensions: string[];
      }) => void;
    };
  }
}

const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || "";
const DROPBOX_APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || "";

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function useCloudImport(onFileSelected: (file: CloudFile) => void) {
  const queryClient = useQueryClient();
  const { data: connections = [] } = useQuery({
    queryKey: ["cloud-connections"],
    queryFn: () => cloudService.getConnections(),
  });

  const connectedSet = new Set(
    connections.filter((c) => c.connected).map((c) => c.provider),
  );

  const openPicker = async (provider: CloudProvider) => {
    if (provider === "dropbox") {
      if (!DROPBOX_APP_KEY) {
        console.warn("VITE_DROPBOX_APP_KEY not set");
        return;
      }
      if (!document.getElementById("dropboxjs")) {
        const script = document.createElement("script");
        script.src = "https://www.dropbox.com/static/api/2/dropins.js";
        script.id = "dropboxjs";
        script.setAttribute("data-app-key", DROPBOX_APP_KEY);
        document.head.appendChild(script);
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = reject;
        });
      }
      const Dropbox = (window as unknown as { Dropbox?: typeof window.Dropbox })
        .Dropbox;
      if (!Dropbox) {
        console.error("Dropbox SDK not loaded");
        return;
      }
      Dropbox.choose({
        success: (files) => {
          const file = files[0];
          if (file?.link) {
            onFileSelected({
              provider: "dropbox",
              fileLink: file.link,
              name: file.name,
            });
          }
        },
        linkType: "direct",
        multiselect: false,
        extensions: [".pdf", ".mp3", ".wav", ".txt", ".mp4", ".mov"],
      });
      return;
    }

    if (!connectedSet.has(provider)) {
      try {
        const win = await cloudService.openConnectPopup(
          provider,
          "/auth/cloud-callback",
        );
        if (win) {
          const bc = new BroadcastChannel("cloud-oauth");
          let timeoutId: ReturnType<typeof setTimeout>;
          const cleanup = () => {
            clearTimeout(timeoutId);
            queryClient.invalidateQueries({ queryKey: ["cloud-connections"] });
            bc.close();
          };
          bc.onmessage = cleanup;
          timeoutId = setTimeout(cleanup, 5 * 60 * 1000); // Fallback if user closes popup during OAuth
        }
      } catch (err) {
        console.error("Failed to get connect URL:", err);
      }
      return;
    }

    if (provider === "google_drive") {
      const tokenResp = await cloudService.getPickerToken("google_drive");
      const token = tokenResp.access_token;
      if (!GOOGLE_APP_ID) {
        console.warn("VITE_GOOGLE_APP_ID not set for Picker");
        return;
      }
      await loadScript("https://apis.google.com/js/api.js", "gapi");
      const gapi = window.gapi;
      if (!gapi) return;
      await new Promise<void>((resolve) => {
        gapi.load("client:picker", resolve);
      });
      await gapi.client.init({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
        ],
      });
      gapi.client.setToken({ access_token: token });
      const googleObj = window.google as any;
      const docsView = new googleObj.picker.DocsView(
        googleObj.picker.ViewId.DOCS,
      ).setIncludeFolders(true);
      const picker = new googleObj.picker.PickerBuilder()
        .setOAuthToken(token)
        .setAppId(GOOGLE_APP_ID)
        .addView(docsView)
        .setCallback((data: any) => {
          if (data.action === "picked" && data.docs?.[0]) {
            onFileSelected({
              provider: "google_drive",
              fileId: data.docs[0].id,
              name: data.docs[0].name,
            });
          }
        })
        .build();
      picker.setVisible(true);
      return;
    }
  };

  return {
    openPicker,
    connections,
    connectedSet,
  };
}
