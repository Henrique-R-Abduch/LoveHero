import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api";
import { SyncCanvas } from "../components/SyncCanvas";

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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 16,
        background: "var(--color-bg)",
        textAlign: "center",
      }}
    >
      <SyncCanvas idle />

      <h1
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          color: "var(--color-text)",
          margin: 0,
          maxWidth: 320,
        }}
      >
        Um espaço sincronizado, só para vocês dois
      </h1>

      <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ minWidth: 200, opacity: loading ? 0.7 : 1 }}>
        {loading ? "Criando..." : "Criar sala"}
      </button>

      {error && <span style={{ color: "var(--color-accent)", fontSize: "0.85rem" }}>{error}</span>}

      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: 0 }}>
        Sem conta. Sem histórico. A sala se apaga sozinha.
      </p>

      <a href="/terms" style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem" }}>
        Termos de uso
      </a>
    </div>
  );
}
