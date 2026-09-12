import { useEffect, useRef } from "react";
import { TickInterpolator } from "../lib/interpolation";

export function SyncCanvas({ interpolator }: { interpolator: TickInterpolator }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = requestAnimationFrame(draw);

    function draw() {
      if (!ctx || !canvas) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "#332b47";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(24, height / 2);
      ctx.lineTo(width - 24, height / 2);
      ctx.stroke();

      const sample = interpolator.sample();
      const x = sample ? 24 + sample.x * (width - 48) : width / 2;

      ctx.beginPath();
      ctx.arc(x, height / 2, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#c9a4ff";
      ctx.fill();

      frame = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(frame);
  }, [interpolator]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={120}
      style={{ width: "100%", maxWidth: 360, height: 120, background: "#161320", borderRadius: 12 }}
    />
  );
}
