import { useState } from "react";
import type { ChatMessage, Role } from "@syncroom/shared";

export function ChatPanel({
  messages,
  myRole,
  onSend,
}: {
  messages: ChatMessage[];
  myRole: Role;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", height: "100%" }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.from === myRole ? "flex-end" : "flex-start",
              background: m.from === myRole ? "var(--color-accent)" : "var(--color-surface-raised)",
              color: "var(--color-text)",
              borderRadius: 10,
              padding: "6px 10px",
              maxWidth: "80%",
              fontSize: "0.85rem",
              wordBreak: "break-word",
            }}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mensagem..."
          maxLength={2000}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            color: "var(--color-text)",
          }}
        />
        <button type="submit" className="btn-primary" style={{ padding: "8px 14px" }}>
          Enviar
        </button>
      </form>
    </div>
  );
}
