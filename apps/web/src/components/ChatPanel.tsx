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
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
      <div
        style={{
          height: 180,
          overflowY: "auto",
          background: "#161320",
          borderRadius: 12,
          padding: 10,
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
              background: m.from === myRole ? "#c9a4ff" : "#2a2438",
              color: m.from === myRole ? "#0b0b12" : "#f2f0f7",
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
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #332b47", background: "#0b0b12", color: "#f2f0f7" }}
        />
        <button type="submit" style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#c9a4ff", cursor: "pointer" }}>
          Enviar
        </button>
      </form>
    </div>
  );
}
