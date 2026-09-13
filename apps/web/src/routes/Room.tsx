import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ChatMessage, PhotoReadyMessage, Role, ServerMessage } from "@syncroom/shared";
import { RoomSocket } from "../lib/websocket";
import { TickInterpolator } from "../lib/interpolation";
import { getParticipantId } from "../lib/participant";
import { getConfig } from "../lib/api";
import { SyncCanvas } from "../components/SyncCanvas";
import { ChatDrawer } from "../components/ChatDrawer";
import { ReportEndButton } from "../components/ReportEndButton";
import { ControlStrip } from "../components/ControlStrip";

type Status = "connecting" | "waiting_peer" | "ready" | "peer_disconnected" | "closed";

export function Room() {
  const { roomId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const hostToken = (location.state as { hostToken?: string } | null)?.hostToken;
  const myRole: Role = hostToken ? "host" : "guest";

  const [status, setStatus] = useState<Status>("connecting");
  const [closedReason, setClosedReason] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [incomingPhoto, setIncomingPhoto] = useState<PhotoReadyMessage | null>(null);
  const [holderParticipantId, setHolderParticipantId] = useState<string | null>(null);
  const [holderAway, setHolderAway] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Starts hidden — never flash the upload UI before we know it's actually enabled.
  const [photosEnabled, setPhotosEnabled] = useState(false);

  const interpolator = useMemo(() => new TickInterpolator(), []);
  const participantId = useMemo(() => getParticipantId(roomId), [roomId]);
  const socketRef = useRef<RoomSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((cfg) => {
        if (!cancelled) setPhotosEnabled(cfg.photosEnabled);
      })
      .catch(() => {
        // leave it hidden — safer default than assuming it's available
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = new RoomSocket(roomId, participantId, hostToken);
    socketRef.current = socket;

    const unsubscribe = socket.onMessage((message: ServerMessage) => {
      switch (message.type) {
        case "room_ready":
          setStatus("ready");
          return;
        case "peer_reconnected":
          setStatus("ready");
          setHolderAway(false);
          return;
        case "peer_disconnected":
          setStatus("peer_disconnected");
          return;
        case "control_state":
          setHolderParticipantId(message.holderParticipantId);
          setHolderAway(false);
          return;
        case "holder_away":
          if (message.holderRole !== myRole) setHolderAway(true);
          return;
        case "room_full":
        case "room_not_found":
          setClosedReason(message.type);
          setStatus("closed");
          return;
        case "room_closed":
          setClosedReason(message.reason);
          setStatus("closed");
          return;
        case "chat_message":
          setMessages((prev) => [...prev, message.message]);
          return;
        case "chat_history":
          setMessages(message.messages);
          return;
        case "sync":
          interpolator.push(message);
          return;
        case "photo_ready":
          setIncomingPhoto(message);
          return;
        case "photo_revoked":
          setIncomingPhoto((prev) => (prev?.photoId === message.photoId ? null : prev));
          return;
        default:
          return;
      }
    });

    socket.connect();
    setStatus((s) => (s === "connecting" ? "waiting_peer" : s));

    return () => {
      unsubscribe();
      // Close this effect run's own connection before a new one can open —
      // guards against StrictMode's mount→cleanup→mount and any other
      // overlapping remount from racing two live sockets for the same tab.
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, participantId, hostToken]);

  const shareLink = `${window.location.origin}/r/${roomId}`;

  const handleSendChat = (text: string) => {
    socketRef.current?.send({ type: "chat_send", text });
  };

  const handleViewedPhoto = (photoId: string) => {
    socketRef.current?.send({ type: "photo_viewed", photoId });
    setIncomingPhoto(null);
  };

  const handleEnd = (report: boolean) => {
    socketRef.current?.send({ type: "end_room", report });
  };

  const handleClaimControl = () => {
    socketRef.current?.send({ type: "claim_control" });
  };

  const handleControlInput = (value: number) => {
    socketRef.current?.send({ type: "control_input", value, t: Date.now() });
  };

  const isHolder = holderParticipantId === participantId;
  const controlStatusLabel = holderAway
    ? "Aguardando a outra pessoa reconectar..."
    : isHolder
      ? "Você está no controle"
      : holderParticipantId
        ? "A outra pessoa está no controle"
        : "Ninguém no controle — toque para assumir";

  if (status === "closed") {
    return (
      <FullScreen>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Sala encerrada{closedReason ? ` (${describeClosedReason(closedReason)})` : ""}.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Voltar ao início
          </button>
        </div>
      </FullScreen>
    );
  }

  return (
    <FullScreen>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", textAlign: "left" }}>
          {myRole === "host" && status === "waiting_peer" && (
            <>
              <div>Compartilhe este link:</div>
              <code
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "inline-block",
                  marginTop: 4,
                  color: "var(--color-text)",
                }}
              >
                {shareLink}
              </code>
            </>
          )}
          {status === "peer_disconnected" && <span style={{ color: "var(--color-accent)" }}>A outra pessoa desconectou...</span>}
          {(status === "waiting_peer" || status === "connecting") && myRole === "guest" && <span>Conectando à sala...</span>}
        </div>

        <ReportEndButton onEnd={handleEnd} />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <SyncCanvas interpolator={interpolator} />
        <ControlStrip
          isHolder={isHolder}
          statusLabel={controlStatusLabel}
          showClaimButton={!isHolder}
          onClaim={handleClaimControl}
          onInput={handleControlInput}
        />
      </div>

      <button
        onClick={() => setChatOpen(true)}
        aria-label="Abrir chat"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChatIcon />
      </button>

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        myRole={myRole}
        onSend={handleSendChat}
        photosEnabled={photosEnabled}
        roomId={roomId}
        hostToken={hostToken}
        incomingPhoto={incomingPhoto}
        onViewedPhoto={handleViewedPhoto}
      />
    </FullScreen>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 4v-4H5.5C4.67 17 4 16.33 4 15.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function describeClosedReason(reason: string): string {
  switch (reason) {
    case "expired":
      return "tempo esgotado";
    case "ended":
      return "encerrada por um dos participantes";
    case "reported":
      return "denunciada";
    case "peer_left":
      return "a outra pessoa saiu";
    case "room_full":
      return "sala cheia";
    case "room_not_found":
      return "link inválido ou expirado";
    default:
      return reason;
  }
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      {children}
    </div>
  );
}
