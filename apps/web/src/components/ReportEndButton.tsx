export function ReportEndButton({ onEnd }: { onEnd: (report: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => onEnd(false)} className="btn-quiet">
        Encerrar sala
      </button>
      <button
        onClick={() => onEnd(true)}
        className="btn-quiet"
        style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
      >
        Denunciar e encerrar
      </button>
    </div>
  );
}
