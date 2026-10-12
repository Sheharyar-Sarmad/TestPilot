import { API_URL } from "@/lib/api";

export async function serverFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Server fetch failed: ${res.status}`);
  }
  return res.json();
}