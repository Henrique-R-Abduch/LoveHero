import { useEffect, useRef, useState } from "react";
import type { TickInterpolator } from "../../lib/interpolation";
import { RhythmTrack } from "./RhythmTrack";
import { RhythmSlider } from "./RhythmSlider";
import "./rhythm.css";

const THROTTLE_MS = 40; // ~25 sends/sec — same rate the previous control strip used

// Mirrors apps/server/src/sync/syncEngine.ts's constants for display only —
// the value actually sent over the wire is always the raw 0-1 slider value;
// this just turns it into a human "×" multiplier and a default that matches
// the server's own neutral resting speed.
const MIN_SPEED_HZ = 0.1;
const MAX_SPEED_HZ = 1.5;
const BASE_SPEED_HZ = 0.3;
const DEFAULT_SPEED_01 = (BASE_SPEED_HZ - MIN_SPEED_HZ) / (MAX_SPEED_HZ - MIN_SPEED_HZ);

function speedToMultiplier(speed01: number): number {
  const hz = MIN_SPEED_HZ + speed01 * (MAX_SPEED_HZ - MIN_SPEED_HZ);
  return hz / BASE_SPEED_HZ;
}

function speedToLabel(speed01: number): string {
  if (speed01 < 0.2) return "lento";
  if (speed01 < 0.4) return "suave";
  if (speed01 < 0.6) return "constante";
  if (speed01 < 0.8) return "intenso";
  return "acelerado";
}

export function RhythmExperience({
  interpolator,
  isHolder,
  holderAway,
  hasHolder,
  onClaim,
  onInput,
}: {
  interpolator: TickInterpolator;
  isHolder: boolean;
  holderAway: boolean;
  hasHolder: boolean;
  onClaim: () => void;
  onInput: (value: number) => void;
}) {
  const [sliderValue, setSliderValue] = useState(DEFAULT_SPEED_01);
  const draggingRef = useRef(false);
  const lastSentAtRef = useRef(0);

  // While not actively dragging, the slider (and the value/label below it)
  // track the server-confirmed speed from SyncTick — a single source of
  // truth, so a non-holder (or anyone who isn't currently dragging) always
  // sees the real current rhythm instead of a stale local echo.
  useEffect(() => {
    let frame = requestAnimationFrame(sync);
    let lastRounded = "";
    function sync() {
      if (!draggingRef.current) {
        const speed = interpolator.sample()?.speed ?? DEFAULT_SPEED_01;
        const rounded = speed.toFixed(3);
        if (rounded !== lastRounded) {
          lastRounded = rounded;
          setSliderValue(speed);
        }
      }
      frame = requestAnimationFrame(sync);
    }
    return () => cancelAnimationFrame(frame);
  }, [interpolator]);

  const sendThrottled = (value: number, force = false) => {
    const now = Date.now();
    if (force || now - lastSentAtRef.current >= THROTTLE_MS) {
      lastSentAtRef.current = now;
      onInput(value);
    }
  };

  const multiplier = speedToMultiplier(sliderValue);
  const label = speedToLabel(sliderValue);

  const statusText = holderAway
    ? "Aguardando a outra pessoa reconectar..."
    : isHolder
      ? "Você está ajustando o ritmo"
      : hasHolder
        ? "A outra pessoa está ajustando o ritmo"
        : "Ninguém está ajustando o ritmo";

  return (
    <div className="rhythm-card">
      <p className="rhythm-eyebrow rhythm-enter">Ritmo</p>
      <h1 className="rhythm-title rhythm-enter" style={{ animationDelay: "40ms" }}>
        Encontre seu ritmo
      </h1>
      <p className="rhythm-subtitle rhythm-enter" style={{ animationDelay: "80ms" }}>
        Acompanhe o movimento e ajuste até encontrar a intensidade que funciona para você.
      </p>

      <div className="rhythm-enter-stage" style={{ width: "100%", animationDelay: "120ms" }}>
        <RhythmTrack interpolator={interpolator} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <p className="rhythm-value">{multiplier.toFixed(1)}×</p>
        <p className="rhythm-value-label">Ritmo {label}</p>
      </div>

      <p className="rhythm-holder-status">
        {statusText}
        {!isHolder && <button onClick={onClaim}>Assumir</button>}
      </p>

      <div className="rhythm-enter" style={{ width: "100%", display: "flex", justifyContent: "center", animationDelay: "160ms" }}>
        <RhythmSlider
          value={sliderValue}
          disabled={!isHolder}
          onChange={(v) => {
            draggingRef.current = true;
            setSliderValue(v);
            sendThrottled(v);
          }}
          onCommit={(v) => {
            draggingRef.current = false;
            setSliderValue(v);
            sendThrottled(v, true);
          }}
        />
      </div>

      <p className="rhythm-footer">Deixe o movimento guiar você.</p>
    </div>
  );
}
