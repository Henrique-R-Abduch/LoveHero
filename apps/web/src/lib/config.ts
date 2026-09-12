export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export function wsUrlFor(roomId: string, participantId: string, hostToken?: string): string {
  const base = new URL(API_BASE_URL);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`/rooms/${roomId}/ws`, `${protocol}//${base.host}`);
  url.searchParams.set("participantId", participantId);
  if (hostToken) url.searchParams.set("hostToken", hostToken);
  return url.toString();
}
