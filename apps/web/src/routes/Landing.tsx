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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 16,
        background: "#0b0b12",
        color: "#f2f0f7",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.6rem" }}>SyncRoom</h1>
      <p style={{ maxWidth: 360, opacity: 0.8, fontSize: "0.95rem" }}>
        Crie uma sala privada, compartilhe o link com a outra pessoa e fiquem sincronizados em tempo real. Sem
        cadastro, sem histórico — a sala expira sozinha.
      </p>
      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          padding: "12px 22px",
          borderRadius: 10,
          border: "none",
          background: "#c9a4ff",
          color: "#0b0b12",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Criando..." : "Criar sala"}
      </button>
      {error && <span style={{ color: "#ff9b9b", fontSize: "0.85rem" }}>{error}</span>}
      <a href="/terms" style={{ color: "#8a8798", fontSize: "0.8rem" }}>
        Termos de uso
      </a>
    </div>
  );
}
