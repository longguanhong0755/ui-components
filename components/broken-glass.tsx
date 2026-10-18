"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * BrokenGlass — shattered-glass image reveal (WebGL).
 *
 * Port of "Broken Glass Effect (on click, WebGL)" by Ksenia Kondrashova
 * (codepen.io/ksenia-k/pen/abegNPO). The interaction is the reference's:
 * a click breaks the glass at the pointer with a new random shard layout.
 *
 * Port changes (rule 10 / 11 — staged port, clean break on keys):
 *  - lil-gui debug panel dropped; its four dials become property controls
 *    on whole-number scales (rule 3): distance 0–.2 -> Shatter 0–100 %,
 *    edgeThickness 0–.02 -> Cracks 0–100 %, scale_factor 1.4 -> Zoom %.
 *  - clickRandomizer is not a dial — a click rolls it, which is the effect.
 *  - window-sized canvas -> host-sized, measured from clientWidth/Height
 *    (getBoundingClientRect carries the canvas zoom, rule G).
 *  - `document.querySelector` DOM grabs and the `event` global leak removed;
 *    shader sources are module constants, GL is built once (rule 6).
 *  - pointer normalised against the canvas box, not window.inner*.
 *  - space-to-toggle keydown -> the `Cracked` control.
 *  - a Shards dial was built and cut: sector_size is random and saturates
 *    2π by ~8 sectors, so past that the loop count changed 0 px (rule F).
 *    The reference's 12 is frozen as the loop bound.
 */

const VERT = `
precision mediump float;
varying vec2 vUv;
attribute vec2 a_position;
void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D u_image_texture;
uniform float u_edge_thickness;
uniform float u_ratio;
uniform vec2 u_pointer_position;
uniform float u_img_ratio;
uniform float u_click_randomizer;
uniform float u_effect;
uniform float u_effect_active;
uniform float u_zoom;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

float random(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
}

float random2(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(
        mix(random2(ip), random2(ip + vec2(1.0, 0.0)), u.x),
        mix(random2(ip + vec2(0.0, 1.0)), random2(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

float get_sector_shape(float d, float a, float angle, float edges) {
    float angle1 = PI;
    float angle2 = angle1 + angle;
    float edge1 = smoothstep(angle1 - edges / d, angle1 + edges / d, a);
    float edge2 = smoothstep(angle2 - edges / d, angle2 + edges / d, a);
    return edge1 * (1. - edge2);
}

float get_img_frame_alpha(vec2 uv, float img_frame_width) {
    float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
    img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
    return img_frame_alpha;
}

float get_simple_cracks(float a, float d, float n) {
    a *= (1. + sin(2. * a + PI + 2. * u_click_randomizer));
    float simple_cracks_number = 10.;
    float simple_cracks_angle_step = TWO_PI / simple_cracks_number;
    float simple_crack_angle = mod(a + n + u_click_randomizer, simple_cracks_angle_step);
    float cracks_shape = 4. * abs(simple_crack_angle - .5 * simple_cracks_angle_step);
    cracks_shape = mix(cracks_shape, 1., smoothstep(.9, 1., d));
    cracks_shape *= pow(d + .4 * u_click_randomizer * max(0., cos(2. * a + u_click_randomizer) * sin(1. * a)), 12.);
    cracks_shape = (1. + n) * (1. + sin(4. * a)) * step(.9, cracks_shape);
    return cracks_shape;
}

vec2 get_img_uv() {
    vec2 img_uv = vUv;
    img_uv -= .5;
    if (u_ratio > u_img_ratio) {
        img_uv.x = img_uv.x * u_ratio / u_img_ratio;
    } else {
        img_uv.y = img_uv.y * u_img_ratio / u_ratio;
    }
    img_uv *= u_zoom;   // = 1.4 * 100/Zoom%, reference framing at 100
    img_uv += .5;
    img_uv.y = 1. - img_uv.y;
    return img_uv;
}

vec2 get_disturbed_uv(vec2 uv, float section_constant, float edge, vec2 direction, float border) {
    float img_distortion = u_effect * (section_constant - .5);
    vec2 disturbed_uv = uv;
    disturbed_uv += 2. * img_distortion;
    disturbed_uv.x -= mix(.03 * edge * direction.x, -.1 * edge, border);
    disturbed_uv.y -= mix(.03 * edge * direction.y, -.1 * edge, border);
    vec2 center = vec2(0.5, 0.5);
    disturbed_uv = disturbed_uv - center;
    float cosA = cos(4. * img_distortion);
    float sinA = sin(4. * img_distortion);
    float perspective = 1. + img_distortion * disturbed_uv.y;
    disturbed_uv = vec2(
        perspective * (cosA * disturbed_uv.x - sinA * disturbed_uv.y),
        perspective * (sinA * disturbed_uv.x + cosA * disturbed_uv.y)
    );
    disturbed_uv += center;
    return disturbed_uv;
}

void main() {
    vec2 uv = vUv;
    uv.y = 1. - uv.y;
    uv.x *= u_ratio;

    vec2 pointer = u_pointer_position;
    vec2 pointer_direction = normalize(u_pointer_position - vec2(vUv.x, 1. - vUv.y));
    pointer.x *= u_ratio;
    pointer = pointer - uv;
    float pointer_angle = atan(pointer.y, pointer.x);
    float pointer_distance = length(pointer);
    float pointer_distance_normalized = (1. - clamp(pointer_distance, 0., 1.));

    vec3 color = vec3(0.);
    vec2 img_uv = get_img_uv();

    float sector_constant = 0.;
    float sector_start_angle = 0.;
    float is_sector_edge = 0.;
    float is_grid_edge = 0.;
    float is_central_edge = 0.;

    float angle_noise = .3 * noise(3. * img_uv);

    for (int i = 0; i < 12; i++) {
        float sector_seed = float(i) + u_click_randomizer + 2.;

        float angle_normalised = mod((pointer_angle - sector_start_angle) / TWO_PI, 1.);
        angle_normalised += .1 * angle_noise;

        float angle = angle_normalised * TWO_PI;
        float sector_size = (.01 + 2. * random2(vec2(float(i) + u_click_randomizer, u_pointer_position.x)));
        sector_size = min(sector_size, TWO_PI - sector_start_angle);

        float thickness = u_edge_thickness * (.2 + random(3. * sector_seed));
        thickness += angle_noise * .03 * pow(pointer_distance_normalized, 80.);

        float shape = get_sector_shape(pointer_distance, angle, sector_size, thickness);
        is_sector_edge = max(is_sector_edge, smoothstep(.6, 1., shape));
        sector_constant = mix(sector_constant, random(sector_seed), smoothstep(.2, .8, shape));

        vec2 grid_uv = 2. * (.8 + .5 * pointer_distance_normalized) * img_uv;
        float grid_noise = noise(grid_uv + sector_seed);
        float grid_thickness = (.4 + .4 * random(10. * sector_seed)) * u_edge_thickness;
        float grid_shape = shape * smoothstep(.27, .27 + grid_thickness, grid_noise);
        is_grid_edge += (smoothstep(.1, .5, grid_shape) * smoothstep(.9, .6, grid_shape));

        sector_constant = mix(sector_constant, random(sector_seed + 100.), smoothstep(.2, .8, grid_shape));

        vec2 central_grid_uv = img_uv * (3. + 3. * pow(pointer_distance_normalized, 10.));
        float central_grid_noise = noise(central_grid_uv + sector_seed);
        float central_grid_thickness = (1. + .5 * random(-2. + sector_seed)) * u_edge_thickness;
        float central_grid_shape = step(.7, shape) * smoothstep(.27, .27 + central_grid_thickness, central_grid_noise);
        is_central_edge += (smoothstep(.0, .5, central_grid_shape) * smoothstep(1., .5, central_grid_shape));
        is_central_edge *= (step(.8, pointer_distance_normalized));

        sector_constant = mix(sector_constant, random(sector_seed + 100.), smoothstep(.2, .8, central_grid_shape));

        sector_start_angle += sector_size;
    }

    float img_edge_alpha = get_img_frame_alpha(img_uv, .004);

    is_sector_edge = 1. - is_sector_edge;

    float cracks_edge = max(is_grid_edge, is_sector_edge);
    cracks_edge = max(cracks_edge, is_central_edge);

    float central_cracks = get_simple_cracks(pointer_angle, pointer_distance_normalized, angle_noise);
    cracks_edge += central_cracks;

    if (u_effect_active > 0.) {
        img_uv = get_disturbed_uv(img_uv, sector_constant, cracks_edge, pointer_direction, get_img_frame_alpha(img_uv, .2));
    }

    vec4 img = texture2D(u_image_texture, img_uv);
    color = img.rgb;
    color += .12 * u_effect_active * (sector_constant - .5);

    img_edge_alpha = get_img_frame_alpha(img_uv, .004);
    float opacity = img_edge_alpha;
    opacity -= .3 * u_effect_active * pow(is_grid_edge, 4.);
    opacity -= .3 * u_effect_active * is_central_edge;
    opacity -= .03 * u_effect_active * pow(central_cracks, 4.);

    gl_FragColor = vec4(color, opacity);
}`

const DEFAULT_IMAGE = "https://ksenia-k.com/img/codepen/for-glass-crack-demo-1.jpg"
const MAX_DPR = 2 // rule 10: a quality knob is the component's job, not a dial

interface Props {
    image?: string
    background?: string
    cracked?: boolean
    shatter?: number
    cracks?: number
    zoom?: number
    style?: CSSProperties
}

export default function BrokenGlass(props: Props) {
    const {
        image = "https://images.unsplash.com/photo-1741114056868-e9ab2d56ed64?q=80&w=3456&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        background = "#0b0b10",
        cracked = true,
        shatter = 9,
        cracks = 100,
        zoom = 88,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // live inputs read inside the loop — never effect deps (rule 6)
    const live = useRef({ cracked, shatter, cracks, zoom })
    live.current = { cracked, shatter, cracks, zoom }

    const pointerRef = useRef({ x: 0.55, y: 0.5 })
    const seedRef = useRef(0.332)
    const dirtyRef = useRef(true)
    const imgRatioRef = useRef(1.5)
    const srcRef = useRef(image)
    srcRef.current = image
    const loaderRef = useRef<((src: string) => void) | null>(null)

    // a new Image prop re-uploads the texture; the GL context is built once
    useEffect(() => {
        loaderRef.current?.(image)
    }, [image])

    useEffect(() => {
        dirtyRef.current = true
    }, [cracked, shatter, cracks, zoom])

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const gl = canvas.getContext("webgl", { antialias: true })
        if (!gl) return

        const compile = (src: string, type: number) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error("BrokenGlass shader:", gl.getShaderInfoLog(sh))
                gl.deleteShader(sh)
                return null
            }
            return sh
        }

        const vs = compile(VERT, gl.VERTEX_SHADER)
        const fs = compile(FRAG, gl.FRAGMENT_SHADER)
        if (!vs || !fs) return

        const program = gl.createProgram()!
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("BrokenGlass link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const u = (name: string) => gl.getUniformLocation(program, name)
        const U = {
            texture: u("u_image_texture"),
            edge: u("u_edge_thickness"),
            ratio: u("u_ratio"),
            pointer: u("u_pointer_position"),
            imgRatio: u("u_img_ratio"),
            seed: u("u_click_randomizer"),
            effect: u("u_effect"),
            active: u("u_effect_active"),
            zoom: u("u_zoom"),
        }

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )
        const posLoc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        // 1×1 placeholder so the first frames sample something valid
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([20, 20, 26, 255])
        )
        gl.uniform1i(U.texture, 0)

        let currentSrc = ""
        const loadImage = (src: string) => {
            currentSrc = src
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (currentSrc !== src) return
                imgRatioRef.current = img.naturalWidth / img.naturalHeight
                gl.bindTexture(gl.TEXTURE_2D, texture)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    img
                )
                dirtyRef.current = true
            }
            img.src = src
        }
        loadImage(srcRef.current)

        // measured, not getBoundingClientRect — that carries the canvas zoom
        let cssW = 0
        let cssH = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const w = Math.max(1, host.clientWidth)
            const h = Math.max(1, host.clientHeight)
            if (w === cssW && h === cssH) return
            cssW = w
            cssH = h
            canvas.width = Math.round(w * dpr)
            canvas.height = Math.round(h * dpr)
            gl.viewport(0, 0, canvas.width, canvas.height)
            dirtyRef.current = true
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        const onPointerDown = (e: PointerEvent) => {
            const w = host.clientWidth || 1
            const h = host.clientHeight || 1
            pointerRef.current = {
                x: (e.clientX - host.getBoundingClientRect().left) / w,
                y: (e.clientY - host.getBoundingClientRect().top) / h,
            }
            seedRef.current = Math.random()
            dirtyRef.current = true
        }
        host.addEventListener("pointerdown", onPointerDown)

        let raf = 0
        const frame = () => {
            raf = requestAnimationFrame(frame)
            if (!dirtyRef.current) return
            dirtyRef.current = false

            const l = live.current
            gl.uniform1f(U.seed, seedRef.current)
            gl.uniform1f(U.effect, (l.shatter / 100) * 0.2)
            gl.uniform1f(U.active, l.cracked ? 1 : 0)
            gl.uniform1f(U.edge, (l.cracks / 100) * 0.02)
            gl.uniform1f(U.zoom, (1.4 * 100) / Math.max(1, l.zoom))
            gl.uniform2f(U.pointer, pointerRef.current.x, pointerRef.current.y)
            gl.uniform1f(U.ratio, canvas.width / Math.max(1, canvas.height))
            gl.uniform1f(U.imgRatio, imgRatioRef.current)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        raf = requestAnimationFrame(frame)

        loaderRef.current = loadImage

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerdown", onPointerDown)
            loaderRef.current = null
            // never loseContext() — the same canvas hands back the same
            // context and a force-lost one renders black (rule 6)
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                cursor: "pointer",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
