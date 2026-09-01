import { useEffect, useRef } from "react";
import { cn } from "../../utils";

type NebulaCloud = {
  x: number;
  y: number;
  radius: number;
  rgb: readonly [number, number, number];
  driftX: number;
  driftY: number;
  phase: number;
  peak: number;
};

type NebulaStar = {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
};

const CLOUDS: NebulaCloud[] = [
  { x: 0.15, y: 0.28, radius: 0.55, rgb: [168, 85, 247], driftX: 0.09, driftY: 0.06, phase: 0, peak: 0.58 },
  { x: 0.78, y: 0.42, radius: 0.58, rgb: [139, 92, 246], driftX: 0.07, driftY: 0.05, phase: 1.3, peak: 0.52 },
  { x: 0.42, y: 0.72, radius: 0.48, rgb: [96, 165, 250], driftX: 0.06, driftY: 0.07, phase: 2.1, peak: 0.48 },
  { x: 0.22, y: 0.55, radius: 0.4, rgb: [56, 189, 248], driftX: 0.05, driftY: 0.06, phase: 3.4, peak: 0.44 },
  { x: 0.88, y: 0.18, radius: 0.34, rgb: [251, 191, 36], driftX: 0.04, driftY: 0.03, phase: 4.2, peak: 0.28 },
  { x: 0.52, y: 0.14, radius: 0.42, rgb: [192, 132, 252], driftX: 0.06, driftY: 0.04, phase: 5.0, peak: 0.46 },
  { x: 0.62, y: 0.58, radius: 0.36, rgb: [124, 58, 237], driftX: 0.05, driftY: 0.05, phase: 2.8, peak: 0.38 },
];

function buildStars(count: number): NebulaStar[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.8 + 0.35,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 2.2 + 0.8,
  }));
}

type NebulaBackgroundProps = {
  className?: string;
  paused?: boolean;
};

export function NebulaBackground({ className, paused = false }: NebulaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<NebulaStar[] | null>(null);

  useEffect(() => {
    if (paused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!starsRef.current) {
      starsRef.current = buildStars(120);
    }

    let raf = 0;
    let width = 0;
    let height = 0;
    let inView = true;
    let tabVisible = document.visibilityState !== "hidden";
    const start = performance.now();

    const stopLoop = () => {
      if (raf === 0) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const startLoop = () => {
      if (raf !== 0 || !inView || !tabVisible) return;
      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;

      if (width === 0 || height === 0) return;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    window.addEventListener("resize", resize);
    resize();

    const draw = (now: number) => {
      raf = 0;
      if (!inView || !tabVisible || width === 0 || height === 0) return;

      const time = (now - start) * 0.001;
      const minDim = Math.min(width, height);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#05040c");
      bg.addColorStop(0.45, "#0a0618");
      bg.addColorStop(1, "#030812");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      for (const cloud of CLOUDS) {
        const cx =
          (cloud.x + Math.sin(time * 0.14 + cloud.phase) * cloud.driftX) * width;
        const cy =
          (cloud.y + Math.cos(time * 0.11 + cloud.phase * 1.1) * cloud.driftY) * height;
        const radius = cloud.radius * minDim;
        const [r, g, b] = cloud.rgb;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(${r},${g},${b},${cloud.peak})`);
        grad.addColorStop(0.28, `rgba(${r},${g},${b},${cloud.peak * 0.55})`);
        grad.addColorStop(0.62, `rgba(${r},${g},${b},${cloud.peak * 0.18})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.globalCompositeOperation = "source-over";

      for (const star of starsRef.current ?? []) {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.9})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio > 0;
        if (inView && tabVisible) startLoop();
        else stopLoop();
      },
      { threshold: [0, 0.01] },
    );
    intersectionObserver.observe(canvas);

    const onVisibilityChange = () => {
      tabVisible = document.visibilityState !== "hidden";
      if (tabVisible && inView) startLoop();
      else stopLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    startLoop();

    return () => {
      stopLoop();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [paused]);

  if (paused) {
    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#2e1064_0%,#0a0618_45%,#030712_100%)]",
          className,
        )}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
