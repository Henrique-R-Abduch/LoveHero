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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        ref={stripRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
          position: "relative",
          width: 56,
          height: 220,
          borderRadius: 14,
          background: "#161320",
          touchAction: "none",
          cursor: isHolder ? "grab" : "default",
          opacity: isHolder ? 1 : 0.45,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            bottom: `calc(${displayValue * 100}% - 14px)`,
            height: 28,
            borderRadius: 8,
            background: "#c9a4ff",
          }}
        />
      </div>

      <span style={{ fontSize: "0.8rem", opacity: 0.85, textAlign: "center", maxWidth: 220 }}>{statusLabel}</span>

      {showClaimButton && (
        <button
          onClick={onClaim}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #c9a4ff",
            background: "transparent",
            color: "#c9a4ff",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Assumir controle
        </button>
      )}
    </div>
  );
}
