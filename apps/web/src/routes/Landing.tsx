import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api";

export function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const room = await createRoom();
      navigate(`/r/${room.roomId}`, { state: { hostToken: room.hostToken } });
    } catch {
      setError("Não foi possível criar a sala. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 20,
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
          Criar uma sala privada
        </h1>
        <p style={{ maxWidth: 300, color: "var(--color-text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, margin: 0 }}>
          Compartilhe o link com a outra pessoa e fiquem sincronizados em tempo real. Sem cadastro — a sala expira
          sozinha.
        </p>
        <button
          className="btn-primary"
          onClick={handleCreate}
          disabled={loading}
          style={{ width: "100%", fontSize: "1rem", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Criando..." : "Criar sala"}
        </button>
        {error && <span style={{ color: "var(--color-accent)", fontSize: "0.85rem" }}>{error}</span>}
        <a href="/terms" style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
          Termos de uso
        </a>
      </div>
    </div>
  );
}
