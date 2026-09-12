import type { SyncTick } from "@syncroom/shared";

/**
 * Buffers the last two SyncTicks from the server and interpolates between
 * them for smooth 60fps rendering, instead of snapping the ball to a new
 * position every time a tick arrives (~30Hz) — the same technique real-time
 * multiplayer netcode uses to hide network jitter.
 */
export class TickInterpolator {
  private previous: SyncTick | null = null;
  private current: SyncTick | null = null;
  private readonly renderDelayMs: number;

  constructor(renderDelayMs = 100) {
    this.renderDelayMs = renderDelayMs;
  }

  push(tick: SyncTick): void {
    this.previous = this.current;
    this.current = tick;
  }

  /** Returns the interpolated position (0-1) to render right now. */
  sample(now: number = Date.now()): { x: number; pattern: string } | null {
    if (!this.current) return null;
    if (!this.previous) return { x: this.current.x, pattern: this.current.pattern };

    const renderTime = now - this.renderDelayMs;
    const span = this.current.t - this.previous.t || 1;
    const alpha = clamp((renderTime - this.previous.t) / span, 0, 1);
    const x = this.previous.x + (this.current.x - this.previous.x) * alpha;
    return { x, pattern: this.current.pattern };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
