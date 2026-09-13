import type { ChatMessage, PhotoReadyMessage, Role } from "@syncroom/shared";
import { ChatPanel } from "./ChatPanel";
import { PhotoUpload } from "./PhotoUpload";

export function ChatDrawer({
  open,
  onClose,
  messages,
  myRole,
  onSend,
  photosEnabled,
  roomId,
  hostToken,
  incomingPhoto,
  onViewedPhoto,
}: {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  myRole: Role;
  onSend: (text: string) => void;
  photosEnabled: boolean;
  roomId: string;
  hostToken: string | undefined;
  incomingPhoto: PhotoReadyMessage | null;
  onViewedPhoto: (photoId: string) => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
          zIndex: 40,
        }}
      />
      <div
        role="dialog"
        aria-label="Chat"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(360px, 100vw)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 220ms ease",
          zIndex: 41,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)" }}>Chat</span>
          <button
            onClick={onClose}
            aria-label="Fechar chat"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              fontSize: "1.2rem",
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatPanel messages={messages} myRole={myRole} onSend={onSend} />
        </div>

        {photosEnabled && (
          <PhotoUpload roomId={roomId} hostToken={hostToken} incoming={incomingPhoto} onViewed={onViewedPhoto} />
        )}
      </div>
    </>
  );
}
