import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ChatMessage, PhotoReadyMessage, Role, ServerMessage } from "@syncroom/shared";
import { RoomSocket } from "../lib/websocket";
import { TickInterpolator } from "../lib/interpolation";
import { getParticipantId } from "../lib/participant";
import { getConfig } from "../lib/api";
import { SyncCanvas } from "../components/SyncCanvas";
import { ChatPanel } from "../components/ChatPanel";
import { PhotoUpload } from "../components/PhotoUpload";
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
      <Centered>
        <p>Sala encerrada{closedReason ? ` (${describeClosedReason(closedReason)})` : ""}.</p>
        <button onClick={() => navigate("/")} style={primaryButtonStyle}>
          Voltar ao início
        </button>
      </Centered>
    );
  }

  return (
    <Centered>
      <h1 style={{ fontSize: "1.1rem", marginBottom: 4 }}>SyncRoom</h1>

      {myRole === "host" && status === "waiting_peer" && (
        <div style={{ fontSize: "0.85rem", opacity: 0.85, marginBottom: 12, textAlign: "center" }}>
          <p>Compartilhe este link com a outra pessoa:</p>
          <code style={{ background: "#161320", padding: "6px 10px", borderRadius: 8, display: "inline-block", marginTop: 4 }}>
            {shareLink}
          </code>
        </div>
      )}

      {status === "peer_disconnected" && <p style={{ color: "#ffcf7a" }}>A outra pessoa desconectou. Aguardando reconexão...</p>}
      {(status === "waiting_peer" || status === "connecting") && myRole === "guest" && <p>Conectando à sala...</p>}

      <SyncCanvas interpolator={interpolator} />
      <ControlStrip
        isHolder={isHolder}
        statusLabel={controlStatusLabel}
        showClaimButton={!isHolder}
        onClaim={handleClaimControl}
        onInput={handleControlInput}
      />
      <ChatPanel messages={messages} myRole={myRole} onSend={handleSendChat} />
      {photosEnabled && (
        <PhotoUpload roomId={roomId} hostToken={hostToken} incoming={incomingPhoto} onViewed={handleViewedPhoto} />
      )}
      <ReportEndButton onEnd={handleEnd} />
    </Centered>
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 16,
        background: "#0b0b12",
        color: "#f2f0f7",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "#c9a4ff",
  color: "#0b0b12",
  fontWeight: 600,
  cursor: "pointer",
};
