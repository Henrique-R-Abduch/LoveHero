import type { SyncTick } from "@syncroom/shared";
import { config } from "../config.js";

const MAX_VALUE_DELTA_PER_INPUT = 0.25;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Server-authoritative sync state for a room. Normally relays whatever the
 * current control holder sends. While no one has claimed control yet (fresh
 * room, or right after the holder leaves for good), falls back to a
 * deterministic idle waveform so the room isn't visually "dead" before
 * anyone touches the control strip.
 */
export class SyncEngine {
  private readonly startedAt = Date.now();
  private timer: NodeJS.Timeout | null = null;

  private controlHolder: string | null = null;
  private controlValue = 0.5;

  constructor(private readonly onTick: (tick: SyncTick) => void) {}

  start(): void {
    if (this.timer) return;
    const intervalMs = Math.round(1000 / config.syncTickHz);
    this.timer = setInterval(() => {
      const tick: SyncTick = { type: "sync", t: Date.now(), ...this.computeTick() };
      this.onTick(tick);
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getControlHolder(): string | null {
    return this.controlHolder;
  }

  /** Anyone can claim control at any time — no permission negotiation in the MVP. */
  setControlHolder(participantId: string | null): void {
    this.controlHolder = participantId;
  }

  /**
   * Relays a control input, but only from the current holder — anything
   * else is silently ignored rather than erroring. Clamps both the value
   * itself and the max change per input, so a slipped finger or a malformed
   * client can't make the ball jump instantly across the whole range.
   */
  submitInput(participantId: string, rawValue: number): void {
    if (participantId !== this.controlHolder) return;
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return;

    const target = clamp01(rawValue);
    const delta = target - this.controlValue;
    const limitedDelta = Math.sign(delta) * Math.min(Math.abs(delta), MAX_VALUE_DELTA_PER_INPUT);
    this.controlValue = clamp01(this.controlValue + limitedDelta);
  }

  private computeTick(): Omit<SyncTick, "type" | "t"> {
    if (this.controlHolder) {
      // Frozen at the last relayed value whenever the holder stops sending
      // input (e.g. they disconnected) — no extra "freeze" logic needed.
      return { x: this.controlValue, speed: 0.5, pattern: "controlled" };
    }
    return { ...idleWave(this.startedAt), speed: 0.5, pattern: "sine-default" };
  }
}

function idleWave(startedAt: number): { x: number } {
  const elapsedSec = (Date.now() - startedAt) / 1000;
  const periodSec = 6;
  const phase = (elapsedSec % periodSec) / periodSec;
  return { x: (Math.sin(phase * Math.PI * 2) + 1) / 2 };
}
