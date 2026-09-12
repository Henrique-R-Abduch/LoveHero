// ---- Room lifecycle ----

export type Role = "host" | "guest";

export type RoomSummary = {
  roomId: string;
  createdAt: number;
  expiresAt: number;
};

export type CreateRoomResponse = {
  roomId: string;
  hostToken: string;
  expiresAt: number;
};

// ---- Sync engine ----

export type SyncTick = {
  type: "sync";
  t: number; // server timestamp (ms)
  x: number; // normalized position 0-1
  speed: number; // normalized 0-1
  pattern: string; // id of the active pattern
};

// ---- Chat ----

export type ChatMessage = {
  id: string;
  from: Role;
  text: string;
  t: number;
};

// ---- Photos ----

export type PhotoRequestUploadResponse = {
  photoId: string;
  uploadUrl: string;
  expiresAt: number;
};

export type PhotoReadyMessage = {
  type: "photo_ready";
  photoId: string;
  from: Role;
  downloadUrl: string;
  t: number;
};

// ---- WebSocket protocol: client -> server ----

export type ClientMessage =
  | { type: "ping" }
  | { type: "chat_send"; text: string }
  | { type: "photo_viewed"; photoId: string }
  | { type: "end_room"; report?: boolean }
  | { type: "control_input"; value: number; t: number }
  | { type: "claim_control" };

// ---- WebSocket protocol: server -> client ----

export type ServerMessage =
  | { type: "pong"; t: number }
  | { type: "room_ready"; t: number }
  | { type: "peer_disconnected"; t: number; reconnectWindowMs: number }
  | { type: "peer_reconnected"; t: number }
  | { type: "room_full" }
  | { type: "room_not_found" }
  | { type: "room_closed"; reason: "expired" | "ended" | "reported" | "peer_left" }
  | { type: "chat_message"; message: ChatMessage }
  | { type: "chat_history"; messages: ChatMessage[] }
  | SyncTick
  | PhotoReadyMessage
  | { type: "photo_revoked"; photoId: string }
  | { type: "control_state"; holderParticipantId: string | null }
  | { type: "holder_away"; holderRole: Role };
