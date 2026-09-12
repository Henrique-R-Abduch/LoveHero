import type { ClientMessage, ServerMessage } from "@syncroom/shared";
import { wsUrlFor } from "./config";

type Listener = (message: ServerMessage) => void;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 500;

export class RoomSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private closedForGood = false;
  private reconnectAttempts = 0;

  private readonly roomId: string;
  private readonly hostToken: string | undefined;
  private readonly participantId: string;

  constructor(roomId: string, participantId: string, hostToken: string | undefined) {
    this.roomId = roomId;
    this.participantId = participantId;
    this.hostToken = hostToken;
  }

  connect(): void {
    this.closedForGood = false;
    this.open();
  }

  private open(): void {
    const socket = new WebSocket(wsUrlFor(this.roomId, this.participantId, this.hostToken));
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
    });

    socket.addEventListener("message", (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === "room_closed" || message.type === "room_full" || message.type === "room_not_found") {
        this.closedForGood = true;
      }
      for (const listener of this.listeners) listener(message);
    });

    socket.addEventListener("close", () => {
      if (this.closedForGood) return;
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
      const delay = RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts;
      this.reconnectAttempts += 1;
      setTimeout(() => {
        if (!this.closedForGood) this.open();
      }, delay);
    });
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  close(): void {
    this.closedForGood = true;
    this.socket?.close();
  }
}
