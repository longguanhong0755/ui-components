"use client";

import * as React from "react";
import { startTransition, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const vertexShader = /* glsl */ `
varying vec2 vUv;

uniform float uTime;
uniform float uAmpX;
uniform float uAmpY;

void main() {
    vUv = uv;
    float time = uTime * 5.0;

    vec3 transformed = position;

    transformed.x += sin(time + position.y) * uAmpX;
    transformed.y += cos(time + position.z) * uAmpY;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uTexture;

void main() {
    gl_FragColor = texture2D(uTexture, vUv);
}
`;

function map(
    n: number,
    start: number,
    stop: number,
    start2: number,
    stop2: number
) {
    return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
}

function toPx(value: unknown, fallback: number): number {
    if (typeof value === "number" && isFinite(value)) return value;
    if (typeof value === "string") {
        const n = parseFloat(value);
        if (isFinite(n)) return n;
    }
    return fallback;
}

function resolveLineHeight(value: unknown, fontSize: number): number {
    if (typeof value === "number" && isFinite(value)) {
        return value <= 4 ? fontSize * value : value;
    }
    if (typeof value === "string") {
        const n = parseFloat(value);
        if (!isFinite(n)) return fontSize * 1.2;
        if (value.includes("px")) return n;
        if (value.includes("%")) return (fontSize * n) / 100;
        return fontSize * n;
    }
    return fontSize * 1.2;
}

function quoteFamily(family: string): string {
    return family
        .split(",")
        .map((part) => {
            const f = part.trim();
            if (!f) return "";
            if (f.startsWith('"') || f.startsWith("'")) return f;
            return /\s/.test(f) ? `"${f}"` : f;
        })
        .filter(Boolean)
        .join(", ");
}

function scaleLetterSpacing(value: string, factor: number): string {
    if (!value) return value;
    const n = parseFloat(value);
    if (!isFinite(n)) return value;
    if (value.includes("px")) return `${n * factor}px`;
    return value;
}

type SizeMode = "fit" | "font" | "wrap";

type FillConfig = {
    fillMode: "solid" | "gradient";
    color: string;
    gradient: { angle: number; color1: string; color2: string; color3: string };
};

type TextConfig = FillConfig & {
    text: string;
    fontFamily: string;
    fontWeight: string | number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: string;
    textAlign: "left" | "center" | "right";
    sizeMode: SizeMode;
    quality: number;
};

type Metrics = {
    font: string;
    letterSpacing: string;
    lineHeight: number;
    pad: number;
    ascent: number;
    width: number;
    height: number;
};

const MAX_TEXTURE_EDGE = 4096;
const MIN_FIT_TEXTURE_HEIGHT = 256;
const MAX_FIT_TEXTURE_HEIGHT = 2048;

class TextTexture {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
    dpr: number = 1;
    logicalWidth: number = 1;
    logicalHeight: number = 1;
    logicalNaturalWidth: number = 1;

    constructor() {
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
    }

    draw(
        config: TextConfig,
        fitTargetHeight: number,
        wrapWidthPx: number = 0
    ): boolean {
        const ctx = this.context;
        if (!ctx) return false;

        const rawLines = (config.text ?? "").split("\n");
        const baseFontSize = Math.max(1, config.fontSize);

        let lines = rawLines;
        if (
            (config.sizeMode === "wrap" || config.sizeMode === "font") &&
            wrapWidthPx > 0
        ) {
            const pad = Math.ceil(baseFontSize * 0.35);
            const maxLineWidth = Math.max(1, wrapWidthPx - pad * 2);
            lines = this.wrapText(
                ctx,
                rawLines,
                config,
                baseFontSize,
                maxLineWidth
            );
        }

        const base = this.measure(ctx, lines, config, baseFontSize, 1);
        if (!base) return false;

        const quality = Math.max(1, config.quality || 1);
        let renderScale =
            config.sizeMode === "fit"
                ? (fitTargetHeight * quality) / base.height
                : quality;
        if (!isFinite(renderScale) || renderScale <= 0) renderScale = 1;

        const m = this.measure(
            ctx,
            lines,
            config,
            baseFontSize * renderScale,
            renderScale
        );
        if (!m) return false;

        this.logicalWidth = m.width / renderScale;
        this.logicalHeight = m.height / renderScale;

        const natural = this.measure(ctx, rawLines, config, baseFontSize, 1);
        this.logicalNaturalWidth = natural ? natural.width : this.logicalWidth;

        const dpr = Math.min(
            typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
            2,
            MAX_TEXTURE_EDGE / m.width,
            MAX_TEXTURE_EDGE / m.height
        );
        this.dpr = dpr;

        this.canvas.width = Math.max(1, Math.floor(m.width * dpr));
        this.canvas.height = Math.max(1, Math.floor(m.height * dpr));

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, m.width, m.height);
        ctx.font = m.font;
        this.applyLetterSpacing(ctx, m.letterSpacing);
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = this.buildFill(ctx, config, m.width, m.height);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWidth = ctx.measureText(line).width;
            let x = m.pad;
            if (config.textAlign === "center") x = (m.width - lineWidth) / 2;
            else if (config.textAlign === "right")
                x = m.width - m.pad - lineWidth;
            ctx.fillText(line, x, m.pad + m.ascent + m.lineHeight * i);
        }

        return true;
    }

    private wrapText(
        ctx: CanvasRenderingContext2D,
        rawLines: string[],
        config: TextConfig,
        fontSize: number,
        maxWidth: number
    ): string[] {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = `${config.fontWeight} ${fontSize}px ${quoteFamily(config.fontFamily)}`;
        this.applyLetterSpacing(ctx, config.letterSpacing);

        const out: string[] = [];
        for (const para of rawLines) {
            if (para.trim() === "") {
                out.push("");
                continue;
            }
            const words = para.split(/\s+/).filter((w) => w.length > 0);
            let current = "";
            for (const word of words) {
                if (!current) {
                    if (ctx.measureText(word).width <= maxWidth) {
                        current = word;
                    } else {
                        const parts = this.breakWord(ctx, word, maxWidth);
                        for (let i = 0; i < parts.length - 1; i++)
                            out.push(parts[i]);
                        current = parts[parts.length - 1];
                    }
                    continue;
                }
                const test = current + " " + word;
                if (ctx.measureText(test).width <= maxWidth) {
                    current = test;
                } else {
                    out.push(current);
                    if (ctx.measureText(word).width <= maxWidth) {
                        current = word;
                    } else {
                        const parts = this.breakWord(ctx, word, maxWidth);
                        for (let i = 0; i < parts.length - 1; i++)
                            out.push(parts[i]);
                        current = parts[parts.length - 1];
                    }
                }
            }
            out.push(current);
        }
        return out.length ? out : [""];
    }

    private breakWord(
        ctx: CanvasRenderingContext2D,
        word: string,
        maxWidth: number
    ): string[] {
        const out: string[] = [];
        let chunk = "";
        for (const ch of word) {
            if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
                out.push(chunk);
                chunk = ch;
            } else {
                chunk += ch;
            }
        }
        if (chunk) out.push(chunk);
        return out.length ? out : [word];
    }

    private measure(
        ctx: CanvasRenderingContext2D,
        lines: string[],
        config: TextConfig,
        fontSize: number,
        scale: number
    ): Metrics | null {
        const font = `${config.fontWeight} ${fontSize}px ${quoteFamily(config.fontFamily)}`;
        const letterSpacing = scaleLetterSpacing(config.letterSpacing, scale);
        const lineHeight = config.lineHeight * scale;
        const pad = Math.ceil(fontSize * 0.35);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = font;
        this.applyLetterSpacing(ctx, letterSpacing);

        let widest = 0;
        let ascent = fontSize * 0.8;
        let descent = fontSize * 0.2;
        for (let i = 0; i < lines.length; i++) {
            const metrics = ctx.measureText(lines[i] || " ");
            widest = Math.max(widest, metrics.width);
            if (i === 0 && isFinite(metrics.actualBoundingBoxAscent)) {
                ascent = metrics.actualBoundingBoxAscent;
            }
            if (
                i === lines.length - 1 &&
                isFinite(metrics.actualBoundingBoxDescent)
            ) {
                descent = metrics.actualBoundingBoxDescent;
            }
        }

        const width = Math.ceil(widest) + pad * 2;
        const height =
            Math.ceil(ascent + descent + lineHeight * (lines.length - 1)) +
            pad * 2;
        if (width <= 0 || height <= 0) return null;

        return { font, letterSpacing, lineHeight, pad, ascent, width, height };
    }

    private applyLetterSpacing(
        ctx: CanvasRenderingContext2D,
        letterSpacing: string
    ) {
        try {
            (ctx as any).letterSpacing = letterSpacing || "0px";
        } catch (e) {}
    }

    private buildFill(
        ctx: CanvasRenderingContext2D,
        config: FillConfig,
        width: number,
        height: number
    ): string | CanvasGradient {
        if (config.fillMode !== "gradient") return config.color;

        const rad = (config.gradient.angle * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const len =
            Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
        const dx = (Math.cos(rad) * len) / 2;
        const dy = (Math.sin(rad) * len) / 2;

        const gradient = ctx.createLinearGradient(
            cx - dx,
            cy - dy,
            cx + dx,
            cy + dy
        );
        gradient.addColorStop(0, config.gradient.color1);
        gradient.addColorStop(0.5, config.gradient.color2);
        gradient.addColorStop(1, config.gradient.color3);
        return gradient;
    }

    get aspect() {
        return this.canvas.height > 0
            ? this.canvas.width / this.canvas.height
            : 1;
    }
}

const BASE_PLANE_HEIGHT = 8;
const CAMERA_FOV = 45;
const CAMERA_Z = 30;
const TILT_STRENGTH = 0;

function configureCanvasTexture(texture: THREE.CanvasTexture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
}

type SceneUniforms = {
    speed: number;
    ampX: number;
    ampY: number;
};

class WavyTextScene {
    container: HTMLElement;
    width: number;
    height: number;

    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    renderer!: THREE.WebGLRenderer;
    textTexture: TextTexture;
    texture!: THREE.CanvasTexture;
    geometry!: THREE.PlaneGeometry;
    material!: THREE.ShaderMaterial;
    mesh!: THREE.Mesh;

    planeWidth: number = BASE_PLANE_HEIGHT;
    planeHeight: number = BASE_PLANE_HEIGHT;
    scalePercent: number = 100;
    sizeMode: SizeMode = "font";

    pointer: { x: number; y: number };

    onMeasure?: (width: number, height: number, naturalWidth: number) => void;

    private speed: number = 1;
    private startTime: number = 0;
    private frameId: number = 0;
    private disposed: boolean = false;
    private currentConfig: TextConfig | null = null;

    constructor(container: HTMLElement, width: number, height: number) {
        this.container = container;
        this.width = width;
        this.height = height;

        this.camera = new THREE.PerspectiveCamera(
            CAMERA_FOV,
            width / height,
            1,
            1000
        );
        this.camera.position.z = CAMERA_Z;

        this.scene = new THREE.Scene();
        this.textTexture = new TextTexture();
        this.pointer = { x: width / 2, y: height / 2 };

        this.onPointerMove = this.onPointerMove.bind(this);
    }

    init(initialText: TextConfig) {
        this.sizeMode = initialText.sizeMode;
        this.currentConfig = initialText;
        this.textTexture.draw(
            initialText,
            this.fitTargetHeight(),
            this.wrapMaxWidth()
        );

        this.texture = new THREE.CanvasTexture(this.textTexture.canvas);
        configureCanvasTexture(this.texture);

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: this.texture },
                uAmpX: { value: 0.5 },
                uAmpY: { value: 0.2 },
            },
        });

        this.buildGeometry();

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.domElement.style.position = "absolute";
        this.renderer.domElement.style.inset = "0";
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";
        this.container.appendChild(this.renderer.domElement);

        this.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        this.setSize(this.width, this.height);

        this.emitMeasure();

        this.container.addEventListener("mousemove", this.onPointerMove);
        this.container.addEventListener("touchmove", this.onPointerMove, {
            passive: true,
        });

        this.startTime = performance.now();
        this.animate();
    }

    private emitMeasure() {
        if (this.disposed) return;
        this.onMeasure?.(
            this.textTexture.logicalWidth,
            this.textTexture.logicalHeight,
            this.textTexture.logicalNaturalWidth
        );
    }

    private fitTargetHeight() {
        const fraction = Math.max(0.01, this.scalePercent / 100);
        return Math.min(
            MAX_FIT_TEXTURE_HEIGHT,
            Math.max(MIN_FIT_TEXTURE_HEIGHT, this.height * fraction)
        );
    }

    private wrapMaxWidth() {
        const fraction = Math.max(0.01, this.scalePercent / 100);
        return this.width / fraction;
    }

    private buildGeometry() {
        const aspect = this.textTexture.aspect;
        this.planeHeight = BASE_PLANE_HEIGHT;
        this.planeWidth = BASE_PLANE_HEIGHT * aspect;

        if (this.geometry) this.geometry.dispose();
        this.geometry = new THREE.PlaneGeometry(
            this.planeWidth,
            this.planeHeight,
            36,
            36
        );

        if (this.mesh) {
            this.mesh.geometry = this.geometry;
        } else {
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.scene.add(this.mesh);
        }
        this.applyFit();
    }

    private applyFit() {
        if (!this.mesh) return;
        const visibleHeight =
            2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z;
        const visibleWidth = visibleHeight * this.camera.aspect;
        const fraction = Math.max(0.01, this.scalePercent / 100);

        let scale: number;
        if (this.sizeMode === "font" || this.sizeMode === "wrap") {
            const worldPerPx = visibleHeight / Math.max(1, this.height);
            const targetHeight = this.textTexture.logicalHeight * worldPerPx;
            scale = (targetHeight / this.planeHeight) * fraction;
        } else {
            const byWidth = (visibleWidth * fraction) / this.planeWidth;
            const byHeight = (visibleHeight * fraction) / this.planeHeight;
            scale = Math.min(byWidth, byHeight);
        }

        this.mesh.scale.setScalar(isFinite(scale) && scale > 0 ? scale : 1);
    }

    updateText(config: TextConfig) {
        if (this.disposed || !this.texture) return;
        this.sizeMode = config.sizeMode;
        this.currentConfig = config;
        const previousAspect = this.textTexture.aspect;
        if (
            !this.textTexture.draw(
                config,
                this.fitTargetHeight(),
                this.wrapMaxWidth()
            )
        )
            return;

        this.texture.dispose();
        this.texture = new THREE.CanvasTexture(this.textTexture.canvas);
        configureCanvasTexture(this.texture);
        if (this.renderer) {
            this.texture.anisotropy =
                this.renderer.capabilities.getMaxAnisotropy();
        }
        this.material.uniforms.uTexture.value = this.texture;

        if (Math.abs(this.textTexture.aspect - previousAspect) > 0.001)
            this.buildGeometry();
        else this.applyFit();

        this.emitMeasure();
    }

    updateUniforms(config: SceneUniforms) {
        if (this.disposed || !this.material) return;
        const u = this.material.uniforms;
        u.uAmpX.value = config.ampX;
        u.uAmpY.value = config.ampY;
        this.speed = config.speed;
    }

    updateLayout(scalePercent: number, sizeMode: SizeMode) {
        this.scalePercent = scalePercent;
        this.sizeMode = sizeMode;
        if (
            (sizeMode === "wrap" || sizeMode === "font") &&
            this.currentConfig
        ) {
            this.updateText(this.currentConfig);
        } else {
            this.applyFit();
        }
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return;
        const widthChanged = Math.abs(width - this.width) > 0.5;
        this.width = width;
        this.height = height;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);

        if (
            (this.sizeMode === "wrap" || this.sizeMode === "font") &&
            widthChanged &&
            this.currentConfig
        ) {
            this.updateText(this.currentConfig);
        } else {
            this.applyFit();
        }
    }

    private onPointerMove(event: MouseEvent | TouchEvent) {
        const source =
            (event as TouchEvent).touches?.[0] ?? (event as MouseEvent);
        const bounds = this.container.getBoundingClientRect();
        this.pointer = {
            x: source.clientX - bounds.left,
            y: source.clientY - bounds.top,
        };
    }

    private animate() {
        const frame = () => {
            this.frameId = requestAnimationFrame(frame);
            this.render();
        };
        frame();
    }

    private render() {
        if (this.disposed) return;

        const elapsed =
            (performance.now() - this.startTime) * 0.0001 * this.speed;
        this.material.uniforms.uTime.value = Math.sin(elapsed);

        this.updateRotation();
        this.renderer.render(this.scene, this.camera);
    }

    private updateRotation() {
        const targetX =
            map(this.pointer.y, 0, this.height, 0.5, -0.5) * TILT_STRENGTH;
        const targetY =
            map(this.pointer.x, 0, this.width, -0.5, 0.5) * TILT_STRENGTH;

        this.mesh.rotation.x += (targetX - this.mesh.rotation.x) * 0.05;
        this.mesh.rotation.y += (targetY - this.mesh.rotation.y) * 0.05;
    }

    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);

        this.container.removeEventListener("mousemove", this.onPointerMove);
        this.container.removeEventListener("touchmove", this.onPointerMove);

        if (this.mesh) this.scene.remove(this.mesh);
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.texture) this.texture.dispose();
        this.scene.clear();

        if (this.renderer) {
            if (this.renderer.domElement.parentNode === this.container) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
    }
}

type FontConfig = {
    fontFamily?: string;
    fontWeight?: string | number;
    fontSize?: number | string;
    lineHeight?: number | string;
    letterSpacing?: string;
    textAlign?: "left" | "center" | "right";
};

type WavyTextProps = {
    text?: string;
    font?: FontConfig;
    fillMode?: "solid" | "gradient";
    color?: string;
    gradient?: { angle: number; color1: string; color2: string; color3: string };
    sizeMode?: SizeMode;
    scalePercent?: number;
    quality?: number;
    speed?: number;
    ampX?: number;
    ampY?: number;
    style?: React.CSSProperties;
};

function __BaseImpl_WavyText(props: WavyTextProps) {
    const {
        text = "David!",
        font,
        fillMode = "gradient",
        color = "#fdf9f3",
        gradient = {
            angle: 0,
            color1: "#ff6188",
            color2: "#fc9867",
            color3: "#ffd866",
        },
        sizeMode = "font",
        scalePercent = 100,
        quality = 2,
        speed = 1,
        ampX = 5,
        ampY = 2,
        style,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<WavyTextScene | null>(null);
    const [webglFailed, setWebglFailed] = useState(false);
    const [measured, setMeasured] = useState<{
        width: number;
        height: number;
        naturalWidth: number;
    } | null>(null);

    const fontFamily =
        (font?.fontFamily as string) || "IBM Plex Mono, monospace";
    const fontWeight = (font?.fontWeight as string | number) ?? 600;
    const fontSize = toPx(font?.fontSize, 200);
    const lineHeight = resolveLineHeight(font?.lineHeight, fontSize);
    const letterSpacing =
        typeof font?.letterSpacing === "string" ? font.letterSpacing : "";
    const textAlign = (font?.textAlign as TextConfig["textAlign"]) || "left";

    const textConfig: TextConfig = {
        text,
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight,
        letterSpacing,
        textAlign,
        fillMode,
        color,
        gradient,
        sizeMode,
        quality,
    };

    const configRef = useRef(textConfig);
    configRef.current = textConfig;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        let scene: WavyTextScene | null = null;

        const resizeObserver = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect || rect.width <= 0 || rect.height <= 0) return;

            if (!scene && !cancelled) {
                try {
                    scene = new WavyTextScene(
                        container,
                        rect.width,
                        rect.height
                    );
                    sceneRef.current = scene;
                    scene.onMeasure = (w, h, nw) => {
                        startTransition(() =>
                            setMeasured((prev) =>
                                prev &&
                                Math.abs(prev.width - w) < 0.5 &&
                                Math.abs(prev.height - h) < 0.5 &&
                                Math.abs(prev.naturalWidth - nw) < 0.5
                                    ? prev
                                    : { width: w, height: h, naturalWidth: nw }
                            )
                        );
                    };
                    scene.init(configRef.current);
                    startTransition(() => setWebglFailed(false));
                    document.fonts?.ready.then(() => {
                        if (!cancelled)
                            sceneRef.current?.updateText(configRef.current);
                    });
                } catch (error) {
                    console.error(
                        "[WavyText] WebGL initialization failed:",
                        error
                    );
                    sceneRef.current?.dispose();
                    sceneRef.current = null;
                    scene = null;
                    startTransition(() => setWebglFailed(true));
                }
            } else if (scene) {
                scene.setSize(rect.width, rect.height);
            }
        });
        resizeObserver.observe(container);

        return () => {
            cancelled = true;
            resizeObserver.disconnect();
            sceneRef.current?.dispose();
            sceneRef.current = null;
        };
    }, []);

    useEffect(() => {
        const family = quoteFamily(fontFamily);
        let cancelled = false;

        const bake = () => {
            if (!cancelled) sceneRef.current?.updateText(configRef.current);
        };

        bake();
        document.fonts
            ?.load(`${fontWeight} ${fontSize}px ${family}`)
            .then(bake)
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [
        text,
        fontFamily,
        fontWeight,
        fontSize,
        lineHeight,
        letterSpacing,
        textAlign,
        fillMode,
        color,
        gradient?.angle,
        gradient?.color1,
        gradient?.color2,
        gradient?.color3,
        sizeMode,
        quality,
    ]);

    useEffect(() => {
        sceneRef.current?.updateUniforms({
            speed,
            ampX: ampX / 10,
            ampY: ampY / 10,
        });
    }, [speed, ampX, ampY]);

    useEffect(() => {
        sceneRef.current?.updateLayout(scalePercent, sizeMode);
    }, [scalePercent, sizeMode]);

    const fraction = Math.max(0.01, scalePercent / 100);

    let rootStyle: React.CSSProperties;
    if (sizeMode === "font" && measured) {
        rootStyle = {
            position: "relative",
            width: Math.ceil(measured.naturalWidth * fraction),
            height: Math.ceil(measured.height * fraction),
            ...style,
        };
    } else if (sizeMode === "wrap" && measured) {
        rootStyle = {
            position: "relative",
            width: "100%",
            height: Math.ceil(measured.height * fraction),
            minWidth: 100,
            ...style,
        };
    } else {
        rootStyle = {
            position: "relative",
            width: "100%",
            height: "100%",
            minWidth: 900,
            minHeight: 300,
            ...style,
        };
    }

    return (
        <div ref={containerRef} aria-label={text} role="img" style={rootStyle}>
            {webglFailed ? (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "12px",
                        color: fillMode === "solid" ? color : gradient.color2,
                        textAlign: "center",
                        fontFamily,
                        fontWeight,
                        fontSize: Math.max(16, Math.min(42, fontSize * 0.2)),
                        lineHeight: 1.2,
                        letterSpacing,
                        background: "transparent",
                    }}
                >
                    {text}
                </div>
            ) : null}
        </div>
    );
}

const __presetProps = {
  "ampX": 8,
  "ampY": 0,
  "font": {
    "variant": "Bold",
    "fontSize": "75px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1px",
    "letterSpacing": "-0.04px"
  },
  "text": "TEXT DISTORTION",
  "color": "#FFA011",
  "speed": 13,
  "fillMode": "solid",
  "gradient": {
    "angle": 0,
    "color1": "#ff6188",
    "color2": "#fc9867",
    "color3": "#ffd866"
  }
};

export default function WavyText(props: Record<string, unknown>) {
  return <__BaseImpl_WavyText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
