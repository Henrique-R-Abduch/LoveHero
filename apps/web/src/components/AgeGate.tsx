import { useState, type ReactNode } from "react";

const SESSION_KEY = "syncroom_age_confirmed";

function isConfirmed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function AgeGate({ children }: { children: ReactNode }) {
  const [confirmed, setConfirmed] = useState(isConfirmed);

  if (confirmed) return <>{children}</>;

  const confirm = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // storage unavailable — still let them through for this render
    }
    setConfirmed(true);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>Conteúdo para maiores de 18 anos</h1>
        <p style={styles.text}>
          Este site contém recursos voltados para casais adultos e pode incluir conteúdo íntimo. Ao continuar,
          você confirma que tem 18 anos ou mais e concorda com os{" "}
          <a href="/terms" style={styles.link}>
            Termos de Uso
          </a>
          .
        </p>
        <div style={styles.actions}>
          <button className="btn-primary" onClick={confirm}>
            Tenho 18 anos ou mais — entrar
          </button>
          <a href="https://www.google.com" style={styles.leaveButton}>
            Sair
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "var(--font-family)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  card: { maxWidth: 480, textAlign: "center" },
  title: { fontSize: "1.4rem", marginBottom: 12, fontWeight: 600 },
  text: { fontSize: "0.95rem", lineHeight: 1.5, color: "var(--color-text-secondary)" },
  link: { color: "var(--color-accent)" },
  actions: { marginTop: 24, display: "flex", flexDirection: "column", gap: 10 },
  leaveButton: { color: "var(--color-text-secondary)", fontSize: "0.85rem" },
};
