import { useEffect, useRef } from "react";
import type { TickInterpolator } from "../../lib/interpolation";
import { Spring } from "../../lib/spring";

const CENTER = 0.5;
const EDGE_ZONE = 0.03; // how close to 0/1 counts as "at the extremity" for the marker bounce
const STAGE_INSET_PX = 30; // must match --rhythm-inset in rhythm.css

const CENTER_CORE_KEYFRAMES: Keyframe[] = [
  { transform: "translate(-50%, -50%) scale(1)" },
  { transform: "translate(-50%, -50%) scale(1.25)" },
  { transform: "translate(-50%, -50%) scale(1)" },
];
const CENTER_RING_KEYFRAMES: Keyframe[] = [
  { transform: "scale(0.8)", opacity: 0.45 },
  { transform: "scale(2.4)", opacity: 0 },
];
const EDGE_MARKER_KEYFRAMES: Keyframe[] = [
  { transform: "translate(-50%, -50%) scale(1)", background: "rgba(255,255,255,0.12)" },
  { transform: "translate(-50%, -50%) scale(1.4)", background: "var(--color-accent)" },
  { transform: "translate(-50%, -50%) scale(1)", background: "rgba(255,255,255,0.12)" },
];
const ORB_BUMP_KEYFRAMES: Keyframe[] = [
  { transform: "translate(-50%, -50%) scale(1)" },
  { transform: "translate(-50%, -50%) scale(1.035)" },
  { transform: "translate(-50%, -50%) scale(1)" },
];

export function RhythmTrack({ interpolator }: { interpolator: TickInterpolator }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const orbPosRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const glowNearPosRef = useRef<HTMLDivElement | null>(null);
  const glowFarPosRef = useRef<HTMLDivElement | null>(null);
  const centerCoreRef = useRef<HTMLDivElement | null>(null);
  const centerRingRef = useRef<HTMLDivElement | null>(null);
  const endLeftRef = useRef<HTMLDivElement | null>(null);
  const endRightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    reducedMotionQuery.addEventListener("change", onMotionChange);

    let stageWidth = stage.getBoundingClientRect().width;
    const measure = () => {
      stageWidth = stage.getBoundingClientRect().width;
    };
    measure();
    window.addEventListener("resize", measure);

    const ballSpring = new Spring(CENTER);
    const glowSpring = new Spring(CENTER);
    let prevBallX: number | null = null;
    let wasNearLeftEdge = false;
    let wasNearRightEdge = false;
    let lastTime: number | null = null;
    let frame = requestAnimationFrame(draw);

    function toPixelX(v: number): number {
      const usable = Math.max(0, stageWidth - STAGE_INSET_PX * 2);
      return STAGE_INSET_PX + v * usable;
    }

    function playPulses() {
      if (reducedMotion) return;
      centerCoreRef.current?.animate(CENTER_CORE_KEYFRAMES, { duration: 220, easing: "cubic-bezier(0.22,1,0.36,1)" });
      centerRingRef.current?.animate(CENTER_RING_KEYFRAMES, { duration: 480, easing: "ease-out" });
      orbRef.current?.animate(ORB_BUMP_KEYFRAMES, { duration: 180, easing: "ease-out" });
    }

    function playEdgeBounce(el: HTMLDivElement | null) {
      if (reducedMotion || !el) return;
      el.animate(EDGE_MARKER_KEYFRAMES, { duration: 300, easing: "cubic-bezier(0.22,1,0.36,1)" });
    }

    function draw(time: number) {
      const dt = lastTime === null ? 1 / 60 : (time - lastTime) / 1000;
      lastTime = time;

      const sample = interpolator.sample();
      const target = sample?.x ?? CENTER;

      let ballX = target;
      let glowX = target;
      if (reducedMotion) {
        ballSpring.snapTo(target);
        glowSpring.snapTo(target);
      } else {
        ballX = ballSpring.update(target, dt);
        glowX = glowSpring.update(ballSpring.value, dt, 70, 20); // softer/lower-damping → visibly trails
      }

      if (orbPosRef.current) orbPosRef.current.style.transform = `translateX(${toPixelX(ballX)}px)`;
      if (glowNearPosRef.current) glowNearPosRef.current.style.transform = `translateX(${toPixelX(glowX)}px)`;
      if (glowFarPosRef.current) glowFarPosRef.current.style.transform = `translateX(${toPixelX(glowX)}px)`;

      // Center-crossing pulse: fire exactly once per crossing, in either
      // direction, based on the sign change of (x - center) — not a timer.
      if (prevBallX !== null && prevBallX !== ballX) {
        const crossedUp = prevBallX < CENTER && ballX >= CENTER;
        const crossedDown = prevBallX > CENTER && ballX <= CENTER;
        if (crossedUp || crossedDown) playPulses();
      }
      prevBallX = ballX;

      // End-marker bounce: fire once per approach to either extremity —
      // requires leaving the zone before it can fire again.
      const nearLeft = ballX <= EDGE_ZONE;
      const nearRight = ballX >= 1 - EDGE_ZONE;
      if (nearLeft && !wasNearLeftEdge) playEdgeBounce(endLeftRef.current);
      if (nearRight && !wasNearRightEdge) playEdgeBounce(endRightRef.current);
      wasNearLeftEdge = nearLeft;
      wasNearRightEdge = nearRight;

      frame = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      reducedMotionQuery.removeEventListener("change", onMotionChange);
    };
  }, [interpolator]);

  return (
    <div className="rhythm-stage" ref={stageRef}>
      <div className="rhythm-track-line__blur" />
      <div className="rhythm-track-line" />

      <div className="rhythm-end-marker rhythm-end-marker--left" ref={endLeftRef} />
      <div className="rhythm-end-marker rhythm-end-marker--right" ref={endRightRef} />

      <div className="rhythm-center-marker">
        <div className="rhythm-center-marker__ring" ref={centerRingRef} />
        <div className="rhythm-center-marker__core" ref={centerCoreRef} />
      </div>

      <div className="rhythm-orb-glow-far-pos" ref={glowFarPosRef}>
        <div className="rhythm-orb-glow-far" />
      </div>
      <div className="rhythm-orb-glow-near-pos" ref={glowNearPosRef}>
        <div className="rhythm-orb-glow-near" />
      </div>
      <div className="rhythm-orb-pos" ref={orbPosRef}>
        <div className="rhythm-orb" ref={orbRef} />
      </div>
    </div>
  );
}
