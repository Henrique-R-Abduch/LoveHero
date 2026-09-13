import { nanoid } from "nanoid";
import type { WebSocket } from "ws";
import type { ChatMessage, CreateRoomResponse, Role, ServerMessage } from "@syncroom/shared";
import { config } from "../config.js";
import { SyncEngine } from "../sync/syncEngine.js";
import { deleteObject, objectKeyFor, isStorageConfigured } from "../media/uploadUrls.js";
import * as roomStore from "./roomStore.js";

type Participant = {
  socket: WebSocket;
  participantId: string;
};

type RoomRuntime = {
  roomId: string;
  hostToken: string;
  hardExpiresAt: number;
  participants: Map<Role, Participant>;
  disconnectTimers: Map<Role, NodeJS.Timeout>;
  syncEngine: SyncEngine;
  hardExpiryTimer: NodeJS.Timeout;
  ended: boolean;
};

const rooms = new Map<string, RoomRuntime>();

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(room: RoomRuntime, message: ServerMessage): void {
  for (const participant of room.participants.values()) {
    send(participant.socket, message);
  }
}

export async function createRoom(): Promise<CreateRoomResponse> {
  const roomId = nanoid(10);
  const hostToken = nanoid(24);
  const createdAt = Date.now();
  const hardExpiresAt = createdAt + config.roomMaxDurationMs;

  await roomStore.saveRoom({ roomId, hostToken, createdAt, hardExpiresAt });

  const runtime: RoomRuntime = {
    roomId,
    hostToken,
    hardExpiresAt,
    participants: new Map(),
    disconnectTimers: new Map(),
    syncEngine: new SyncEngine((tick) => {
      const current = rooms.get(roomId);
      if (current) broadcast(current, tick);
    }),
    hardExpiryTimer: setTimeout(() => {
      void endRoom(roomId, "expired");
    }, config.roomMaxDurationMs),
    ended: false,
  };
  rooms.set(roomId, runtime);

  return { roomId, hostToken, expiresAt: hardExpiresAt };
}

export async function roomExists(roomId: string): Promise<boolean> {
  if (rooms.has(roomId)) return true;
  return (await roomStore.getRoom(roomId)) !== null;
}

type JoinResult =
  | { ok: true; role: Role }
  | { ok: false; reason: "not_found" | "room_full" };

export async function joinRoom(
  roomId: string,
  socket: WebSocket,
  hostToken: string | undefined,
  participantId: string,
): Promise<JoinResult> {
  const room = rooms.get(roomId);
  if (!room || room.ended) {
    return { ok: false, reason: "not_found" };
  }

  const role: Role = hostToken && hostToken === room.hostToken ? "host" : "guest";

  // Participants are keyed by role + participantId, not by socket identity.
  // A new connection carrying the SAME participantId as the current holder
  // of this role (a StrictMode double-mount, a client auto-reconnect, or a
  // page refresh that recovered its sessionStorage id) is always treated as
  // that same participant reconnecting, even if the old socket hasn't
  // formally closed yet — it just takes over the slot. Only a DIFFERENT
  // identity trying to claim a slot whose current socket is still live gets
  // rejected as room_full.
  const existing = room.participants.get(role);
  const isSameParticipant = existing?.participantId === participantId;

  if (existing && !isSameParticipant && existing.socket.readyState === existing.socket.OPEN) {
    return { ok: false, reason: "room_full" };
  }

  if (existing && existing.socket !== socket) {
    existing.socket.close();
  }

  const wasReconnect = room.disconnectTimers.has(role);
  const timer = room.disconnectTimers.get(role);
  if (timer) {
    clearTimeout(timer);
    room.disconnectTimers.delete(role);
  }

  room.participants.set(role, { socket, participantId });
  await roomStore.touchRoom(roomId);

  const history = await roomStore.getChatHistory(roomId);
  send(socket, { type: "chat_history", messages: history });

  const currentHolder = room.syncEngine.getControlHolder();
  if (currentHolder) {
    // Snapshot for whoever's joining now — control_state is otherwise only
    // broadcast on change, which a late joiner (or one who reconnects after
    // a claim happened while they were gone) would never have seen.
    send(socket, { type: "control_state", holderParticipantId: currentHolder });
  }

  if (wasReconnect) {
    broadcast(room, { type: "peer_reconnected", t: Date.now() });
  }

  if (room.participants.size === 2) {
    broadcast(room, { type: "room_ready", t: Date.now() });
    room.syncEngine.start();
  }

  return { ok: true, role };
}

export async function handleClientMessage(
  roomId: string,
  role: Role,
  raw: string,
): Promise<void> {
  const room = rooms.get(roomId);
  if (!room || room.ended) return;

  let message: { type: string; [key: string]: unknown };
  try {
    message = JSON.parse(raw);
  } catch {
    return;
  }

  await roomStore.touchRoom(roomId);

  switch (message.type) {
    case "ping": {
      const socket = room.participants.get(role)?.socket;
      if (socket) send(socket, { type: "pong", t: Date.now() });
      return;
    }
    case "chat_send": {
      const text = typeof message.text === "string" ? message.text.slice(0, 2000) : "";
      if (!text) return;
      const chatMessage: ChatMessage = { id: nanoid(12), from: role, text, t: Date.now() };
      await roomStore.appendChatMessage(roomId, chatMessage);
      broadcast(room, { type: "chat_message", message: chatMessage });
      return;
    }
    case "photo_viewed": {
      const photoId = typeof message.photoId === "string" ? message.photoId : "";
      if (!photoId) return;
      if (isStorageConfigured()) {
        try {
          await deleteObject(objectKeyFor(roomId, photoId));
        } catch {
          // already deleted or storage unreachable — nothing more to do
        }
      }
      broadcast(room, { type: "photo_revoked", photoId });
      return;
    }
    case "end_room": {
      await endRoom(roomId, message.report ? "reported" : "ended");
      return;
    }
    case "claim_control": {
      // "Whoever asks, gets it" — no permission negotiation in the MVP.
      const participant = room.participants.get(role);
      if (!participant) return;
      room.syncEngine.setControlHolder(participant.participantId);
      broadcast(room, { type: "control_state", holderParticipantId: participant.participantId });
      return;
    }
    case "control_input": {
      const value = typeof message.value === "number" ? message.value : NaN;
      if (Number.isNaN(value)) return;
      const participant = room.participants.get(role);
      if (!participant) return;
      // Silently dropped if the sender isn't the current holder.
      room.syncEngine.submitInput(participant.participantId, value);
      return;
    }
    default:
      return;
  }
}

export function handleDisconnect(roomId: string, role: Role, socket: WebSocket): void {
  const room = rooms.get(roomId);
  if (!room || room.ended) return;

  const participant = room.participants.get(role);
  if (!participant || participant.socket !== socket) {
    // This socket was already superseded by a newer connection for the same
    // role/participant (see joinRoom) — that connection owns the slot now,
    // so this stale close event is a no-op, not a real disconnect.
    return;
  }
  room.participants.delete(role);

  if (room.syncEngine.getControlHolder() === participant.participantId) {
    // Don't clear controlHolder — the ball should freeze at its last value
    // (submitInput just stops being called) and resume seamlessly if this
    // same participant reconnects within the grace window.
    broadcast(room, { type: "holder_away", holderRole: role });
  }

  broadcast(room, { type: "peer_disconnected", t: Date.now(), reconnectWindowMs: config.reconnectWindowMs });

  const timer = setTimeout(() => {
    void endRoom(roomId, "peer_left");
  }, config.reconnectWindowMs);
  room.disconnectTimers.set(role, timer);
}

export async function endRoom(
  roomId: string,
  reason: "expired" | "ended" | "reported" | "peer_left",
): Promise<void> {
  const room = rooms.get(roomId);
  if (!room || room.ended) return;
  room.ended = true;

  broadcast(room, { type: "room_closed", reason });

  for (const participant of room.participants.values()) {
    participant.socket.close();
  }
  for (const timer of room.disconnectTimers.values()) {
    clearTimeout(timer);
  }
  clearTimeout(room.hardExpiryTimer);
  room.syncEngine.stop();

  rooms.delete(roomId);
  await roomStore.deleteRoom(roomId);
}

/** Resolves which role a caller has in a room, for HTTP requests (photo upload flow). */
export function resolveRole(roomId: string, hostToken: string | undefined): Role | null {
  const room = rooms.get(roomId);
  if (!room || room.ended) return null;
  return hostToken && hostToken === room.hostToken ? "host" : "guest";
}

export function otherRole(role: Role): Role {
  return role === "host" ? "guest" : "host";
}

export function getRuntimeForBroadcast(
  roomId: string,
): { broadcast: (m: ServerMessage) => void; sendToRole: (role: Role, m: ServerMessage) => void } | null {
  const room = rooms.get(roomId);
  if (!room || room.ended) return null;
  return {
    broadcast: (m) => broadcast(room, m),
    sendToRole: (role, m) => {
      const participant = room.participants.get(role);
      if (participant) send(participant.socket, m);
    },
  };
}
