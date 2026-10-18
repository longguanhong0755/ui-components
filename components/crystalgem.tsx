"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const CLEAN_SURFACE_MATCAP =
    "https://framerusercontent.com/images/vAQ2QjTRfv9wqQADIrYT1GY2Lf0.png";

const PERSPECTIVE = 0.15;

const DEFAULTS = {
    color: "#7900FF",
    shine: 10,
    facets: 10,
    speed: 18,
    direction: "left" as const,
    dragSensitivity: 5,
    tiltX: 17,
    tiltY: 0,
    sizePercent: 100,
};

type Config = {
    color: string;
    shine: number;
    facets: number;
    speed: number;
    direction: "right" | "left";
    dragSensitivity: number;
    tiltX: number;
    tiltY: number;
    sizePercent: number;
};

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback;
    return Math.max(lo, Math.min(hi, n));
}

const matcapCache = new Map<string, THREE.Texture>();
const matcapPending = new Map<string, Promise<THREE.Texture | null>>();

function loadMatcap(url: string): Promise<THREE.Texture | null> {
    const cached = matcapCache.get(url);
    if (cached) return Promise.resolve(cached);
    const pending = matcapPending.get(url);
    if (pending) return pending;
    const p = new Promise<THREE.Texture | null>((resolve) => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                matcapCache.set(url, texture);
                resolve(texture);
            },
            undefined,
            () => resolve(null)
        );
    });
    matcapPending.set(url, p);
    return p;
}

const TABLE_RADIUS = 0.52;
const TABLE_HEIGHT = 0.46;
const GIRDLE_HEIGHT = 0.0;
const PAVILION_TIP = -1.05;

function buildGemGeometry(facetCount: number): THREE.BufferGeometry {
    const n = clamp(facetCount, 5, 10, 8);
    const step = (Math.PI * 2) / n;

    const table: THREE.Vector3[] = [];
    const girdle: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
        const a = i * step;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        table.push(
            new THREE.Vector3(
                cos * TABLE_RADIUS,
                TABLE_HEIGHT,
                sin * TABLE_RADIUS
            )
        );
        girdle.push(new THREE.Vector3(cos, GIRDLE_HEIGHT, sin));
    }
    const tip = new THREE.Vector3(0, PAVILION_TIP, 0);

    const verts: number[] = [];
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const centroid = new THREE.Vector3();

    const face = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
        ab.subVectors(b, a);
        ac.subVectors(c, a);
        normal.crossVectors(ab, ac);
        centroid.copy(a).add(b).add(c).divideScalar(3);
        const flipped = normal.dot(centroid) < 0;
        const [p, q, r] = flipped ? [a, c, b] : [a, b, c];
        verts.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    };

    for (let i = 1; i < n - 1; i++) face(table[0], table[i], table[i + 1]);

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const t0 = table[i];
        const t1 = table[j];
        const g0 = girdle[i];
        const g1 = girdle[j];

        face(t0, g0, g1);
        face(t0, g1, t1);

        face(g0, tip, g1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(verts, 3)
    );
    geometry.computeVertexNormals();
    return geometry;
}

class GemScene {
    private container: HTMLElement;
    private cfg: Config;

    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
    private group = new THREE.Group();

    private material: THREE.MeshMatcapMaterial;
    private shineUniform = { value: 0.5 };
    private geometry: THREE.BufferGeometry;
    private mesh: THREE.Mesh;

    private spinAngle = 0;
    private dragX = 0;
    private dragY = 0;
    private velX = 0;
    private velY = 0;
    private isDragging = false;
    private lastX = 0;
    private lastY = 0;

    private width = 0;
    private height = 0;
    private frameId = 0;
    private lastT = 0;
    private disposed = false;

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container;
        this.cfg = cfg;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        const el = this.renderer.domElement;
        el.style.position = "absolute";
        el.style.inset = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.cursor = "grab";
        el.style.touchAction = "none";
        container.appendChild(el);

        this.material = new THREE.MeshMatcapMaterial({
            color: new THREE.Color(cfg.color || "#ffffff"),
        });
        this.shineUniform.value = clamp(cfg.shine, 0, 10, 5) / 10;
        this.patchShine();
        this.geometry = buildGemGeometry(cfg.facets);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.group.add(this.mesh);
        this.scene.add(this.group);

        this.applyMatcap();
        this.bindEvents();
    }

    private patchShine() {
        this.material.onBeforeCompile = (shader) => {
            shader.uniforms.uShine = this.shineUniform;
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    "void main() {",
                    "uniform float uShine;\nvoid main() {"
                )
                .replace(
                    "vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;",
                    `vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
                    vec3 gemView = normalize( vViewPosition );
                    vec3 gemKey = normalize( vec3( -0.35, 0.62, 0.9 ) );
                    vec3 gemFill = normalize( vec3( 0.75, -0.2, 0.7 ) );

                    float gemKeyDot = max( dot( normal, gemKey ), 0.0 );
                    float gemFillDot = max( dot( normal, gemFill ), 0.0 );
                    float gemShade = 0.30 + 0.62 * gemKeyDot + 0.26 * gemFillDot;
                    outgoingLight *= mix( 1.0, gemShade, uShine );

                    float gemRim = pow( 1.0 - max( dot( normal, gemView ), 0.0 ), 4.0 );

                    float gemLum = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
                    float gemDark = pow( 1.0 - clamp( gemLum, 0.0, 1.0 ), 3.0 );
                    outgoingLight += matcapColor.rgb * gemDark
                        * ( 0.20 * gemKeyDot + 0.12 * gemFillDot + 0.42 * gemRim )
                        * ( 0.35 + 0.65 * uShine );

                    float gemSpec = pow( max( dot( normal, normalize( gemKey + gemView ) ), 0.0 ), 90.0 )
                                  + pow( max( dot( normal, normalize( gemFill + gemView ) ), 0.0 ), 48.0 ) * 0.45;
                    outgoingLight += ( gemSpec * 1.9 + gemRim * 0.3 ) * uShine;`
                );
        };
        this.material.needsUpdate = true;
    }

    private applyMatcap() {
        loadMatcap(CLEAN_SURFACE_MATCAP).then((t) => {
            if (this.disposed || !t) return;
            this.material.matcap = t;
            this.material.needsUpdate = true;
        });
    }

    private bindEvents() {
        const el = this.renderer.domElement;
        const down = (e: PointerEvent) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.velX = 0;
            this.velY = 0;
            el.style.cursor = "grabbing";
        };
        const move = (e: PointerEvent) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            const s = clamp(this.cfg.dragSensitivity, 1, 10, 3) * 0.007;
            this.dragY += dx * s;
            this.dragX += dy * s;
            this.velY = dx * s;
            this.velX = dy * s;
        };
        const up = () => {
            this.isDragging = false;
            el.style.cursor = "grab";
        };
        el.addEventListener("pointerdown", down);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        el.addEventListener("pointerleave", up);
        this.unbind = () => {
            el.removeEventListener("pointerdown", down);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            el.removeEventListener("pointerleave", up);
        };
    }

    private unbind = () => {};

    start() {
        this.lastT = performance.now();
        const loop = () => {
            this.frameId = requestAnimationFrame(loop);
            this.step();
        };
        loop();
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return;
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height, false);
        this.updateCamera();
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return;
        const prev = this.cfg;
        this.cfg = cfg;
        this.material.color.set(cfg.color || "#ffffff");
        this.shineUniform.value = clamp(cfg.shine, 0, 10, 5) / 10;

        if (clamp(cfg.facets, 5, 10, 8) !== clamp(prev.facets, 5, 10, 8)) {
            const next = buildGemGeometry(cfg.facets);
            this.geometry.dispose();
            this.geometry = next;
            this.mesh.geometry = next;
        }
        this.updateCamera();
    }

    private updateCamera() {
        const w = Math.max(1, this.width);
        const h = Math.max(1, this.height);
        const aspect = w / h;
        const distance = 1 / PERSPECTIVE;
        const sizePct = clamp(this.cfg.sizePercent, 20, 200, 85);
        const span = 2.6 * (100 / sizePct);
        const visibleHeight = aspect < 1 ? span / aspect : span;

        this.camera.aspect = aspect;
        this.camera.position.set(0, 0.25, distance);
        this.camera.lookAt(0, -0.05, 0);
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
        this.camera.near = Math.max(0.1, distance - 20);
        this.camera.far = distance + 20;
        this.camera.updateProjectionMatrix();
    }

    private step() {
        if (this.disposed) return;
        const now = performance.now();
        let dt = (now - this.lastT) / 1000;
        this.lastT = now;
        if (!isFinite(dt) || dt < 0) dt = 0;
        if (dt > 0.05) dt = 0.05;

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3);
            this.dragY += this.velY;
            this.dragX += this.velX;
            this.velX *= decay;
            this.velY *= decay;

            const dir = this.cfg.direction === "left" ? -1 : 1;
            this.spinAngle += clamp(this.cfg.speed, 1, 20, 6) * 0.09 * dt * dir;
        }

        const tiltX = (clamp(this.cfg.tiltX, 0, 60, 10) * Math.PI) / 180;
        const tiltY = (clamp(this.cfg.tiltY, 0, 60, 0) * Math.PI) / 180;
        this.group.rotation.set(
            tiltX + this.dragX * 0.5,
            this.spinAngle + this.dragY,
            tiltY
        );

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        this.unbind();
        this.geometry.dispose();
        this.material.dispose();
        this.renderer.dispose();
        const el = this.renderer.domElement;
        if (el.parentNode === this.container) this.container.removeChild(el);
    }
}

type Props = Partial<Config> & { style?: React.CSSProperties };

function __BaseImpl_CrystalGem(props: Props) {
    const {
        color = DEFAULTS.color,
        shine = DEFAULTS.shine,
        facets = DEFAULTS.facets,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction,
        dragSensitivity = DEFAULTS.dragSensitivity,
        tiltX = DEFAULTS.tiltX,
        tiltY = DEFAULTS.tiltY,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<GemScene | null>(null);

    const cfgRef = useRef<Config>(null as any);
    cfgRef.current = {
        color,
        shine,
        facets,
        speed,
        direction,
        dragSensitivity,
        tiltX,
        tiltY,
        sizePercent,
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let scene: GemScene;
        try {
            scene = new GemScene(container, cfgRef.current);
        } catch {
            return;
        }
        sceneRef.current = scene;
        scene.setSize(container.clientWidth, container.clientHeight);
        scene.start();

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight);
        });
        ro.observe(container);
        return () => {
            ro.disconnect();
            scene.dispose();
            sceneRef.current = null;
        };
    }, []);

    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current);
    }, [
        color,
        shine,
        facets,
        speed,
        direction,
        dragSensitivity,
        tiltX,
        tiltY,
        sizePercent,
    ]);

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Crystal gem"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 180,
                minHeight: 180,
                overflow: "hidden",
                ...style,
            }}
        />
    );
}

const __presetProps = {
  "color": "#7900FF",
  "sizePercent": 100,
  "facets": 10,
  "shine": 10,
  "speed": 18,
  "direction": "left",
  "dragSensitivity": 5,
  "tiltX": 17,
  "tiltY": 0
};

export default function CrystalGem(props: Record<string, unknown>) {
  return <__BaseImpl_CrystalGem {...(__presetProps as Record<string, unknown>)} {...props} />;
}
