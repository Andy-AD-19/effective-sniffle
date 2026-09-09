type FileFilter = { name: string; extensions: string[] };

export type DesktopStatus = {
  app_data_dir: string;
  database_path: string;
  backup_dir: string;
  api_url: string;
  backend_started: boolean;
  backend_pid?: number;
  backend_error?: string;
  database_initializing?: boolean;
  database_exists: boolean;
  database_size_bytes: number;
  integrity: string;
};

export type LicenseStatus = {
  license_key: string;
  activated_at: number;
  expires_at: number;
  max_devices: number;
  activated_devices: string[];
  current_device_id: string;
  expired: boolean;
  message: string;
};

export function isDesktop() {
  return false;
}

export function readCachedValue(key: string) {
  return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
}

export async function readStoredValue<T>(key: string, fallback: T): Promise<T> {
  const value = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  return value ? (JSON.parse(value) as T) : fallback;
}

export async function writeStoredValue(key: string, value: unknown) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function deleteStoredValue(key: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
  }
}

export async function notifyDesktop(_title: string, _body: string) {
  // Browser notifications or toasts handle in-app notifications
}

export async function saveTextFile(defaultName: string, contents: string, _filters: FileFilter[]) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
  triggerBrowserDownload(url, defaultName);
}

export async function saveBlobFile(defaultName: string, blob: Blob, _filters: FileFilter[]) {
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, defaultName);
}

export async function pickFileAsBrowserFile(_title: string, _filters: FileFilter[]) {
  return undefined;
}

export async function openExternalFile(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function printCurrentView() {
  window.print();
}

export async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

export async function getDesktopStatus(): Promise<DesktopStatus> {
  return {
    app_data_dir: "Cloudflare Web Deployment",
    database_path: "Cloud / Managed API Service",
    backup_dir: "Cloudflare Web",
    api_url: "Connected API",
    backend_started: true,
    backend_error: undefined,
    database_exists: true,
    database_size_bytes: 0,
    integrity: "Cloudflare Edge"
  };
}

export async function desktopApiUrl() {
  return "";
}

export async function createDesktopBackup() {
  throw new Error("Database backups are managed on the API server.");
}

export async function restoreDesktopBackup(_source: string) {
  throw new Error("Database restore is managed on the API server.");
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const now = Math.floor(Date.now() / 1000);
  return {
    license_key: "CLOUDFLARE-ENTERPRISE-WEB",
    activated_at: now,
    expires_at: now + 730 * 24 * 60 * 60,
    max_devices: 9999,
    activated_devices: ["web-client"],
    current_device_id: "web-client",
    expired: false,
    message: "Institutional web license active."
  };
}

export async function activateLicense(_licenseKey: string): Promise<LicenseStatus> {
  return getLicenseStatus();
}

export async function deactivateCurrentDevice(): Promise<LicenseStatus> {
  return getLicenseStatus();
}

export async function pickDatabaseBackupFile() {
  return undefined;
}

export async function listenDesktopMenu(_handler: (id: string) => void) {
  return () => {};
}

function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
