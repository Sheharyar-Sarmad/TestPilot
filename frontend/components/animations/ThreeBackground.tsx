"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ================================================================ utils */
const isDark = () => document.documentElement.classList.contains("dark");
const smooth = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = THREE.MathUtils.lerp;
const rad = THREE.MathUtils.degToRad;
const UP = new THREE.Vector3(0, 1, 0);

/* ================================================================ lightness controls
   Master knobs: lower = subtler. Tweak these to change the whole look. */
const WOLF_OPACITY = { dark: 0.5, light: 0.4 }; // whole 3D layer (wolf, moon, snow/embers)
const GRID_OPACITY = { dark: 0.12, light: 0.16 };
const TEXT_STROKE = { rows: [6, 10, 7], words: 14 }; // % of brand color in the outline text

/* ================================================================ camera timeline */
type Key = {
  p: number;
  a: number;
  el: number;
  r: number;
  tx: number;
  ty: number;
  fov: number;
};
const KEYS: Key[] = [
  { p: 0.0, a: 112, el: 11, r: 13.2, tx: 0.2, ty: 1.28, fov: 52 },
  { p: 0.22, a: 86, el: 6, r: 9.4, tx: 0.55, ty: 1.16, fov: 50 },
  { p: 0.45, a: 52, el: 3, r: 7.6, tx: 1.0, ty: 1.22, fov: 47 },
  { p: 0.68, a: 16, el: 5, r: 6.0, tx: 1.55, ty: 1.95, fov: 43 },
  { p: 0.86, a: -8, el: 3, r: 4.6, tx: 1.8, ty: 2.3, fov: 39 },
  { p: 1.0, a: 0, el: -3, r: 3.7, tx: 1.85, ty: 2.45, fov: 35 },
];
const cam: Key = { ...KEYS[0] };
function sampleCam(p: number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const k0 = KEYS[i],
    k1 = KEYS[i + 1];
  const t = clamp01((p - k0.p) / (k1.p - k0.p));
  const s = lerp(t, smooth(t), 0.4);
  cam.a = lerp(k0.a, k1.a, s);
  cam.el = lerp(k0.el, k1.el, s);
  cam.r = lerp(k0.r, k1.r, s);
  cam.tx = lerp(k0.tx, k1.tx, s);
  cam.ty = lerp(k0.ty, k1.ty, s);
  cam.fov = lerp(k0.fov, k1.fov, s);
}

/* ================================================================ palette */
type Palette = {
  key: number;
  fill: number;
  rim: number;
  fog: number;
  fur: number;
  eye: number;
};
const PALETTES: Palette[] = [
  {
    key: 0xb8d4ff,
    fill: 0x22d3ee,
    rim: 0x8b5cf6,
    fog: 0x0a1220,
    fur: 0xdde4ee,
    eye: 0x67f0ff,
  },
  {
    key: 0xd0ecff,
    fill: 0x22d3ee,
    rim: 0x60a5fa,
    fog: 0x0c1826,
    fur: 0xd8e8f4,
    eye: 0x67f0ff,
  },
  {
    key: 0xffd8b0,
    fill: 0xff8a4d,
    rim: 0xff5a78,
    fog: 0x22120c,
    fur: 0xf0e2d2,
    eye: 0xffb060,
  },
  {
    key: 0xe0c8ff,
    fill: 0xa78bfa,
    rim: 0xf472b6,
    fog: 0x150c28,
    fur: 0xe0d4ec,
    eye: 0xc4b5fd,
  },
];
const _pa = new THREE.Color();
const _pb = new THREE.Color();
const palette = {
  key: new THREE.Color(0xffffff),
  fill: new THREE.Color(0xffffff),
  rim: new THREE.Color(0xffffff),
  fog: new THREE.Color(0x000000),
  fur: new THREE.Color(0xffffff),
  eye: new THREE.Color(0x67f0ff),
};
function samplePalette(p: number) {
  const fi = clamp01(p) * (PALETTES.length - 1);
  const i0 = Math.floor(fi);
  const i1 = Math.min(PALETTES.length - 1, i0 + 1);
  const t = smooth((fi - i0) * 1.35);
  const A = PALETTES[i0],
    B = PALETTES[i1];
  palette.key.copy(_pa.setHex(A.key)).lerp(_pb.setHex(B.key), t);
  palette.fill.copy(_pa.setHex(A.fill)).lerp(_pb.setHex(B.fill), t);
  palette.rim.copy(_pa.setHex(A.rim)).lerp(_pb.setHex(B.rim), t);
  palette.fog.copy(_pa.setHex(A.fog)).lerp(_pb.setHex(B.fog), t);
  palette.fur.copy(_pa.setHex(A.fur)).lerp(_pb.setHex(B.fur), t);
  palette.eye.copy(_pa.setHex(A.eye)).lerp(_pb.setHex(B.eye), t);
}

/* ================================================================ shared */
const matCache = new Map<number, THREE.MeshStandardMaterial>();
const solid = (c: number) => {
  let m = matCache.get(c);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: c,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.04,
    });
    matCache.set(c, m);
  }
  return m;
};

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.3, "rgba(255,255,255,0.45)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function snowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.7)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(32, 32, 32, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}

function emberTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,240,180,1)");
  gr.addColorStop(0.35, "rgba(255,140,50,0.85)");
  gr.addColorStop(0.7, "rgba(255,60,20,0.35)");
  gr.addColorStop(1, "rgba(255,0,0,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(32, 32, 32, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}

function moonTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 96, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * 90;
    g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.07})`;
    g.beginPath();
    g.arc(
      128 + Math.cos(a) * d,
      128 + Math.sin(a) * d,
      6 + Math.random() * 20,
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  return new THREE.CanvasTexture(c);
}

/* ================================================================ loft */
type Sec = { x: number; rz: number; ry: number; cy: number };
function loft(secs: Sec[], back: number, belly: number, segs = 12) {
  const cb = new THREE.Color(back);
  const cl = new THREE.Color(belly);
  const tmp = new THREE.Color();
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];

  for (const s of secs) {
    for (let k = 0; k < segs; k++) {
      const th = (k / segs) * Math.PI * 2;
      const v = Math.sin(th);
      pos.push(s.x, s.cy + s.ry * v, s.rz * Math.cos(th));
      tmp.copy(cl).lerp(cb, smooth((v + 0.4) / 1.2));
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < secs.length - 1; i++) {
    for (let k = 0; k < segs; k++) {
      const a = i * segs + k;
      const b = i * segs + ((k + 1) % segs);
      const c = (i + 1) * segs + k;
      const d = (i + 1) * segs + ((k + 1) % segs);
      idx.push(a, c, b, b, c, d);
    }
  }
  const cap = (si: number, flip: boolean) => {
    const c = pos.length / 3;
    pos.push(secs[si].x, secs[si].cy, 0);
    tmp.copy(cl).lerp(cb, 0.5);
    col.push(tmp.r, tmp.g, tmp.b);
    for (let k = 0; k < segs; k++) {
      const a = si * segs + k;
      const b = si * segs + ((k + 1) % segs);
      if (flip) idx.push(c, b, a);
      else idx.push(c, a, b);
    }
  };
  cap(0, false);
  cap(secs.length - 1, true);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ================================================================ fur */
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();

type FurOpts = {
  count: number;
  len: [number, number];
  width: [number, number];
  back: number;
  belly: number;
  backBias: number;
  downBias: number;
  jitter: number;
  segs?: number;
  spread?: number;
  normalWeight?: number;
};

function buildFur(sections: Sec[], o: FurOpts) {
  const SEG = o.segs ?? 4;
  const geom = new THREE.ConeGeometry(1, 1, SEG, 1);
  geom.translate(0, 0.5, 0);
  const vcount = geom.attributes.position.count;
  geom.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Float32Array(vcount * 3).fill(1), 3),
  );

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const inst = new THREE.InstancedMesh(geom, mat, o.count);
  inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  inst.frustumCulled = false;
  (inst as any).userData.tintable = true;

  const cB = new THREE.Color(o.back);
  const cL = new THREE.Color(o.belly);
  const n = sections.length;
  const spread = o.spread ?? 0.1;
  const nw = o.normalWeight ?? 0.3;

  for (let i = 0; i < o.count; i++) {
    const u = Math.random() * (n - 1);
    const i0 = Math.floor(u);
    const i1 = Math.min(n - 1, i0 + 1);
    const ft = u - i0;
    const s0 = sections[i0],
      s1 = sections[i1];
    const sx = lerp(s0.x, s1.x, ft);
    const rz = Math.max(0.01, lerp(s0.rz, s1.rz, ft));
    const ry = Math.max(0.01, lerp(s0.ry, s1.ry, ft));
    const cy = lerp(s0.cy, s1.cy, ft);

    const th = Math.random() * Math.PI * 2;
    const sy = Math.sin(th);
    const cz = Math.cos(th);

    _p.set(sx, cy + ry * sy * 0.97, rz * cz * 0.97);
    _d.set(0, sy / ry, cz / rz).normalize();
    _d.multiplyScalar(nw);
    _d.x -= o.backBias;
    _d.y -= o.downBias;
    if (spread > 0) {
      _d.x += (Math.random() - 0.5) * spread;
      _d.y += (Math.random() - 0.5) * spread;
      _d.z += (Math.random() - 0.5) * spread;
    }
    _d.normalize();
    _q.setFromUnitVectors(UP, _d);

    const len = lerp(o.len[0], o.len[1], Math.random());
    const w = lerp(o.width[0], o.width[1], Math.random());
    _s.set(w, len, w);

    _m.compose(_p, _q, _s);
    inst.setMatrixAt(i, _m);

    const v = (sy + 1) * 0.5;
    _c.copy(cL).lerp(cB, smooth(v));
    _c.multiplyScalar(1 - o.jitter * Math.random());
    inst.setColorAt(i, _c);
  }

  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  return inst;
}

/* ================================================================ wolf */
type Leg = {
  hip: THREE.Group;
  knee: THREE.Group;
  off: number;
  baseHip: number;
  baseKnee: number;
  swing: number;
  flex: number;
};

function buildWolf(quality: number) {
  const F = (n: number) => Math.max(300, Math.floor(n * quality));

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const furMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  /* ---------------- torso ---------------- */
  const torsoSecs: Sec[] = [
    { x: -1.55, rz: 0.2, ry: 0.24, cy: 1.08 },
    { x: -1.2, rz: 0.33, ry: 0.4, cy: 1.14 },
    { x: -0.7, rz: 0.32, ry: 0.38, cy: 1.1 },
    { x: -0.1, rz: 0.33, ry: 0.4, cy: 1.12 },
    { x: 0.5, rz: 0.4, ry: 0.5, cy: 1.18 },
    { x: 1.05, rz: 0.38, ry: 0.48, cy: 1.22 },
    { x: 1.4, rz: 0.26, ry: 0.36, cy: 1.3 },
  ];
  const torso = new THREE.Mesh(loft(torsoSecs, 0x4a5060, 0xd8dfe8, 16), furMat);
  (torso as any).userData.tintable = true;
  body.add(torso);

  body.add(
    buildFur(torsoSecs, {
      count: F(4200),
      len: [0.07, 0.15],
      width: [0.028, 0.052],
      back: 0x525a6e,
      belly: 0xf0f4f8,
      backBias: 1.25,
      downBias: 0.1,
      jitter: 0.22,
      spread: 0.1,
      normalWeight: 0.3,
      segs: 4,
    }),
  );

  body.add(
    buildFur(torsoSecs, {
      count: F(2600),
      len: [0.035, 0.08],
      width: [0.035, 0.065],
      back: 0x5c6478,
      belly: 0xdde4ec,
      backBias: 0.75,
      downBias: 0.04,
      jitter: 0.14,
      spread: 0.04,
      normalWeight: 0.55,
      segs: 3,
    }),
  );

  // spine crest
  for (let x = -1.4; x <= 1.3; x += 0.16) {
    const t = (x + 1.4) / 2.7;
    const h = 0.16 + t * 0.08;
    const g = new THREE.ConeGeometry(0.035, h, 4);
    g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, solid(0x3a4050));
    m.position.set(x, 1.44 + t * 0.06, 0);
    m.quaternion.setFromUnitVectors(
      UP,
      new THREE.Vector3(-0.55, 1, 0).normalize(),
    );
    body.add(m);
  }

  /* ---------------- neck ---------------- */
  const neck = new THREE.Group();
  neck.position.set(1.22, 1.26, 0);
  body.add(neck);

  const neckSecs: Sec[] = [
    { x: 0.0, rz: 0.32, ry: 0.36, cy: 0 },
    { x: 0.3, rz: 0.26, ry: 0.3, cy: 0 },
    { x: 0.62, rz: 0.2, ry: 0.23, cy: 0 },
  ];
  const neckMesh = new THREE.Mesh(
    loft(neckSecs, 0x525a6a, 0xdce2ea, 12),
    furMat,
  );
  (neckMesh as any).userData.tintable = true;
  neck.add(neckMesh);

  neck.add(
    buildFur(neckSecs, {
      count: F(1400),
      len: [0.14, 0.26],
      width: [0.035, 0.065],
      back: 0x4a5266,
      belly: 0xe4eaf2,
      backBias: 1.6,
      downBias: 0.3,
      jitter: 0.28,
      spread: 0.22,
      normalWeight: 0.45,
      segs: 4,
    }),
  );
  neck.add(
    buildFur(neckSecs, {
      count: F(900),
      len: [0.07, 0.14],
      width: [0.04, 0.07],
      back: 0x525a6e,
      belly: 0xd8e0e8,
      backBias: 1.0,
      downBias: 0.15,
      jitter: 0.16,
      spread: 0.1,
      normalWeight: 0.55,
      segs: 3,
    }),
  );

  /* ---------------- head ---------------- */
  const head = new THREE.Group();
  head.position.set(0.62, 0, 0);
  neck.add(head);

  const headSecs: Sec[] = [
    { x: -0.24, rz: 0.21, ry: 0.22, cy: 0.0 },
    { x: 0.0, rz: 0.28, ry: 0.28, cy: 0.02 },
    { x: 0.26, rz: 0.23, ry: 0.23, cy: 0.0 },
    { x: 0.5, rz: 0.15, ry: 0.15, cy: -0.04 },
    { x: 0.82, rz: 0.1, ry: 0.09, cy: -0.07 },
    { x: 1.0, rz: 0.07, ry: 0.065, cy: -0.075 },
  ];
  const headMesh = new THREE.Mesh(
    loft(headSecs, 0x555c6e, 0xe4eaf2, 14),
    furMat,
  );
  (headMesh as any).userData.tintable = true;
  head.add(headMesh);

  const headBackSecs: Sec[] = [
    { x: -0.26, rz: 0.22, ry: 0.23, cy: 0.0 },
    { x: 0.0, rz: 0.29, ry: 0.29, cy: 0.02 },
    { x: 0.18, rz: 0.26, ry: 0.26, cy: 0.0 },
  ];
  head.add(
    buildFur(headBackSecs, {
      count: F(420),
      len: [0.05, 0.11],
      width: [0.024, 0.048],
      back: 0x525a6e,
      belly: 0xe4eaf2,
      backBias: 1.1,
      downBias: 0.05,
      jitter: 0.2,
      spread: 0.1,
      normalWeight: 0.45,
      segs: 3,
    }),
  );

  head.add(
    new THREE.Mesh(
      loft(
        [
          { x: 0.14, rz: 0.1, ry: 0.045, cy: -0.14 },
          { x: 0.88, rz: 0.06, ry: 0.028, cy: -0.13 },
        ],
        0x1a0f16,
        0x1a0f16,
        8,
      ),
      furMat,
    ),
  );

  const jaw = new THREE.Group();
  jaw.position.set(0.05, -0.12, 0);
  head.add(jaw);
  jaw.add(
    new THREE.Mesh(
      loft(
        [
          { x: 0.0, rz: 0.1, ry: 0.06, cy: 0.0 },
          { x: 0.38, rz: 0.085, ry: 0.05, cy: -0.02 },
          { x: 0.78, rz: 0.055, ry: 0.035, cy: -0.015 },
        ],
        0xa9b0bc,
        0xe3e8ee,
        8,
      ),
      furMat,
    ),
  );

  const nose = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.06, 0),
    solid(0x0d0f14),
  );
  nose.position.set(1.03, -0.07, 0);
  nose.scale.set(1.15, 0.9, 1.3);
  head.add(nose);

  /* ---------------- eyes ---------------- */
  const glowTex = glowTexture();
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e14,
    emissive: 0x67f0ff,
    emissiveIntensity: 6,
    roughness: 0.25,
    metalness: 0,
  });
  const glows: THREE.Sprite[] = [];

  for (const sgn of [1, -1]) {
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 12, 8),
      solid(0x14080d),
    );
    socket.position.set(0.44, 0.04, sgn * 0.14);
    socket.scale.set(1.0, 0.75, 1.0);
    head.add(socket);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), eyeMat);
    eye.scale.set(1.55, 0.85, 0.9);
    eye.position.set(0.46, 0.06, sgn * 0.17);
    eye.rotation.y = -sgn * 0.35;
    head.add(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    pupil.position.set(0.485, 0.065, sgn * 0.175);
    pupil.scale.set(1.2, 0.9, 0.9);
    head.add(pupil);

    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x22d3ee,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    sp.position.set(0.46, 0.06, sgn * 0.17);
    sp.scale.setScalar(0.42);
    head.add(sp);
    glows.push(sp);
  }
  const eyeLight = new THREE.PointLight(0x22d3ee, 2.5, 12, 2);
  eyeLight.position.set(0.75, 0.05, 0);
  head.add(eyeLight);

  /* ---------------- ears ---------------- */
  const ears: THREE.Group[] = [];
  for (const sgn of [1, -1]) {
    const ear = new THREE.Group();
    ear.position.set(-0.02, 0.22, sgn * 0.14);
    ear.rotation.set(sgn * 0.26, 0, 0.2);
    const eo = new THREE.ConeGeometry(0.14, 0.54, 5);
    eo.translate(0, 0.27, 0);
    const ei = new THREE.ConeGeometry(0.09, 0.42, 5);
    ei.translate(0, 0.21, 0.03);
    ear.add(
      new THREE.Mesh(eo, solid(0x4a5266)),
      new THREE.Mesh(ei, solid(0xa8b0bc)),
    );
    head.add(ear);
    ears.push(ear);

    for (let k = 0; k < 5; k++) {
      const g = new THREE.ConeGeometry(0.03, 0.14, 3);
      g.translate(0, 0.07, 0);
      const m = new THREE.Mesh(g, solid(0xd8dfe8));
      m.position.set(0.01 - k * 0.035, 0.1, sgn * 0.12);
      m.quaternion.setFromUnitVectors(
        UP,
        new THREE.Vector3(-0.85, 0.3, sgn * 0.5).normalize(),
      );
      head.add(m);
    }

    for (let k = 0; k < 4; k++) {
      const g = new THREE.ConeGeometry(0.05, 0.22, 4);
      g.translate(0, 0.11, 0);
      const m = new THREE.Mesh(g, solid(0xd0d8e2));
      m.position.set(-0.06 - k * 0.03, -0.1 - k * 0.02, sgn * 0.22);
      m.quaternion.setFromUnitVectors(
        UP,
        new THREE.Vector3(-1, -0.25 * k, sgn * 0.6).normalize(),
      );
      head.add(m);
    }
  }

  /* ---------------- legs — PROPER paw anatomy ---------------- */
  const legs: Leg[] = [];
  const makeLeg = (front: boolean, sgn: number, off: number) => {
    const hip = new THREE.Group();
    hip.position.set(
      front ? 0.92 : -1.08,
      front ? 1.02 : 0.99,
      sgn * (front ? 0.24 : 0.27),
    );

    const uLen = 0.52;
    const lLen = 0.48;

    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(front ? 0.13 : 0.17, 0.085, uLen, 10),
      solid(front ? 0x5c6474 : 0x525a6c),
    );
    upper.position.y = -uLen / 2;

    const bulge = new THREE.Mesh(
      new THREE.IcosahedronGeometry(front ? 0.19 : 0.24, 1),
      solid(front ? 0x525a6a : 0x4a5262),
    );
    bulge.position.y = -0.06;

    hip.add(upper, bulge);

    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const g = new THREE.ConeGeometry(0.035, 0.14, 3);
      g.translate(0, 0.07, 0);
      const m = new THREE.Mesh(g, solid(0x4a5264));
      m.position.set(
        front ? 0.02 : -0.03,
        -0.02,
        Math.sin(a) * (front ? 0.12 : 0.15),
      );
      m.quaternion.setFromUnitVectors(
        UP,
        new THREE.Vector3(
          front ? -0.4 : -0.75,
          -0.15,
          Math.cos(a) * 0.65,
        ).normalize(),
      );
      hip.add(m);
    }

    const knee = new THREE.Group();
    knee.position.y = -uLen;

    // kneecap
    const kneecap = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      solid(0x5a6274),
    );
    kneecap.position.y = 0.02;
    kneecap.scale.set(1, 1, 1.15);
    knee.add(kneecap);

    // lower leg
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.055, lLen, 8),
      solid(0x9aa2b0),
    );
    lower.position.y = -lLen / 2;

    // ankle
    const ankle = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      solid(0x4a5260),
    );
    ankle.position.y = -lLen + 0.03;

    knee.add(lower, ankle);

    // foreleg wrist tufts
    for (let k = 0; k < 4; k++) {
      const g = new THREE.ConeGeometry(0.02, 0.09, 3);
      g.translate(0, 0.045, 0);
      const m = new THREE.Mesh(g, solid(0xb8c0cc));
      m.position.set(-0.05, -lLen + 0.14 + k * 0.05, sgn * 0.02);
      m.quaternion.setFromUnitVectors(
        UP,
        new THREE.Vector3(-0.5, -0.7, sgn * 0.3).normalize(),
      );
      knee.add(m);
    }

    /* -------- PROPER PAW -------- */
    const paw = new THREE.Group();
    paw.position.set(0.05, -lLen - 0.045, 0);

    // pastern — short angled segment connecting ankle to pad
    const pastern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.05, 0.09, 8),
      solid(0x6a7284),
    );
    pastern.position.y = 0.035;
    pastern.rotation.x = 0.18;
    paw.add(pastern);

    // foot pad — flat, wide, dark
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.07, 0.22),
      solid(0x3a4052),
    );
    pad.position.set(0.04, -0.05, 0);
    paw.add(pad);

    // heel bulge
    const heel = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 6),
      solid(0x2a3040),
    );
    heel.position.set(-0.09, -0.05, 0);
    heel.scale.set(1.0, 0.55, 1.15);
    paw.add(heel);

    // 4 toes with 4 claws
    for (let tt = -1.5; tt <= 1.5; tt++) {
      const toe = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 10, 8),
        solid(0x2a2f3f),
      );
      toe.position.set(0.16, -0.065, tt * 0.058);
      toe.scale.set(1.15, 0.78, 0.95);
      paw.add(toe);

      const claw = new THREE.Mesh(
        new THREE.ConeGeometry(0.014, 0.065, 5),
        solid(0xd0c8b0),
      );
      claw.position.set(0.225, -0.078, tt * 0.058);
      claw.rotation.z = -Math.PI / 2.3;
      paw.add(claw);
    }

    // dewclaw on the inside
    const dew = new THREE.Mesh(
      new THREE.ConeGeometry(0.011, 0.05, 5),
      solid(0xb8b0a0),
    );
    dew.position.set(0.06, -0.03, -sgn * 0.09);
    dew.rotation.z = -Math.PI / 1.9;
    paw.add(dew);

    knee.add(paw);
    hip.add(knee);
    body.add(hip);

    legs.push({
      hip,
      knee,
      off,
      baseHip: front ? 0 : 0.35,
      baseKnee: front ? 0.05 : -0.6,
      swing: front ? 0.52 : 0.44,
      flex: front ? 0.9 : 0.52,
    });
  };
  makeLeg(true, 1, 0);
  makeLeg(false, -1, 0);
  makeLeg(true, -1, Math.PI);
  makeLeg(false, 1, Math.PI);

  /* ---------------- tail ---------------- */
  const tailRoot = new THREE.Group();
  tailRoot.position.set(-1.55, 1.14, 0);
  tailRoot.rotation.z = 0.45;
  body.add(tailRoot);

  const tail: THREE.Group[] = [];
  const L = 0.32;
  const radii = [0.14, 0.155, 0.14, 0.115, 0.085, 0.06];
  const tcols = [0x525a6e, 0x525a6e, 0x525a6e, 0x525a6e, 0x9aa2b0, 0xdde4ec];
  let parent: THREE.Object3D = tailRoot;
  radii.forEach((r, i) => {
    const seg = new THREE.Group();
    if (i > 0) seg.position.x = -L;

    const g = new THREE.CylinderGeometry(r * 0.72, r, L, 8);
    g.rotateZ(Math.PI / 2);
    g.translate(-L / 2, 0, 0);
    seg.add(new THREE.Mesh(g, solid(tcols[i])));

    const tufts = i < 3 ? 8 : 10;
    for (let k = 0; k < tufts; k++) {
      const a = (k / tufts) * Math.PI * 2 + Math.random() * 0.5;
      const len = 0.16 + Math.random() * 0.1;
      const tg = new THREE.ConeGeometry(r * 0.4, len, 4);
      tg.translate(0, len / 2, 0);
      const tm = new THREE.Mesh(tg, solid(i >= 4 ? 0xdde4ec : 0x525a6e));
      tm.position.set(-L * 0.5, Math.sin(a) * r * 0.75, Math.cos(a) * r * 0.75);
      tm.quaternion.setFromUnitVectors(
        UP,
        new THREE.Vector3(
          -0.6,
          Math.sin(a) * 0.7,
          Math.cos(a) * 0.7,
        ).normalize(),
      );
      seg.add(tm);
    }

    parent.add(seg);
    tail.push(seg);
    parent = seg;
  });

  return {
    root,
    body,
    torso,
    neck,
    head,
    headMesh,
    neckMesh,
    jaw,
    legs,
    tail,
    tailRoot,
    glows,
    ears,
    eyeLight,
    eyeMat,
  };
}

/* ================================================================ copy */
const ROW_TEXT = [
  "FIND THE BUG — FIX THE BUG — VERIFY THE FIX — ".repeat(3),
  "AUTONOMOUS CODE REPAIR — ".repeat(3),
  "TESTPILOT AI — SHIP IT — ".repeat(3),
];
const ROW_TOP = ["4%", "37%", "68%"];
const WORDS = ["HUNT", "TRACE", "STRIKE", "SHIP"];
const WORD_AT = [0.12, 0.37, 0.64, 0.9];
const PHASES = [
  "01 // HUNT THE BUG",
  "02 // TRACE THE CAUSE",
  "03 // STRIKE THE FIX",
  "04 // SHIP IT. VERIFIED.",
];
const PHASE_PER_PX = 0.018;
const STRIDE = 1.6 / (Math.PI * 2);

/* ================================================================ component */
export function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wordRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hudLabelRef = useRef<HTMLDivElement>(null);
  const hudBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const small = window.innerWidth < 768;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !small,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("ThreeBackground: WebGL unavailable.", err);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a1220, 22, 70);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      140,
    );
    scene.add(camera);

    const hemi = new THREE.HemisphereLight(0x8fb8ff, 0x1a1030, 1.1);
    const key = new THREE.DirectionalLight(0xbcd8ff, 3.0);
    key.position.set(-6, 8, -6);
    const fill = new THREE.DirectionalLight(0x22d3ee, 1.9);
    fill.position.set(6, 3, 6);
    const rim = new THREE.DirectionalLight(0xa78bfa, 2.2);
    rim.position.set(-4, 2, 6);
    const kicker = new THREE.DirectionalLight(0x8fb8ff, 0.6);
    kicker.position.set(0, -3, 2);
    scene.add(hemi, key, fill, rim, kicker);

    const quality = small ? 0.6 : 1;
    const wolf = buildWolf(quality);
    scene.add(wolf.root);

    const tintMats: THREE.MeshStandardMaterial[] = [];
    wolf.root.traverse((o) => {
      const anyO = o as any;
      if (anyO.userData?.tintable && (o as THREE.Mesh).material) {
        tintMats.push((o as THREE.Mesh).material as THREE.MeshStandardMaterial);
      }
    });

    const glowTex = glowTexture();
    const snowTex = snowTexture();
    const emberTex = emberTexture();

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 2.6),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.2, 0.01, 0);
    scene.add(shadow);

    const grid = new THREE.GridHelper(120, 120, 0xffffff, 0xffffff);
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    grid.position.y = 0;
    scene.add(grid);

    /* ---------------- SNOW (dark mode) ---------------- */
    const SNOW_N = small ? 500 : 1000;
    const snowPos = new Float32Array(SNOW_N * 3);
    const snowVel = new Float32Array(SNOW_N);
    const snowPhase = new Float32Array(SNOW_N);
    for (let i = 0; i < SNOW_N; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 32;
      snowPos[i * 3 + 1] = Math.random() * 16;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
      snowVel[i] = 0.35 + Math.random() * 0.75;
      snowPhase[i] = Math.random() * Math.PI * 2;
    }
    const snowGeo = new THREE.BufferGeometry();
    const snowAttr = new THREE.BufferAttribute(snowPos, 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    snowGeo.setAttribute("position", snowAttr);
    const snowMat = new THREE.PointsMaterial({
      size: 0.14,
      map: snowTex,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
    });
    const snow = new THREE.Points(snowGeo, snowMat);
    snow.frustumCulled = false;
    scene.add(snow);

    /* ---------------- EMBERS (light mode) ---------------- */
    const EMBER_N = small ? 400 : 800;
    const emberPos = new Float32Array(EMBER_N * 3);
    const emberVel = new Float32Array(EMBER_N);
    const emberPhase = new Float32Array(EMBER_N);
    for (let i = 0; i < EMBER_N; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 32;
      emberPos[i * 3 + 1] = Math.random() * 14;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
      emberVel[i] = 0.4 + Math.random() * 0.9;
      emberPhase[i] = Math.random() * Math.PI * 2;
    }
    const emberGeo = new THREE.BufferGeometry();
    const emberAttr = new THREE.BufferAttribute(emberPos, 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    emberGeo.setAttribute("position", emberAttr);
    const emberMat = new THREE.PointsMaterial({
      size: 0.13,
      map: emberTex,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      color: 0xffa050,
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    embers.frustumCulled = false;
    embers.visible = false;
    scene.add(embers);

    const moonMat = new THREE.MeshBasicMaterial({
      map: moonTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 48), moonMat);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(18, 32), haloMat);
    moon.add(halo);
    halo.position.z = -0.1;
    camera.add(moon);

    let darkMode = isDark();
    const applyTheme = () => {
      darkMode = isDark();
      gridMat.opacity = darkMode ? GRID_OPACITY.dark : GRID_OPACITY.light;
      shadow.visible = !darkMode;
      hemi.intensity = darkMode ? 1.1 : 1.6;
      key.intensity = darkMode ? 3.0 : 1.9;
      fill.intensity = darkMode ? 1.9 : 1.2;
      rim.intensity = darkMode ? 2.2 : 1.2;
      kicker.intensity = darkMode ? 0.6 : 0.4;
      renderer.toneMappingExposure = darkMode ? 1.15 : 1.35;
      snow.visible = darkMode;
      embers.visible = !darkMode;
    };
    applyTheme();

    const mouseT = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      mouseT.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseT.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let scrollS = window.scrollY;
    let prevScroll = scrollS;
    let velS = 0;
    let phaseLast = scrollS * PHASE_PER_PX;
    let ground = 0;
    let introT = reduce ? 1 : 0;
    let phaseIdx = -1;
    let lastRendered = -1;
    let needsRender = true;
    let scrollBurst = 0;

    const fitAspect = () => THREE.MathUtils.clamp(1.25 / camera.aspect, 1, 1.9);
    // wolf's natural top height in world units (feet at y=0, head top at ~2.55)
    const WOLF_HEIGHT = 2.55;

    const frame = (dt: number, t: number) => {
      const k = dt * 60;
      const ease = (f: number) => (reduce ? 1 : Math.min(1, f * k));

      const sy = window.scrollY;
      if (reduce && Math.abs(sy - lastRendered) < 0.5 && !needsRender) return;
      lastRendered = sy;
      needsRender = false;

      scrollS += (sy - scrollS) * ease(0.14);
      velS += (scrollS - prevScroll - velS) * ease(0.28);
      prevScroll = scrollS;
      mouse.x += (mouseT.x - mouse.x) * ease(0.08);
      mouse.y += (mouseT.y - mouse.y) * ease(0.08);

      // scroll burst: brief atmospheric intensification
      const scrollMag = Math.min(1, Math.abs(velS) * 0.04);
      scrollBurst += (scrollMag - scrollBurst) * ease(0.15);

      introT = Math.min(1, introT + dt / 0.75);
      const intro = smooth(introT);
      // Whole 3D layer is faded here — this is the main "lightness" control.
      container.style.opacity = String(
        intro * (darkMode ? WOLF_OPACITY.dark : WOLF_OPACITY.light),
      );

      const total = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const p = clamp01(scrollS / total);

      /* ---------- color ---------- */
      samplePalette(p);
      scene.fog && (scene.fog as THREE.Fog).color.copy(palette.fog);
      key.color.copy(palette.key);
      fill.color.copy(palette.fill);
      rim.color.copy(palette.rim);

      for (const m of tintMats) m.color.copy(palette.fur);

      wolf.eyeMat.emissive.copy(palette.eye);
      wolf.glows.forEach((g) =>
        (g.material as THREE.SpriteMaterial).color.copy(palette.eye),
      );
      wolf.eyeLight.color.copy(palette.eye);

      /* ---------- timeline ---------- */
      const amp = 1 - smooth((p - 0.5) / 0.12);
      const raise = smooth((p - 0.08) / 0.4);
      const howl = smooth((p - 0.78) / 0.18);
      const strike = smooth((p - 0.5) / 0.2);
      sampleCam(p);
      const gaze = smooth((p - 0.4) / 0.25) * (1 - howl);
      const idle = reduce ? 0 : 1;

      /* ---------- idle life: breathing, sway, look, ear twitch ---------- */
      const breathe = Math.sin(t * 1.6) * 0.5 + 0.5;
      const idleSway = Math.sin(t * 0.55) * 0.06;
      const idleHeadYaw = Math.sin(t * 0.42 + 1.0) * 0.14;
      const idleHeadPitch = Math.sin(t * 0.68 + 2.1) * 0.05;
      const idleTailSwish = Math.sin(t * 1.05) * 0.28;
      const idleEarTwitchL =
        Math.max(0, Math.sin(t * 3.1 + 0.3)) * Math.sin(t * 19.0);
      const idleEarTwitchR =
        Math.max(0, Math.sin(t * 2.7 + 1.9)) * Math.sin(t * 17.0);
      const idleWeight = Math.sin(t * 0.48) * 0.035;
      const idleLookFlick = Math.sin(t * 0.18) > 0.6 ? 1 : 0;

      /* ---------- stride ---------- */
      const phase = scrollS * PHASE_PER_PX;
      const dG = (phase - phaseLast) * STRIDE * amp;
      phaseLast = phase;
      ground += dG;

      const idleWalkPhase = t * 1.9;
      const idleWalkAmt = 0.11 * idle;

      for (const leg of wolf.legs) {
        const ph = phase + leg.off;
        const phIdle = idleWalkPhase + leg.off * 0.5;
        const hipWalk = Math.sin(ph) * leg.swing * amp;
        const hipIdle = Math.sin(phIdle) * leg.swing * 0.35 * idleWalkAmt;
        const kneeWalk = -Math.max(0, Math.cos(ph)) * leg.flex * amp;
        const kneeIdle =
          -Math.max(0, Math.cos(phIdle)) * leg.flex * 0.3 * idleWalkAmt;
        leg.hip.rotation.z = leg.baseHip + hipWalk + hipIdle;
        leg.knee.rotation.z = leg.baseKnee + kneeWalk + kneeIdle;
        leg.hip.rotation.x = idleWeight * (leg.off === 0 ? 1 : -1);
      }

      /* The wolf never gets smaller than its natural size (scale 1.0), never
         smaller than ~42% of the viewport, and never larger than 70% of it. */
      const visibleH = 2 * cam.r * Math.tan(rad(cam.fov * 0.5));
      const maxScale = (0.7 * visibleH) / WOLF_HEIGHT;
      const minScale = Math.max(
        1.0, // never below natural size
        (0.42 * visibleH) / WOLF_HEIGHT, // and at least 42% of viewport
      );

      const targetGrow = 1.05 + smooth(p * 1.15) * 0.55; // 1.05 → 1.60
      const growScale = THREE.MathUtils.clamp(
        targetGrow,
        minScale,
        Math.max(minScale, maxScale),
      );
      const heightStretch = Math.min(
        1 + smooth(p) * 0.22 + howl * 0.18,
        maxScale / growScale,
      );
      const widthStretch = 1 + strike * 0.06;

      wolf.root.scale.set(
        growScale * widthStretch,
        growScale * heightStretch,
        growScale,
      );
      wolf.root.rotation.y =
        (1 - intro) * -0.6 + Math.sin(t * 0.25) * 0.03 * idle;
      wolf.root.rotation.z = howl * 0.03;

      /* ---------- body ---------- */
      const bodyBreath = Math.sin(t * 1.6) * 0.022 * idle;
      wolf.body.position.y =
        Math.abs(Math.sin(phase)) * 0.055 * amp + howl * 0.1 + bodyBreath;
      wolf.body.rotation.x =
        Math.sin(phase) * 0.018 * amp - howl * 0.08 + idleHeadPitch * 0.3;
      wolf.body.rotation.z = howl * 0.06 + idleSway;
      wolf.body.rotation.y = -velS * 0.0008 + Math.sin(t * 0.3) * 0.03 * idle;

      wolf.torso.scale.set(
        1 + howl * 0.06,
        1 + breathe * 0.028 * idle + howl * 0.1,
        1 + howl * 0.05,
      );

      /* ---------- head ---------- */
      const scrollYaw = THREE.MathUtils.clamp(
        -rad(cam.a) * 0.55 * gaze - mouse.x * 0.25 * (1 - howl),
        -0.9,
        0.9,
      );
      const headYaw =
        scrollYaw + idleHeadYaw * idle + idleLookFlick * 0.08 * idle;
      wolf.neck.rotation.z =
        0.35 +
        raise * 0.42 +
        howl * 0.72 +
        Math.sin(phase) * 0.035 * amp +
        idleSway * 0.4;
      wolf.neck.rotation.y = headYaw * 0.5;
      wolf.head.rotation.y = headYaw * 0.5;
      wolf.head.rotation.x = idleHeadPitch * idle * (1 - howl);
      wolf.head.rotation.z = -0.55 - raise * 0.06 + howl * 0.85;
      wolf.jaw.rotation.z = -(
        howl * 0.6 +
        Math.sin(t * 5) * 0.03 * howl * idle
      );
      wolf.jaw.rotation.z += Math.sin(t * 1.4) * 0.015 * idle * (1 - howl);

      /* ---------- ears ---------- */
      wolf.ears.forEach((ear, i) => {
        const tw = i === 0 ? idleEarTwitchL : idleEarTwitchR;
        ear.rotation.x += tw * 0.15;
        ear.rotation.z += tw * 0.08;
      });

      /* ---------- eyes ---------- */
      const flick = 1 + Math.sin(t * 9) * 0.06 * idle;
      for (const g of wolf.glows) {
        g.scale.setScalar((0.4 + strike * 0.7) * flick);
        (g.material as THREE.SpriteMaterial).opacity = 0.75 + strike * 0.25;
      }
      wolf.eyeMat.emissiveIntensity = 5 + strike * 8 + howl * 4;
      wolf.eyeLight.intensity = 2.2 + strike * 9 + howl * 4;

      /* ---------- tail ---------- */
      wolf.tailRoot.rotation.z = 0.45 - howl * 0.2 + idleTailSwish * 0.05;
      wolf.tail.forEach((seg, i) => {
        seg.rotation.z =
          0.12 +
          Math.sin(t * 1.4 - i * 0.8) * 0.14 * idle +
          Math.sin(phase - i * 0.5) * 0.1 * amp;
        seg.rotation.y =
          Math.sin(t * 1.1 - i * 0.7) * 0.22 * idle +
          Math.sin(phase - i * 0.6) * 0.22 * amp +
          idleTailSwish * 0.15;
      });

      /* ---------- ground ---------- */
      grid.position.x = -(ground % 1);

      /* ---------- SNOW / EMBERS ---------- */
      const scrollSpeedBoost = 1 + scrollBurst * 3.5; // surges on scroll

      if (darkMode) {
        // Snow falls downward, drifts sideways, wraps at bottom
        for (let i = 0; i < SNOW_N; i++) {
          const i3 = i * 3;
          snowPos[i3 + 1] -= snowVel[i] * dt * (1.0 + scrollBurst * 2.0);
          snowPos[i3] +=
            Math.sin(t * 0.8 + snowPhase[i]) * dt * 0.6 + dG * 0.15; // snow drifts with wolf motion
          // wrap
          if (snowPos[i3 + 1] < 0) {
            snowPos[i3 + 1] = 16 + Math.random() * 2;
            snowPos[i3] = (Math.random() - 0.5) * 32;
          }
          if (snowPos[i3] > 16) snowPos[i3] -= 32;
          else if (snowPos[i3] < -16) snowPos[i3] += 32;
        }
        snowAttr.needsUpdate = true;
        snowMat.size = 0.13 + scrollBurst * 0.08;
        snowMat.opacity = 0.85 + scrollBurst * 0.15;
        snowMat.color.copy(palette.key);
      } else {
        // Embers rise upward, flicker, wrap at top
        for (let i = 0; i < EMBER_N; i++) {
          const i3 = i * 3;
          emberPos[i3 + 1] += emberVel[i] * dt * (1.0 + scrollBurst * 2.5);
          emberPos[i3] +=
            Math.sin(t * 1.6 + emberPhase[i]) * dt * 0.9 +
            Math.sin(t * 4.0 + i) * dt * 0.3;
          // wrap
          if (emberPos[i3 + 1] > 16) {
            emberPos[i3 + 1] = -0.5 - Math.random();
            emberPos[i3] = (Math.random() - 0.5) * 32;
          }
          if (emberPos[i3] > 16) emberPos[i3] -= 32;
          else if (emberPos[i3] < -16) emberPos[i3] += 32;
        }
        emberAttr.needsUpdate = true;
        emberMat.size = 0.12 + scrollBurst * 0.09;
        emberMat.opacity = 0.9;
      }
      void scrollSpeedBoost;

      /* ---------- camera ---------- */
      const r = cam.r * fitAspect() * (1 + (1 - intro) * 0.55);
      const a = rad(cam.a);
      const el = rad(cam.el);
      camera.position.set(
        cam.tx + r * Math.cos(a) * Math.cos(el) + mouse.x * 0.35,
        cam.ty +
          r * Math.sin(el) +
          mouse.y * 0.2 +
          Math.sin(t * 0.5) * 0.05 * idle,
        r * Math.sin(a) * Math.cos(el),
      );
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(cam.tx, cam.ty, 0);

      /* ---------- moon ---------- */
      const ms = smooth(p);
      moon.position.set(lerp(9, 1.2, ms), lerp(5.5, 5.4, ms), -34);
      moon.scale.setScalar(lerp(1, 1.45, ms));
      moonMat.opacity = darkMode ? 0.95 : 0.22;
      moonMat.color.copy(palette.key);
      haloMat.opacity = darkMode ? 0.28 : 0.16;
      haloMat.color.copy(palette.fill);
      gridMat.color.copy(palette.fill);

      // background pulse (kept gentle so the grid stays quiet)
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
      gridMat.opacity =
        (darkMode ? GRID_OPACITY.dark : GRID_OPACITY.light) +
        pulse * 0.03 +
        scrollBurst * 0.05;

      /* ---------- DOM ---------- */
      const W = window.innerWidth;
      const skew = THREE.MathUtils.clamp(-velS * 0.35, -10, 10);
      const rows = rowRefs.current;
      if (rows[0])
        rows[0].style.transform = `translate3d(${-p * 2.2 * W}px,0,0) skewX(${skew}deg)`;
      if (rows[1])
        rows[1].style.transform = `translate3d(${-2.2 * W + p * 2.2 * W}px,0,0) skewX(${skew}deg)`;
      if (rows[2])
        rows[2].style.transform = `translate3d(${-p * 1.2 * W}px,0,0) skewX(${skew}deg)`;

      wordRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = p - WORD_AT[i];
        const o = Math.max(0, 1 - Math.abs(d) / 0.14);
        el.style.opacity = String(o);
        el.style.transform = `translate3d(0,${-d * 260}px,0) scale(${1 + d * 0.5})`;
      });

      const idx = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
      if (idx !== phaseIdx && hudLabelRef.current) {
        phaseIdx = idx;
        hudLabelRef.current.textContent = PHASES[idx];
      }
      if (hudBarRef.current) hudBarRef.current.style.transform = `scaleX(${p})`;

      renderer.render(scene, camera);
    };

    let rafId = 0;
    let last = performance.now();
    const t0 = last;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frame(dt, (now - t0) / 1000);
      rafId = requestAnimationFrame(loop);
    };
    const start = () => {
      if (rafId) return;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      needsRender = true;
    });
    ro.observe(container);

    const themeObs = new MutationObserver(() => {
      applyTheme();
      needsRender = true;
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      stop();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      themeObs.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mats = Array.isArray(m.material)
          ? m.material
          : m.material
            ? [m.material]
            : [];
        mats.forEach((mm) => {
          (mm as THREE.MeshBasicMaterial).map?.dispose?.();
          mm.dispose();
        });
      });
      glowTex.dispose();
      snowTex.dispose();
      emberTex.dispose();
      matCache.forEach((m) => m.dispose());
      matCache.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  const stroke = (pct: number) => ({
    color: "transparent",
    WebkitTextStroke: `1.5px color-mix(in srgb, var(--brand) ${pct}%, transparent)`,
  });

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 -z-50 overflow-hidden bg-background transition-colors duration-500"
      >
        <div className="absolute -left-48 -top-48 h-[640px] w-[640px] bg-[radial-gradient(circle,rgba(34,211,238,0.14),transparent_65%)]" />
        <div className="absolute -bottom-48 -right-48 h-[640px] w-[640px] bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent_65%)]" />

        {ROW_TEXT.map((text, i) => (
          <div
            key={i}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className="absolute left-0 whitespace-nowrap font-mono font-black uppercase leading-none will-change-transform"
            style={{
              top: ROW_TOP[i],
              fontSize: "clamp(6rem, 15vw, 14rem)",
              ...stroke(TEXT_STROKE.rows[i]),
            }}
          >
            {text}
          </div>
        ))}

        {WORDS.map((w, i) => (
          <div
            key={w}
            ref={(el) => {
              wordRefs.current[i] = el;
            }}
            className="absolute inset-0 flex items-center justify-center font-mono font-black uppercase leading-none tracking-widest opacity-0 will-change-transform"
            style={{
              fontSize: "clamp(6rem, 24vw, 22rem)",
              ...stroke(TEXT_STROKE.words),
            }}
          >
            {w}
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-40 opacity-0"
      />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-30 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_105%)] opacity-80"
      />

      <div
        aria-hidden
        className="pointer-events-none fixed bottom-6 left-6 z-20 hidden border-2 border-foreground bg-background/90 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground/80 shadow-[4px_4px_0px_0px_var(--brand)] backdrop-blur-xl sm:block"
      >
        <div ref={hudLabelRef}>{PHASES[0]}</div>
        <div className="mt-2 h-1 w-48 bg-foreground/15">
          <div
            ref={hudBarRef}
            className="h-full w-full origin-left bg-brand"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </>
  );
}