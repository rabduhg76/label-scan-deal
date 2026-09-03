import { Result } from "./gluten";

export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  snippet: string;
  fullText: string;
  result: Result;
  photo?: string | null;
}

const STORAGE_KEY = "gfd_scan_history";

export function getScanHistory(): ScanHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load scan history", err);
    return [];
  }
}

export function saveScanToHistory(
  text: string,
  result: Result,
  photo?: string | null
): ScanHistoryItem[] {
  if (typeof window === "undefined" || !text.trim()) return getScanHistory();
  try {
    const current = getScanHistory();
    const snippet =
      text.length > 80 ? text.slice(0, 80).trim() + "…" : text.trim();

    const newItem: ScanHistoryItem = {
      id: "scan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      snippet,
      fullText: text,
      result,
      photo: photo || null,
    };

    // Filter out immediate duplicate text scans and keep latest 30
    const filtered = current.filter((item) => item.fullText !== text);
    const updated = [newItem, ...filtered].slice(0, 30);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("gfd_history_updated"));
    return updated;
  } catch (err) {
    console.error("Failed to save scan history", err);
    return getScanHistory();
  }
}

export function deleteHistoryItem(id: string): ScanHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getScanHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("gfd_history_updated"));
    return updated;
  } catch (err) {
    console.error("Failed to delete history item", err);
    return getScanHistory();
  }
}

export function clearAllHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("gfd_history_updated"));
  } catch (err) {
    console.error("Failed to clear scan history", err);
  }
}
