/**
 * Minimal damped-spring integrator for a single scalar. Underdamped on
 * purpose (damping below critical) so the value overshoots its target a
 * touch before settling, instead of easing straight to it.
 */
export class Spring {
  value: number;
  private velocity = 0;

  constructor(initial: number) {
    this.value = initial;
  }

  update(target: number, dtSeconds: number, stiffness = 170, damping = 18): number {
    const dt = Math.min(dtSeconds, 1 / 30); // clamp so a stalled tab doesn't fling the value
    const force = (target - this.value) * stiffness;
    const drag = this.velocity * damping;
    this.velocity += (force - drag) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  snapTo(value: number): void {
    this.value = value;
    this.velocity = 0;
  }
}
