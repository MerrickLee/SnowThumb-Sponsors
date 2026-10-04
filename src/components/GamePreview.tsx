"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * In-game preview: a small 3D copy of the indoor park, built from the same sizes the
 * game uses (SponsorFeatureWraps / STBS_SponsorSlot), with the sponsor's art on it.
 * Art surfaces are unlit, like in the game, so colors match what players see.
 * It's a close stand-in for the game, not a capture of it.
 */

export type PreviewArt = {
  banner?: string;
  rail?: string;
  box?: string;
  kicker?: string;
  board?: string;
  event?: string;
};

export type PreviewView = "riding" | "gate" | "wall" | "rail" | "box" | "kicker" | "board" | "boardroom" | "event";

export const VIEW_LABEL: Record<PreviewView, string> = {
  riding: "Riding",
  gate: "Start gate",
  wall: "Wall banner",
  rail: "Rail",
  box: "Box",
  kicker: "Kicker",
  board: "Under your feet",
  boardroom: "Board room",
  event: "Night session",
};

const VIEW_NOTE: Record<PreviewView, string> = {
  riding: "What a player sees mid-run. Your banners line both walls and the side boards, and pass by in a second or two, so big, simple logos read best.",
  gate: "The start gate, seen before every run starts.",
  wall: "Wall boards along the hall. Art is fitted inside a white board with SnowThumb trim, never stretched.",
  rail: "Rails get a strip on both sides, below the riding edge.",
  box: "The box top runs along the box. Riders see it sideways as they ride onto it, so keep the logo simple.",
  kicker: "The kicker face, facing riders on the way in.",
  board: "First person: this is what players look down at the whole run. The nose is at the top of your file. The bindings cover the two blue areas on the template.",
  boardroom: "Where players pick their board.",
  event: "Title card for the night session event.",
};

const TEMPLATE: Required<PreviewArt> = {
  banner: "/sponsor-kit/park_banner_left_wall.png",
  rail: "/sponsor-kit/rail_wrap_main.png",
  box: "/sponsor-kit/box_top_rainbow.png",
  kicker: "/sponsor-kit/kicker_face_main.png",
  board: "/sponsor-kit/board_twin_v1.png",
  event: "/sponsor-kit/event_title.png",
};

const NAVY = 0x0b2a4a, BLUE = 0x1677d2, PAD = 0x1f5fae, WALL = 0xdfe5ea, STEEL = 0x8b939b;

function fitAspect(aspect: number, bx: number, by: number) {
  const w = Math.min(bx, by * aspect);
  return [w, w / aspect] as const;
}

function snowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4f6f8"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 228 + Math.floor(Math.random() * 22);
    g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  g.strokeStyle = "rgba(170,180,195,.18)"; g.lineWidth = 1;
  for (let x = 0; x < 256; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } // corduroy
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 120);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Built = { scene: THREE.Scene; boardRig: THREE.Group; dispose: () => void };

function build(art: Required<PreviewArt>, onLoaded: () => void): Built {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7edf2);
  scene.fog = new THREE.Fog(0xe7edf2, 60, 190);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd8e2, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(10, 30, 10);
  scene.add(sun);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const lit = (color: number) => track(new THREE.MeshLambertMaterial({ color }));
  const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), m);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  let pending = 0;
  const textures = new Map<string, { tex: THREE.Texture; aspect: Promise<number> }>();
  const tex = (url: string) => {
    if (!textures.has(url)) {
      pending++;
      let resolve!: (n: number) => void;
      const aspect = new Promise<number>((r) => (resolve = r));
      const t = loader.load(url, (tt) => {
        const img = tt.image as HTMLImageElement;
        resolve(img.width / img.height);
        if (--pending === 0) onLoaded();
      }, undefined, () => { resolve(4); if (--pending === 0) onLoaded(); });
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      track(t);
      textures.set(url, { tex: t, aspect });
    }
    return textures.get(url)!;
  };
  // Unlit like the game's sponsor material (URP Unlit), so colors are exact.
  const artMat = (url: string) => track(new THREE.MeshBasicMaterial({ map: tex(url).tex, transparent: true }));
  const quad = (url: string, w: number, h: number) => new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), artMat(url));

  // ---- Hall: snow, walls, padding, trusses ----
  const snowMap = track(snowTexture());
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(48, 200)), track(new THREE.MeshLambertMaterial({ map: snowMap })));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -70;
  scene.add(floor);
  for (const side of [-1, 1]) {
    const wall = box(0.4, 16, 200, lit(WALL)); wall.position.set(side * 22, 8, -70); scene.add(wall);
    const pad = box(0.3, 1.4, 200, lit(PAD)); pad.position.set(side * 21.7, 0.7, -70); scene.add(pad);
    for (let z = 16; z > -170; z -= 16) {
      const col = box(0.6, 16, 0.6, lit(0xc9d1d9)); col.position.set(side * 21.5, 8, z); scene.add(col);
    }
  }
  const back = box(48, 16, 0.4, lit(WALL)); back.position.set(0, 8, -165); scene.add(back);
  for (let z = 16; z > -170; z -= 8) {
    const beam = box(44, 0.5, 0.5, lit(STEEL)); beam.position.set(0, 15, z); scene.add(beam);
    const chord = box(44, 0.18, 0.18, lit(STEEL)); chord.position.set(0, 13.8, z); scene.add(chord);
  }
  for (const x of [-14, -7, 0, 7, 14]) {
    const run = box(0.35, 0.35, 190, lit(0xa9b1b9)); run.position.set(x, 14.4, -70); scene.add(run);
  }

  // ---- Banner boards (STBS_SponsorSlot formats) ----
  const bannerAspect = tex(art.banner).aspect;
  const board = (format: "wall" | "blade", parent: THREE.Object3D) => {
    const [bw, bh, fx, fy] = format === "wall" ? [8, 2.8, 7.5, 2.24] : [5, 2, 4.5, 1.45];
    const g = new THREE.Group();
    const face = box(bw, bh, 0.12, lit(0xffffff)); face.position.y = bh / 2; g.add(face);
    const trimT = box(bw, 0.12, 0.14, lit(NAVY)); trimT.position.y = bh - 0.06; g.add(trimT);
    const trimB = box(bw, 0.22, 0.14, lit(BLUE)); trimB.position.y = 0.11; g.add(trimB);
    const art1 = quad(art.banner, 1, 1); art1.position.set(0, bh / 2, 0.075); g.add(art1);
    const art2 = quad(art.banner, 1, 1); art2.position.set(0, bh / 2, -0.075); art2.rotation.y = Math.PI; g.add(art2);
    bannerAspect.then((a) => { const [w, h] = fitAspect(a, fx, fy); art1.scale.set(w, h, 1); art2.scale.set(w, h, 1); });
    parent.add(g);
    return g;
  };
  // Start gate: posts + overhead board, facing riders before the drop.
  for (const x of [-4.4, 4.4]) { const p = box(0.4, 7.5, 0.4, lit(NAVY)); p.position.set(x, 3.75, 0); scene.add(p); }
  const gate = board("wall", scene); gate.position.set(0, 4.6, 0);
  // Wall boards on both walls, above the padding.
  // One board per other bay, centered between columns so nothing blocks it.
  for (const side of [-1, 1]) for (let z = -8; z > -160; z -= 32) {
    const b = board("wall", scene); b.position.set(side * 21.6, 3.2, z); b.rotation.y = -side * Math.PI / 2;
  }
  // Freestanding blade boards along the slope, angled toward riders coming down.
  for (const side of [-1, 1]) for (const z of [-28, -62, -96, -130]) {
    const b = board("blade", scene); b.position.set(side * 13, 0, z); b.rotation.y = -side * 0.35;
  }
  const finish = board("wall", scene); finish.position.set(0, 3.4, -164.7);

  // ---- Features (SponsorFeatureWraps sizes) ----
  // Rail: solid box rail, wrap strip both sides, 8:1, below the riding edge.
  const rail = new THREE.Group(); rail.position.set(-5, 0, -20); scene.add(rail);
  { const L = 6, H = 0.8, W = 0.12;
    const body = box(W, H, L, lit(0x2b3138)); body.position.y = H / 2; rail.add(body);
    const top = box(W + 0.03, 0.05, L, lit(0xc7ccd1)); top.position.y = H; rail.add(top);
    const h = Math.min(Math.max(H * 0.6, 0.08), 0.5), len = Math.min(L * 0.9, h * 8);
    for (const s of [1, -1]) { const q = quad(art.rail, len, h); q.position.set(s * (W / 2 + 0.012), H * 0.45, 0); q.rotation.y = s * Math.PI / 2; rail.add(q); } }
  // Box: 4:1 strip on top, along the box.
  const fbox = new THREE.Group(); fbox.position.set(6, 0, -36); scene.add(fbox);
  { const L = 6, H = 0.5, W = 0.7;
    const body = box(W, H, L, lit(0x9fb3c8)); body.position.y = H / 2; fbox.add(body);
    const deck = box(W, 0.02, L, lit(0xf2f4f6)); deck.position.y = H; fbox.add(deck);
    const w = Math.max(0.2, W * 0.9), len = Math.min(L * 0.9, w * 4);
    const q = quad(art.box, len, len / 4); q.rotation.set(-Math.PI / 2, 0, Math.PI / 2); q.position.y = H + 0.012; fbox.add(q); }
  // Kicker: snow ramp, 2:1 art in the middle of the takeoff, facing riders.
  const kick = new THREE.Group(); kick.position.set(0, 0, -56); scene.add(kick);
  { const width = 4, run = 4.5, rise = 1.5, slope = Math.atan2(rise, run), len = Math.hypot(run, rise);
    const snow = track(new THREE.MeshLambertMaterial({ color: 0xf6f8fa }));
    const ramp = new THREE.Mesh(track(new THREE.PlaneGeometry(width, len)), snow);
    ramp.rotation.x = -Math.PI / 2 + slope; ramp.position.set(0, rise / 2, -run / 2); kick.add(ramp);
    const tableTop = box(width, rise, 3, snow); tableTop.position.set(0, rise / 2, -run - 1.5); kick.add(tableTop);
    const sideShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(run, 0), new THREE.Vector2(run, rise)]);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(track(new THREE.ShapeGeometry(sideShape)), track(new THREE.MeshLambertMaterial({ color: 0xe9eef3, side: THREE.DoubleSide })));
      side.rotation.y = Math.PI / 2; side.position.set(s * width / 2, 0, 0); kick.add(side);
    }
    const w = width * 0.8;
    const q = quad(art.kicker, w, w / 2); q.rotation.x = -Math.PI / 2 + slope; q.position.set(0, rise / 2 + 0.02, -run / 2 + 0.02); kick.add(q); }

  // ---- First-person board + boots, parented to a rig placed per view ----
  const boardRig = new THREE.Group(); scene.add(boardRig);
  { const L = 1.5, W = 0.3, r = W / 2, s = new THREE.Shape();
    s.moveTo(-r, -L / 2 + r); s.lineTo(-r, L / 2 - r); s.absarc(0, L / 2 - r, r, Math.PI, 0, true);
    s.lineTo(r, -L / 2 + r); s.absarc(0, -L / 2 + r, r, 0, Math.PI, true);
    const geo = track(new THREE.ShapeGeometry(s, 24));
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / L + 0.5);
    const top = new THREE.Mesh(geo, artMat(art.board));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.025; boardRig.add(top);
    const edge = new THREE.Mesh(track(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false })), lit(NAVY));
    edge.rotation.x = -Math.PI / 2; boardRig.add(edge);
    // Binding positions from the template (blue areas), boots on top.
    for (const v of [0.335, 0.685]) {
      const z = -(0.5 - v) * L * -1;
      const plate = box(0.3, 0.03, 0.17, lit(0x2f3946)); plate.position.set(0, 0.04, z); boardRig.add(plate);
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.08, 0.012, 8, 24)), lit(BLUE)); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.058, z); boardRig.add(ring);
      const boot = box(0.13, 0.16, 0.3, lit(0x1c2128)); boot.position.set(0, 0.13, z); boot.rotation.y = Math.PI / 2 * 0.85; boardRig.add(boot);
      const cuff = new THREE.Mesh(track(new THREE.CylinderGeometry(0.075, 0.08, 0.22, 16)), lit(0x22282f)); cuff.position.set(0, 0.32, z); boardRig.add(cuff);
    }
  }
  boardRig.visible = false;

  return { scene, boardRig, dispose: () => disposables.forEach((d) => d.dispose()) };
}

const CAMS: Record<Exclude<PreviewView, "boardroom" | "event">, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  riding: { pos: [1.5, 1.7, -6], look: [-1, 0.2, -34], fov: 66 },
  gate: { pos: [0, 1.8, 17], look: [0, 4.2, 0], fov: 60 },
  wall: { pos: [-12, 1.8, -30], look: [-21.6, 4.4, -40], fov: 60 },
  rail: { pos: [-2.6, 1.55, -14.2], look: [-5, 0.45, -20], fov: 62 },
  box: { pos: [6.1, 1.9, -32.2], look: [6, 0.4, -36], fov: 60 },
  kicker: { pos: [0, 1.7, -46.5], look: [0, 0.9, -54], fov: 62 },
  board: { pos: [0, 1.62, 0.28], look: [0, 0, -0.75], fov: 70 },
};

function Hud() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 p-[4%] flex items-start gap-[3%] font-black">
      <div className="rounded-xl bg-white/95 px-[5%] py-[2%] text-[#0b2a4a] text-[clamp(18px,7cqw,34px)] leading-none italic shadow">212</div>
      <div className="rounded-xl bg-[#2b3440]/80 px-[4%] py-[2%] text-white text-center leading-tight"><span className="block text-[9px] font-semibold opacity-80">TIME</span><span className="text-sm italic">0:05</span></div>
      <div className="rounded-xl bg-[#2b3440]/80 px-[4%] py-[2%] text-white text-center leading-tight"><span className="block text-[9px] font-semibold opacity-80">CLEAN</span><span className="text-sm italic">1</span></div>
      <div className="ml-auto rounded-xl bg-[#1677d2] w-[11%] aspect-[3/4] grid place-items-center text-white text-lg">II</div>
    </div>
  );
}

export default function GamePreview({ art, view }: { art: PreviewArt; view: PreviewView }) {
  const host = useRef<HTMLDivElement>(null);
  // Only ever rendered client-side (dynamic import, ssr: false), so document exists here.
  const [failed, setFailed] = useState(() => !webglAvailable());
  const [loadedFor, setLoadedFor] = useState("");
  const merged: Required<PreviewArt> = { ...TEMPLATE, ...Object.fromEntries(Object.entries(art).filter(([, v]) => !!v)) };
  const key = JSON.stringify(merged);
  const is3d = view !== "boardroom" && view !== "event";
  const ready = loadedFor === `${key}|${view}`;

  useEffect(() => {
    if (!is3d || failed) return;
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    } catch { queueMicrotask(() => setFailed(true)); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.className = "absolute inset-0 w-full h-full touch-none";

    const built = build(JSON.parse(key), () => setLoadedFor(`${key}|${view}`));
    const cam = new THREE.PerspectiveCamera(60, 1, 0.02, 400);
    const c = CAMS[view as keyof typeof CAMS];
    cam.position.set(...c.pos); cam.fov = c.fov;
    if (view === "board") { built.boardRig.visible = true; built.boardRig.position.set(0, 0, -0.55); built.boardRig.rotation.y = 0.08; }
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.target.set(...c.look);
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true;
    // Look around a little, like turning your head, without leaving the spot.
    const az = Math.atan2(c.pos[0] - c.look[0], c.pos[2] - c.look[2]);
    controls.minAzimuthAngle = az - 0.5; controls.maxAzimuthAngle = az + 0.5;
    const pol = Math.acos((c.pos[1] - c.look[1]) / Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]));
    controls.minPolarAngle = Math.max(0.05, pol - 0.35); controls.maxPolarAngle = Math.min(Math.PI - 0.05, pol + 0.35);
    controls.update();

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);
    let raf = 0;
    const loop = () => { controls.update(); renderer.render(built.scene, cam); raf = requestAnimationFrame(loop); };
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); built.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [key, view, is3d, failed]);

  return (
    <div className="relative mx-auto w-full max-w-[340px] aspect-[9/19.5] rounded-[44px] bg-[#0d1117] p-[10px] shadow-xl [container-type:inline-size]">
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[#e7edf2]">
        {is3d && !failed && <div ref={host} className="absolute inset-0" aria-label={`${VIEW_LABEL[view]} preview`} role="img" />}
        {is3d && !failed && !ready && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading the park…</div>}
        {is3d && failed && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">This browser can&apos;t show the 3D preview. The flat mockups on this page still show your framing.</div>}
        {is3d && (view === "riding" || view === "board") && <Hud />}
        {view === "boardroom" && <BoardRoom src={merged.board} />}
        {view === "event" && <EventCard src={merged.event} />}
        <div className="absolute top-[6px] left-1/2 -translate-x-1/2 h-[22px] w-[30%] rounded-full bg-black" aria-hidden />
      </div>
    </div>
  );
}

function BoardRoom({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 bg-[#eef8ff] flex flex-col items-center pt-[22%] px-[6%] text-center">
      <p className="text-[11px] font-bold tracking-wide text-[#1677d2]">THE BOARD ROOM</p>
      <p className="mt-1 text-2xl font-black italic text-[#0b2a4a]">PICK YOUR RIDE</p>
      <div className="mt-2 h-1.5 w-1/2 rounded-full bg-[#1677d2]" />
      <div className="mt-[8%] w-full rounded-3xl bg-white shadow p-[6%] flex items-center gap-3">
        <div className="relative shrink-0 w-[34%] aspect-[1/5] rotate-[8deg] overflow-hidden rounded-full ring-[3px] ring-[#0b2a4a] bg-white">
          <img src={src} alt="Your board" className="absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
        </div>
        <div className="flex-1 text-[#0b2a4a]">
          <p className="text-lg font-black italic">Your brand</p>
          <p className="mt-2 text-xs">Your board&apos;s name and tagline go here.</p>
          <p className="mt-4 text-[11px] font-bold text-[#1677d2]">FREE WITH PRO</p>
        </div>
      </div>
      <div className="mt-[8%] w-full rounded-2xl bg-[#1677d2] py-3 text-white font-black italic">BACK TO RIDE →</div>
    </div>
  );
}

function EventCard({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(#0b1626,#14273f)] flex flex-col items-center justify-center px-[8%] text-center">
      <p className="text-[11px] font-bold tracking-[.2em] text-[#8fc3ff]">TONIGHT ONLY</p>
      <p className="mt-1 text-3xl font-black italic text-white">NIGHT SESSION</p>
      <p className="mt-6 text-[10px] font-semibold tracking-[.2em] text-white/70">PRESENTED BY</p>
      <img src={src} alt="Your title art" className="mt-2 w-full rounded-lg bg-white" />
      <div className="mt-8 w-full rounded-2xl bg-[#1677d2] py-3 text-white font-black italic">DROP IN →</div>
    </div>
  );
}

function webglAvailable() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export function viewNote(v: PreviewView) { return VIEW_NOTE[v]; }
