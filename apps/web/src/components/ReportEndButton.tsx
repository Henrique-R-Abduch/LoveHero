export function ReportEndButton({ onEnd }: { onEnd: (report: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={() => onEnd(false)}
        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #332b47", background: "transparent", color: "#f2f0f7", cursor: "pointer" }}
      >
        Encerrar sala
      </button>
      <button
        onClick={() => onEnd(true)}
        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ff9b9b", background: "transparent", color: "#ff9b9b", cursor: "pointer" }}
      >
        Denunciar e encerrar
      </button>
    </div>
  );
}
