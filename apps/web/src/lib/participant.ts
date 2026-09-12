/**
 * Stable per-tab identity for a room, used only so the server can tell a
 * StrictMode double-mount (or a client-initiated reconnect) apart from a
 * genuine second visitor — it grants no capabilities by itself (unlike
 * hostToken) and is scoped to this tab's session, never localStorage.
 */
export function getParticipantId(roomId: string): string {
  const key = `syncroom_participant_${roomId}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
  } catch {
    // sessionStorage unavailable — fall through to a one-off id
  }

  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(key, id);
  } catch {
    // can't persist — this render still gets a usable id
  }
  return id;
}
