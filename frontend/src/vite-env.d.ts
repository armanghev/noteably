/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    // Cloud storage (optional)
    readonly VITE_GOOGLE_APP_ID: string;
    readonly VITE_GOOGLE_API_KEY: string;
    readonly VITE_DROPBOX_APP_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
