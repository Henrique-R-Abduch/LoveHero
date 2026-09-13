import { useEffect, useRef } from "react";
import type { TickInterpolator } from "../lib/interpolation";
import { Spring } from "../lib/spring";
import { tokens } from "../styles/tokens";

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const ACCENT_RGB = hexToRgb(tokens.accent);
const IDLE_BREATH_HZ = 0.12; // slower than the room's own neutral 0.3Hz — a calmer, "breathing" cadence

/**
 * Same orb used in the room, in two modes:
 * - live (default): driven by a TickInterpolator fed from the server.
 * - idle: no server connection at all (used as the landing page's hero) —
 *   a local, low-intensity breathing animation. Same rendering, same
 *   physics, just a gentler standalone motion instead of live sync data.
 */
export function SyncCanvas({
  interpolator,
  idle = false,
}: {
  interpolator?: TickInterpolator;
  idle?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    reducedMotionQuery.addEventListener("change", onMotionChange);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const ballSpring = new Spring(0.5);
    const glowSpring = new Spring(0.5);
    let smoothedSpeed = 0.5;
    let idlePhase = 0;
    let lastTime: number | null = null;
    let frame = requestAnimationFrame(draw);

    function draw(time: number) {
      if (!ctx || !canvas) return;
      const dt = lastTime === null ? 1 / 60 : (time - lastTime) / 1000;
      lastTime = time;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      let target: number;
      let targetSpeed: number;
      if (idle) {
        idlePhase += 2 * Math.PI * IDLE_BREATH_HZ * dt;
        target = (Math.sin(idlePhase) + 1) / 2;
        targetSpeed = 0; // no scale pulse in idle — it's a calm resting state, not "fast"
      } else {
        const sample = interpolator?.sample() ?? null;
        target = sample?.x ?? 0.5;
        targetSpeed = sample?.speed ?? 0.5;
      }

      let ballX = target;
      let glowX = target;
      let scale = 1;

      if (reducedMotion) {
        ballSpring.snapTo(target);
        glowSpring.snapTo(target);
      } else {
        ballX = ballSpring.update(target, dt);
        glowX = glowSpring.update(ballSpring.value, dt, 70, 20); // softer + lower damping ratio → visibly trails
        smoothedSpeed += (targetSpeed - smoothedSpeed) * Math.min(dt * 4, 1);
        scale = 1 + smoothedSpeed * 0.15;
      }

      const padding = height * 0.18;
      const trackY = height / 2;
      const toPixelX = (v: number) => padding + v * (width - padding * 2);

      // Track — a quiet, static reference line, not itself animated.
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = Math.max(2, height * 0.012);
      ctx.beginPath();
      ctx.moveTo(padding, trackY);
      ctx.lineTo(width - padding, trackY);
      ctx.stroke();

      const ballRadius = height * 0.09 * scale;

      if (!reducedMotion) {
        const glowRadius = ballRadius * 3.4;
        const glowAlpha = idle ? 0.18 : 0.35; // "baixa intensidade" for the idle hero
        const gradient = ctx.createRadialGradient(
          toPixelX(glowX),
          trackY,
          0,
          toPixelX(glowX),
          trackY,
          glowRadius,
        );
        gradient.addColorStop(0, `rgba(${ACCENT_RGB}, ${glowAlpha})`);
        gradient.addColorStop(1, `rgba(${ACCENT_RGB}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(toPixelX(glowX), trackY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(toPixelX(ballX), trackY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = tokens.accent;
      ctx.fill();

      frame = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      reducedMotionQuery.removeEventListener("change", onMotionChange);
    };
  }, [interpolator, idle]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "min(84vw, 320px)",
        aspectRatio: "1 / 1",
        display: "block",
      }}
    />
  );
}
