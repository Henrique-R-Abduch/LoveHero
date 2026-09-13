import type { SyncTick } from "@syncroom/shared";
import { config } from "../config.js";

const BASE_SPEED_HZ = 0.3; // neutral cadence with nobody in control
const MIN_SPEED_HZ = 0.1;
const MAX_SPEED_HZ = 1.5;
const SPEED_SMOOTHING_PER_TICK = 0.12; // fraction of the gap closed each tick — tune by feel

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mapControlValueToSpeedHz(value: number): number {
  return MIN_SPEED_HZ + clamp01(value) * (MAX_SPEED_HZ - MIN_SPEED_HZ);
}

/**
 * Server-authoritative sync state for a room. The ball is *never*
 * puppeteered directly — a continuous oscillator drives its position at all
 * times, with or without a control holder. `control_input.value` only sets
 * the oscillator's target speed; the actual speed eases toward that target
 * over a handful of ticks, and phase always accumulates forward, so the
 * ball's position never jumps when speed changes, only its cadence does.
 */
export class SyncEngine {
  private timer: NodeJS.Timeout | null = null;
  private lastTickAt = Date.now();

  private phase = 0; // radians, monotonically accumulated
  private currentSpeedHz = BASE_SPEED_HZ;

  private controlHolder: string | null = null;
  private controlValue = (BASE_SPEED_HZ - MIN_SPEED_HZ) / (MAX_SPEED_HZ - MIN_SPEED_HZ); // last raw slider value (0-1)

  constructor(private readonly onTick: (tick: SyncTick) => void) {}

  start(): void {
    if (this.timer) return;
    this.lastTickAt = Date.now();
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
    // Deliberately don't touch controlValue/currentSpeedHz/phase — a handoff
    // (or a reconnect) never resets the oscillator, it just changes who's
    // allowed to steer its target speed next.
  }

  /**
   * Sets the target speed via a 0-1 slider value, but only from the current
   * holder — anything else is silently ignored rather than erroring. This
   * never touches position directly; computeTick's smoothing is what makes
   * the transition gradual.
   */
  submitInput(participantId: string, rawValue: number): void {
    if (participantId !== this.controlHolder) return;
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return;
    this.controlValue = clamp01(rawValue);
  }

  private computeTick(): Omit<SyncTick, "type" | "t"> {
    const now = Date.now();
    const dt = Math.min((now - this.lastTickAt) / 1000, 1 / 10); // clamp so a stall doesn't fling the phase
    this.lastTickAt = now;

    const targetSpeedHz = this.controlHolder ? mapControlValueToSpeedHz(this.controlValue) : BASE_SPEED_HZ;
    this.currentSpeedHz += (targetSpeedHz - this.currentSpeedHz) * SPEED_SMOOTHING_PER_TICK;

    this.phase += 2 * Math.PI * this.currentSpeedHz * dt;
    if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2 * Math.floor(this.phase / (Math.PI * 2));

    const x = (Math.sin(this.phase) + 1) / 2;
    const speed = clamp01((this.currentSpeedHz - MIN_SPEED_HZ) / (MAX_SPEED_HZ - MIN_SPEED_HZ));
    const pattern = this.controlHolder ? "controlled" : "sine-default";
    return { x, speed, pattern };
  }
}
