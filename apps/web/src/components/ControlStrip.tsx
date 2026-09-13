import { useRef, useState } from "react";

const THROTTLE_MS = 40; // ~25 sends/sec, per spec's 20-30x/sec target

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function ControlStrip({
  isHolder,
  statusLabel,
  showClaimButton,
  onClaim,
  onInput,
}: {
  isHolder: boolean;
  statusLabel: string;
  showClaimButton: boolean;
  onClaim: () => void;
  onInput: (value: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(0.5);
  const lastSentAtRef = useRef(0);

  const valueFromClientY = (clientY: number): number => {
    const rect = stripRef.current!.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    return clamp01(1 - ratio); // bottom = 0, top = 1
  };

  const sendThrottled = (value: number, force = false) => {
    const now = Date.now();
    if (force || now - lastSentAtRef.current >= THROTTLE_MS) {
      lastSentAtRef.current = now;
      onInput(value);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHolder) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const value = valueFromClientY(e.clientY);
    setDisplayValue(value);
    sendThrottled(value, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHolder || !dragging) return;
    const value = valueFromClientY(e.clientY);
    setDisplayValue(value);
    sendThrottled(value);
  };

  const stopDragging = () => setDragging(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        ref={stripRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
          position: "relative",
          width: 22,
          height: 200,
          borderRadius: 11,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          touchAction: "none",
          cursor: isHolder ? "grab" : "default",
          opacity: isHolder ? 1 : 0.5,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${displayValue * 100}%`,
            background: "var(--color-accent-soft)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 3,
            right: 3,
            bottom: `calc(${displayValue * 100}% - 4px)`,
            height: 8,
            borderRadius: 4,
            background: "var(--color-accent)",
          }}
        />
      </div>

      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--color-text-secondary)",
          textAlign: "center",
          maxWidth: 96,
          lineHeight: 1.3,
        }}
      >
        {statusLabel}
      </span>

      {showClaimButton && (
        <button onClick={onClaim} className="btn-quiet" style={{ fontSize: "0.72rem", padding: "5px 10px" }}>
          Assumir
        </button>
      )}
    </div>
  );
}
