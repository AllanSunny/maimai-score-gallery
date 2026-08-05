/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JACKET_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
