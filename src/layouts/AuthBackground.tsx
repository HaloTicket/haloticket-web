import { useEffect, useMemo, useRef } from "react";

const WIDTH = 1600;
const STEP = 32;

// a small seeded generator so the stars and the soft lights sit in the same places on every render (no Math.random).
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
type Point = [number, number];

// catmull-Rom through the points, written as cubic Beziers so the edge of a ribbon is smooth.
function curve(points: Point[]) {
  let d = "";
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

interface RibbonSpec {
  offset: number;
  amp: number;
  freq: number;
  phase: number;
  width: number;
  widthFreq: number;
  widthPhase: number;
  speed: number; // radians per millisecond: how fast the wave travels along the ribbon
  tone: "a" | "b" | "c";
  opacity: number;
  line?: "soft" | "neon";
}

// ribbons start close together at the left edge and fan out as they rise to the right, crossing like glass.
const RIBBONS: RibbonSpec[] = [
  { offset: -170, amp: 16, freq: 0.0042, phase: 0.4, width: 30, widthFreq: 0.003, widthPhase: 1.1, speed: 0.00042, tone: "a", opacity: 0.5 },
  { offset: -105, amp: 20, freq: 0.0036, phase: 2.0, width: 44, widthFreq: 0.0034, widthPhase: 0.2, speed: 0.00035, tone: "b", opacity: 0.62, line: "soft" },
  { offset: -45, amp: 14, freq: 0.0046, phase: 1.2, width: 36, widthFreq: 0.0028, widthPhase: 2.4, speed: 0.0005, tone: "c", opacity: 0.75, line: "neon" },
  { offset: 10, amp: 18, freq: 0.0038, phase: 3.1, width: 56, widthFreq: 0.0031, widthPhase: 0.7, speed: 0.0003, tone: "a", opacity: 0.7, line: "soft" },
  { offset: 62, amp: 12, freq: 0.0049, phase: 0.9, width: 40, widthFreq: 0.0036, widthPhase: 1.9, speed: 0.00046, tone: "b", opacity: 0.6 },
  { offset: 112, amp: 16, freq: 0.004, phase: 2.6, width: 34, widthFreq: 0.0029, widthPhase: 0.4, speed: 0.00038, tone: "c", opacity: 0.7, line: "neon" },
  { offset: 168, amp: 14, freq: 0.0044, phase: 1.7, width: 58, widthFreq: 0.0033, widthPhase: 2.8, speed: 0.00033, tone: "a", opacity: 0.45 },
];

interface Pull {
  x: number; // pointer position in the drawing's own 1600 x 900 space
  y: number;
  strength: number; // 0 when the pointer rests, 1 while it moves
}

// the outline of one ribbon at time t (ms). Near the pointer the ribbon is drawn toward it, ripples and swells
function ribbonPaths(spec: RibbonSpec, t: number, pull: Pull | null) {
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let x = 0; x <= WIDTH; x += STEP) {
    const fan = 0.22 + 0.78 * smooth(x / WIDTH);
    const base = 815 - 450 * smooth((x - 280) / 1320);
    const travel = t * spec.speed;
    let center = base + spec.offset * fan + spec.amp * Math.sin(x * spec.freq + spec.phase + travel);
    let half = spec.width * (0.35 + 0.65 * fan) * (0.72 + 0.28 * Math.sin(x * spec.widthFreq + spec.widthPhase + travel * 0.5));
    if (pull && pull.strength > 0.002) {
      const reach = Math.exp(-((x - pull.x) ** 2) / (2 * 240 * 240));
      center += (pull.y - center) * 0.3 * pull.strength * reach;
      center += Math.sin((x - pull.x) * 0.025 - t * 0.008) * 16 * pull.strength * reach;
      half *= 1 + 0.55 * pull.strength * reach;
    }
    top.push([x, center - half]);
    bottom.push([x, center + half]);
  }
  const reversed = [...bottom].reverse();
  const area = `M${top[0][0]},${top[0][1].toFixed(1)}${curve(top)} L${reversed[0][0]},${reversed[0][1].toFixed(1)}${curve(reversed)} Z`;
  const edge = `M${top[0][0]},${top[0][1].toFixed(1)}${curve(top)}`;
  return { area, edge };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
  star: boolean;
}
interface Ring {
  x: number;
  y: number;
  life: number;
  max: number;
}

const COLORS_DARK = ["#7dd3fc", "#a78bfa", "#ffffff", "#38bdf8"];
const COLORS_LIGHT = ["#3b82f6", "#a78bfa", "#60a5fa", "#e879f9"];
const MAX_PARTICLES = 160;

export function AuthBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const wavesRef = useRef<HTMLDivElement>(null);
  const waveSvgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRefs = useRef<(SVGPathElement | null)[]>([]);
  const edgeRefs = useRef<(SVGPathElement | null)[]>([]);
  const glowRefs = useRef<(SVGPathElement | null)[]>([]);

  const { initial, stars, sparkles, bokeh } = useMemo(() => {
    const random = seeded(20261106);
    // keep the stars off the logo and the language / theme buttons at the top corners
    const clear = (x: number, y: number) => !(y < 220 && (x < 520 || x > 1180));
    const place = (count: number, yMax: number, margin: number) => {
      const out: { x: number; y: number }[] = [];
      while (out.length < count) {
        const x = margin + random() * (WIDTH - 2 * margin);
        const y = margin + random() * (yMax - margin);
        if (clear(x, y)) out.push({ x, y });
      }
      return out;
    };
    return {
      initial: RIBBONS.map((spec) => ribbonPaths(spec, 0, null)),
      stars: place(110, 740, 10).map((p, i) => ({ id: i, ...p, r: 0.5 + random() * 1.3, delay: random() * 6, duration: 3 + random() * 4 })),
      sparkles: place(12, 700, 90).map((p, i) => ({ id: i, ...p, scale: 0.55 + random() * 1.1, delay: random() * 5 })),
      bokeh: place(18, 840, 40).map((p, i) => ({ id: i, ...p, r: 8 + random() * 26, o: 0.3 + random() * 0.6 })),
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const svg = waveSvgRef.current;
    const canvas = canvasRef.current;
    if (!root || !svg || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return undefined; // the first paint is already the calm, still picture

    const pointer = { tx: 800, ty: 500, x: 800, y: 500, sx: 0, sy: 0, tsx: 0, tsy: 0, nx: 0, ny: 0, tnx: 0, tny: 0, s: 0, lastMove: -1e9 };
    const particles: Particle[] = [];
    const rings: Ring[] = [];
    let lastX = -1;
    let lastY = -1;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const toDrawing = (clientX: number, clientY: number) => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    };

    const spark = (x: number, y: number, speed: number, star: boolean) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.8);
      particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 0.25,
        life: 700 + Math.random() * 600,
        max: 1300,
        size: 1.2 + Math.random() * 2.4,
        color: Math.floor(Math.random() * 4),
        star,
      });
    };

    const onMove = (event: PointerEvent) => {
      const point = toDrawing(event.clientX, event.clientY);
      if (point) {
        pointer.tx = point.x;
        pointer.ty = point.y;
      }
      pointer.tsx = event.clientX;
      pointer.tsy = event.clientY;
      pointer.tnx = event.clientX / Math.max(1, width) - 0.5;
      pointer.tny = event.clientY / Math.max(1, height) - 0.5;
      pointer.lastMove = performance.now();
      if (event.pointerType !== "touch") {
        if (lastX >= 0) {
          const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
          const count = Math.min(4, Math.floor(distance / 10));
          for (let i = 0; i < count; i += 1) spark(event.clientX, event.clientY, 0.9, Math.random() < 0.2);
        }
        lastX = event.clientX;
        lastY = event.clientY;
      }
    };
    const onDown = (event: PointerEvent) => {
      // clicks on the form, the header buttons and links are not decoration
      if ((event.target as Element | null)?.closest?.(".auth-panel, button, a, input, select, textarea")) return;
      for (let i = 0; i < 24; i += 1) spark(event.clientX, event.clientY, 3.2, i % 4 === 0);
      rings.push({ x: event.clientX, y: event.clientY, life: 700, max: 700 });
    };
    const onLeave = () => { pointer.lastMove = -1e9; lastX = -1; };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, last ? now - last : 16);
      last = now;
      const follow = 1 - Math.exp(-dt / 110);
      pointer.x += (pointer.tx - pointer.x) * follow;
      pointer.y += (pointer.ty - pointer.y) * follow;
      pointer.sx += (pointer.tsx - pointer.sx) * follow;
      pointer.sy += (pointer.tsy - pointer.sy) * follow;
      const slow = 1 - Math.exp(-dt / 260);
      pointer.nx += (pointer.tnx - pointer.nx) * slow;
      pointer.ny += (pointer.tny - pointer.ny) * slow;
      const resting = now - pointer.lastMove > 1800;
      pointer.s += ((resting ? 0 : 1) - pointer.s) * (1 - Math.exp(-dt / (resting ? 700 : 200)));

      const pull: Pull = { x: pointer.x, y: pointer.y, strength: pointer.s };
      RIBBONS.forEach((spec, i) => {
        const { area, edge } = ribbonPaths(spec, now, pull);
        areaRefs.current[i]?.setAttribute("d", area);
        edgeRefs.current[i]?.setAttribute("d", edge);
        glowRefs.current[i]?.setAttribute("d", edge);
      });

      // layers drift at different depths, opposite to the pointer; the pointer itself lights the stars and the glow
      if (farRef.current) farRef.current.style.transform = `translate3d(${(-pointer.nx * 36).toFixed(1)}px, ${(-pointer.ny * 20).toFixed(1)}px, 0)`;
      if (starsRef.current) starsRef.current.style.transform = `translate3d(${(pointer.nx * 18).toFixed(1)}px, ${(pointer.ny * 10).toFixed(1)}px, 0)`;
      if (wavesRef.current) wavesRef.current.style.transform = `translate3d(${(-pointer.nx * 26).toFixed(1)}px, ${(-pointer.ny * 14).toFixed(1)}px, 0)`;
      root.style.setProperty("--mx", `${pointer.sx.toFixed(1)}px`);
      root.style.setProperty("--my", `${pointer.sy.toFixed(1)}px`);
      root.style.setProperty("--spot", pointer.s.toFixed(3));

      const dark = root.closest(".dark") !== null;
      const colors = dark ? COLORS_DARK : COLORS_LIGHT;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += (p.vx * dt) / 16;
        p.y += (p.vy * dt) / 16;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.004 * dt / 16;
        const alpha = Math.min(1, p.life / p.max) * (dark ? 0.95 : 0.8);
        ctx.fillStyle = colors[p.color];
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        if (p.star) {
          const r = p.size * 2.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r * 0.22, p.y - r * 0.22);
          ctx.lineTo(p.x + r, p.y);
          ctx.lineTo(p.x + r * 0.22, p.y + r * 0.22);
          ctx.lineTo(p.x, p.y + r);
          ctx.lineTo(p.x - r * 0.22, p.y + r * 0.22);
          ctx.lineTo(p.x - r, p.y);
          ctx.lineTo(p.x - r * 0.22, p.y - r * 0.22);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const ring = rings[i];
        ring.life -= dt;
        if (ring.life <= 0) { rings.splice(i, 1); continue; }
        const progress = 1 - ring.life / ring.max;
        ctx.globalAlpha = (1 - progress) * 0.6;
        ctx.strokeStyle = colors[0];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, 10 + progress * 150, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    raf = requestAnimationFrame(frame);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", resize);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className="auth-bg" aria-hidden="true">
      <div className="auth-bg-glows" />

      <div ref={farRef} className="auth-bg-layer">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" focusable="false">
          <defs>
            <radialGradient id="auth-bokeh-fill">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="auth-bg-bokeh">
            {bokeh.map((b) => <circle key={b.id} cx={b.x} cy={b.y} r={b.r} opacity={b.o} fill="url(#auth-bokeh-fill)" />)}
          </g>
        </svg>
      </div>

      <div ref={starsRef} className="auth-bg-layer">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" focusable="false" className="auth-bg-stars">
          {stars.map((s) => (
            <circle
              key={s.id}
              cx={s.x}
              cy={s.y}
              r={s.r}
              className="auth-star"
              style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
            />
          ))}
          {sparkles.map((s) => (
            <path
              key={s.id}
              d="M0,-8 L1.5,-1.5 L8,0 L1.5,1.5 L0,8 L-1.5,1.5 L-8,0 L-1.5,-1.5Z"
              transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${s.scale.toFixed(2)})`}
              className="auth-star auth-star--sparkle"
              style={{ animationDelay: `${s.delay}s` }}
            />
          ))}
        </svg>
        {/* the same stars, bigger and glowing, shown only around the pointer (masked in CSS) */}
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" focusable="false" className="auth-bg-stars auth-bg-stars-bright">
          <defs>
            <radialGradient id="auth-star-glow">
              <stop offset="0" stopColor="#cfe8ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
            </radialGradient>
          </defs>
          {stars.map((s) => (
            <g key={s.id}>
              <circle cx={s.x} cy={s.y} r={s.r * 7} fill="url(#auth-star-glow)" />
              <circle cx={s.x} cy={s.y} r={s.r * 1.5} fill="#ffffff" />
            </g>
          ))}
          {sparkles.map((s) => (
            <path
              key={s.id}
              d="M0,-12 L2,-2 L12,0 L2,2 L0,12 L-2,2 L-12,0 L-2,-2Z"
              transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${(s.scale * 1.3).toFixed(2)})`}
              fill="#ffffff"
            />
          ))}
        </svg>
      </div>

      <div ref={wavesRef} className="auth-bg-layer auth-bg-waves">
        <svg ref={waveSvgRef} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" focusable="false">
          <defs>
            {(["a", "b", "c"] as const).map((tone) => (
              <linearGradient key={tone} id={`auth-wave-${tone}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" className={`auth-stop-${tone}1`} stopOpacity="0" />
                <stop offset="0.2" className={`auth-stop-${tone}1`} stopOpacity="1" />
                <stop offset="0.7" className={`auth-stop-${tone}2`} stopOpacity="1" />
                <stop offset="1" className={`auth-stop-${tone}1`} stopOpacity="0.9" />
              </linearGradient>
            ))}
            <linearGradient id="auth-wave-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className="auth-stop-line" stopOpacity="0" />
              <stop offset="0.35" className="auth-stop-line" stopOpacity="0.9" />
              <stop offset="1" className="auth-stop-line" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {RIBBONS.map((spec, i) => (
            <g key={i}>
              <path
                ref={(node) => { areaRefs.current[i] = node; }}
                d={initial[i].area}
                fill={`url(#auth-wave-${spec.tone})`}
                opacity={spec.opacity}
                className="auth-ribbon"
              />
              {spec.line === "neon" && (
                <path
                  ref={(node) => { glowRefs.current[i] = node; }}
                  d={initial[i].edge}
                  fill="none"
                  stroke="url(#auth-wave-line)"
                  strokeWidth="9"
                  opacity="0.35"
                  className="auth-ribbon-line"
                />
              )}
              {spec.line && (
                <path
                  ref={(node) => { edgeRefs.current[i] = node; }}
                  d={initial[i].edge}
                  fill="none"
                  stroke="url(#auth-wave-line)"
                  strokeWidth="1.3"
                  className="auth-ribbon-line"
                />
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="auth-bg-spot" />
      <canvas ref={canvasRef} className="auth-bg-fx" />
    </div>
  );
}

export default AuthBackground;
