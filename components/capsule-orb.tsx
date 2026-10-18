"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
// Pinned, and a full URL rather than a bare name. Common builders resolve bare specifiers through a CDN at whatever version is
// current, and this component is written against r170: on r186 the instanced
// draws fail with GL_INVALID_OPERATION and the capsule shell renders as
// nothing at all.
import * as THREE from "https://esm.sh/three@0.170.0"

/**
 * CapsuleOrb
 *
 * A sphere made of 3,000 instanced capsules, pushed around by up to ten orbiting glass
 * marbles. Ported from https://github.com/emmelleppi/threejs-challenge-0 into a
 * single Framer code component. Only `three` is imported: the post-processing
 * (mipmap bloom, vignette, sRGB output), the Kawase refraction blur and the
 * orbit controls are all implemented inline so nothing depends on React Three
 * Fiber or the `postprocessing` package.
 *
 * There is no light in the scene and nothing casts a shadow. The capsules are
 * the colour you pick, modelled by one direction that is fixed to the camera —
 * see VIEW_SHADING_GLSL.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_INSTANCES_COUNT = 3000
const BLOOM_LEVELS = 8
const DEFAULT_MATCAP_URL =
    "https://raw.githubusercontent.com/emmelleppi/threejs-challenge-0/main/public/glass.png"

const ORBIT_CONFIGS = [
    { speed: 1.0, phase: Math.PI / 1.1, plane: "yz", dir: 1 },
    { speed: 0.75, phase: Math.PI / 3.4, plane: "xz", dir: -1 },
    { speed: 0.5, phase: Math.PI / 2.2, plane: "yz", dir: 1 },
    { speed: 1.2, phase: Math.PI / 1.7, plane: "xy", dir: -1 },
    { speed: 0.85, phase: Math.PI / 2.6, plane: "xy", dir: 1 },
    { speed: 0.65, phase: Math.PI / 4.1, plane: "xz", dir: 1 },
    { speed: 1.05, phase: Math.PI / 5.3, plane: "yz", dir: -1 },
    { speed: 0.55, phase: Math.PI / 1.4, plane: "xy", dir: 1 },
    { speed: 0.95, phase: Math.PI / 3.9, plane: "xz", dir: -1 },
    { speed: 0.7, phase: Math.PI / 2.9, plane: "yz", dir: -1 },
] as const

/** The sphere radius the capsules sit on, and the marble radius the geometry is built at. */
const SPHERE_RADIUS = 1.5
const BASE_ORB_SIZE = 0.3

/** What 100% means on the two size controls: the capsule thickness they scale from. */
const BASE_CAPSULE_SCALE = 0.06

/** Speed is a 0-100 dial; this is where it sits at 1x, so it can be halved or doubled. */
const BASE_SPEED = 50

const DEFAULT_BACKGROUND = "#000000"
const DEFAULT_CAPSULE_COLOR = "#D9DDE0"

/** Defaults for the grouped control, also used when one of its fields arrives missing. */
const DEFAULT_GLASS = { refraction: 1.45, thickness: 0.6 }

// ─────────────────────────────────────────────────────────────────────────────
// Scene shaders
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_SHADING_GLSL = /* glsl */ `
    // Nothing in this scene emits light, so nothing is aimed and nothing casts a
    // shadow. The capsules and the marbles are modelled by one direction held in
    // *view* space and turned back into world space here, which means it travels
    // with the camera: drag the orb or let it auto-rotate and the bright side
    // stays where the viewer sees it, the way a colour swatch does. A direction
    // fixed in world space would instead sweep across the orb as the viewpoint
    // moved, which reads as the lamp turning rather than the object.
    vec3 shadingDirection() {
        return normalize((vec4(0.32, 0.60, 0.73, 0.0) * viewMatrix).xyz);
    }
`

const HERO_VERTEX = /* glsl */ `
    attribute vec3 a_instancePos;
    attribute vec4 a_instanceQuaternions;

    varying vec3 v_worldPosition;
    varying vec2 v_uv;
    varying vec3 v_instancePos;
    varying vec3 v_viewPosition;
    varying vec3 v_viewNormal;
    varying vec3 v_modelPosition;
    varying vec3 v_worldNormal;

    uniform float u_scale;
    uniform float u_attenuation;
    uniform float u_bulge;
    uniform vec3 u_spherePositions[${ORBIT_CONFIGS.length}];

    vec3 rotateByQuaternion(vec3 v, vec4 q) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }

    vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
        return normalize((vec4(dir, 0.0) * matrix).xyz);
    }

    void main() {
        vec3 pos = position;
        vec3 norm = normal;

        float attenuationStrength = u_attenuation;

        float displacement = 1.0;
        for (int i = 0; i < ${ORBIT_CONFIGS.length}; i++) {
            float distanceToSphere = length(a_instancePos - u_spherePositions[i]);
            displacement = min(displacement, 1.0 - clamp(1.0 / (attenuationStrength * distanceToSphere * distanceToSphere), 0.0, 1.0));
        }

        float tip = 1.0 - step(-2.5, pos.y);
        if (tip > 0.5) {
            pos.y = -2.5;
            norm = vec3(0, -1, 0);
        }

        pos = rotateByQuaternion(pos, a_instanceQuaternions);
        pos *= u_scale;
        pos += a_instancePos;
        pos += normalize(a_instancePos) * u_bulge * pow(displacement, 0.7);

        norm = rotateByQuaternion(norm, a_instanceQuaternions);

        vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * viewPosition;

        v_uv = uv;
        v_viewNormal = normalize(normalMatrix * norm);
        v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
        v_modelPosition = position;
        v_viewPosition = -viewPosition.xyz;
        v_instancePos = a_instancePos;
        v_worldNormal = inverseTransformDirection(v_viewNormal, viewMatrix);
    }
`

const HERO_FRAGMENT = /* glsl */ `
    varying vec3 v_worldPosition;
    varying vec3 v_instancePos;
    varying vec3 v_viewNormal;
    varying vec3 v_modelPosition;
    varying vec3 v_worldNormal;

    uniform vec3 u_color;

    ${VIEW_SHADING_GLSL}

    float linearStep(float edge0, float edge1, float x) {
        return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    }

    void main() {
        vec3 L = shadingDirection();
        vec3 N = normalize(normalize(v_instancePos) + 0.2 * normalize(v_worldNormal));
        float NdL = max(0., dot(N, L));

        float ao = linearStep(-0.5, -3.0, v_modelPosition.y);

        // The shade never reaches black — the far side of a capsule keeps enough
        // of the picked colour to still read as that colour rather than as an
        // unlit silhouette — and never exceeds it either, so a pale base colour
        // stays inside the bloom threshold instead of clipping to white.
        vec3 color = u_color;
        color *= 0.22 + 0.78 * smoothstep(-0.05, 1.0, NdL);
        color = pow(color, vec3(0.8));
        color *= ao * ao;

        gl_FragColor = vec4(color, 1.0);
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / 2.2));
    }
`

// The glass marbles.
const SURFACE_VERTEX = /* glsl */ `
    varying vec3 v_viewNormal;
    varying vec2 v_uv;
    varying vec3 v_worldPosition;
    varying vec3 v_viewPosition;

    vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
        return normalize((vec4(dir, 0.0) * matrix).xyz);
    }

    void main () {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;

        v_viewNormal = normalMatrix * normal;
        v_uv = uv;
        v_worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        v_viewPosition = -viewPosition.xyz;
    }
`

const SPHERE_FRAGMENT = /* glsl */ `
    varying vec3 v_viewNormal;
    varying vec3 v_viewPosition;
    varying vec3 v_worldPosition;

    uniform sampler2D u_sceneTexture;
    uniform mat4 projectionMatrix;
    uniform sampler2D u_matcap;
    uniform float u_thickness;
    uniform float u_ior;
    uniform vec3 u_glassTint;

    ${VIEW_SHADING_GLSL}

    vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
        return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
    }

    void main() {
        vec3 viewNormal = normalize(v_viewNormal);

        vec3 N = inverseTransformDirection(viewNormal, viewMatrix);
        vec3 V = normalize(cameraPosition - v_worldPosition);
        vec3 L = shadingDirection();

        vec3 H = normalize(V + L);
        float spec = max(0.0, dot(H, N));
        float NdV = max(0., dot(N, V));
        float fresnel = pow(1.0 - NdV, 5.0);

        float thickness = u_thickness;
        float ior = u_ior;
        float refractionRatio = 1.0 / ior;
        vec3 refractionVector = refract( -V, N, refractionRatio );

        vec3 transmissionRay = normalize( refractionVector ) * thickness;
        vec3 refractedRayExit = v_worldPosition + transmissionRay;

        vec4 ndcPos = projectionMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
        vec2 refractionCoords = ndcPos.xy / ndcPos.w;
        refractionCoords += 1.0;
        refractionCoords /= 2.0;

        vec3 sceneBlurred = pow(texture2D(u_sceneTexture, refractionCoords).rgb, vec3(2.2));

        vec3 viewDir = normalize( v_viewPosition );
        vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
        vec3 y = cross( viewDir, x );
        vec2 uv = vec2( dot( x, v_viewNormal ), dot( y, v_viewNormal ) ) * 0.495 + 0.5;
        vec4 matcapColor = texture2D( u_matcap, uv );

        vec3 color = sceneBlurred;
        color += 0.2 * pow(spec, 500.0);
        color += 0.03 * pow(matcapColor.rgb, vec3(2.2));
        color += 0.005 * fresnel;

        gl_FragColor = vec4(0.8 * color * u_glassTint, 1.);
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / 2.2));
    }
`

const BACKGROUND_VERTEX = /* glsl */ `
    varying vec2 v_uv;
    void main() {
        v_uv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const BACKGROUND_FRAGMENT = /* glsl */ `
    varying vec2 v_uv;
    uniform vec3 u_color0;
    uniform vec3 u_color1;
    uniform float u_angle;
    void main() {
        // At 0deg this reduces to mix(..., v_uv.x) — the original horizontal ramp.
        float a = radians(u_angle);
        float t = clamp(dot(v_uv - 0.5, vec2(cos(a), sin(a))) + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(u_color0, u_color1, t), 1.0);
    }
`

// ─────────────────────────────────────────────────────────────────────────────
// Post-processing shaders (ports of the `postprocessing` passes the original used)
// ─────────────────────────────────────────────────────────────────────────────

const FULLSCREEN_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 1.0, 1.0);
    }
`

// KawaseBlurMaterial with kernel 0: four taps half a texel away on the diagonals.
const KAWASE_VERTEX = /* glsl */ `
    uniform vec4 texelSize;
    uniform float kernel;
    varying vec2 vUv0;
    varying vec2 vUv1;
    varying vec2 vUv2;
    varying vec2 vUv3;
    void main() {
        vec2 uv = position.xy * 0.5 + 0.5;
        vec2 dUv = texelSize.xy * vec2(kernel) + texelSize.zw;
        vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
        vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
        vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
        vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);
        gl_Position = vec4(position.xy, 1.0, 1.0);
    }
`

const KAWASE_FRAGMENT = /* glsl */ `
    uniform sampler2D inputBuffer;
    varying vec2 vUv0;
    varying vec2 vUv1;
    varying vec2 vUv2;
    varying vec2 vUv3;
    void main() {
        vec4 sum = texture2D(inputBuffer, vUv0);
        sum += texture2D(inputBuffer, vUv1);
        sum += texture2D(inputBuffer, vUv2);
        sum += texture2D(inputBuffer, vUv3);
        gl_FragColor = sum * 0.25;
    }
`

const LUMINANCE_FRAGMENT = /* glsl */ `
    #include <common>
    uniform sampler2D inputBuffer;
    uniform float threshold;
    uniform float smoothing;
    varying vec2 vUv;
    void main() {
        vec4 texel = texture2D(inputBuffer, vUv);
        float l = luminance(texel.rgb);
        l = smoothstep(threshold, threshold + smoothing, l) * l;
        gl_FragColor = vec4(texel.rgb * clamp(l, 0.0, 1.0), l);
    }
`

// 13-tap downsample (Call of Duty: Advanced Warfare style), as in MipmapBlurPass.
const DOWNSAMPLE_VERTEX = /* glsl */ `
    uniform vec2 texelSize;
    varying vec2 vUv;
    varying vec2 vUv00; varying vec2 vUv01; varying vec2 vUv02; varying vec2 vUv03;
    varying vec2 vUv04; varying vec2 vUv05; varying vec2 vUv06; varying vec2 vUv07;
    varying vec2 vUv08; varying vec2 vUv09; varying vec2 vUv10; varying vec2 vUv11;
    void main() {
        vUv = position.xy * 0.5 + 0.5;
        vUv00 = vUv + texelSize * vec2(-1.0, 1.0);
        vUv01 = vUv + texelSize * vec2(1.0, 1.0);
        vUv02 = vUv + texelSize * vec2(-1.0, -1.0);
        vUv03 = vUv + texelSize * vec2(1.0, -1.0);
        vUv04 = vUv + texelSize * vec2(-2.0, 2.0);
        vUv05 = vUv + texelSize * vec2(0.0, 2.0);
        vUv06 = vUv + texelSize * vec2(2.0, 2.0);
        vUv07 = vUv + texelSize * vec2(-2.0, 0.0);
        vUv08 = vUv + texelSize * vec2(2.0, 0.0);
        vUv09 = vUv + texelSize * vec2(-2.0, -2.0);
        vUv10 = vUv + texelSize * vec2(0.0, -2.0);
        vUv11 = vUv + texelSize * vec2(2.0, -2.0);
        gl_Position = vec4(position.xy, 1.0, 1.0);
    }
`

const DOWNSAMPLE_FRAGMENT = /* glsl */ `
    #define WEIGHT_INNER 0.125
    #define WEIGHT_OUTER 0.0555555
    uniform sampler2D inputBuffer;
    varying vec2 vUv;
    varying vec2 vUv00; varying vec2 vUv01; varying vec2 vUv02; varying vec2 vUv03;
    varying vec2 vUv04; varying vec2 vUv05; varying vec2 vUv06; varying vec2 vUv07;
    varying vec2 vUv08; varying vec2 vUv09; varying vec2 vUv10; varying vec2 vUv11;
    float clampToBorder(const in vec2 uv) {
        return float(uv.s >= 0.0 && uv.s <= 1.0 && uv.t >= 0.0 && uv.t <= 1.0);
    }
    void main() {
        vec4 c = vec4(0.0);
        vec4 w = WEIGHT_INNER * vec4(clampToBorder(vUv00), clampToBorder(vUv01), clampToBorder(vUv02), clampToBorder(vUv03));
        c += w.x * texture2D(inputBuffer, vUv00);
        c += w.y * texture2D(inputBuffer, vUv01);
        c += w.z * texture2D(inputBuffer, vUv02);
        c += w.w * texture2D(inputBuffer, vUv03);
        w = WEIGHT_OUTER * vec4(clampToBorder(vUv04), clampToBorder(vUv05), clampToBorder(vUv06), clampToBorder(vUv07));
        c += w.x * texture2D(inputBuffer, vUv04);
        c += w.y * texture2D(inputBuffer, vUv05);
        c += w.z * texture2D(inputBuffer, vUv06);
        c += w.w * texture2D(inputBuffer, vUv07);
        w = WEIGHT_OUTER * vec4(clampToBorder(vUv08), clampToBorder(vUv09), clampToBorder(vUv10), clampToBorder(vUv11));
        c += w.x * texture2D(inputBuffer, vUv08);
        c += w.y * texture2D(inputBuffer, vUv09);
        c += w.z * texture2D(inputBuffer, vUv10);
        c += w.w * texture2D(inputBuffer, vUv11);
        c += WEIGHT_OUTER * texture2D(inputBuffer, vUv);
        gl_FragColor = c;
    }
`

// 9-tap tent upsample blended with the matching downsample level.
const UPSAMPLE_VERTEX = /* glsl */ `
    uniform vec2 texelSize;
    varying vec2 vUv;
    varying vec2 vUv0; varying vec2 vUv1; varying vec2 vUv2; varying vec2 vUv3;
    varying vec2 vUv4; varying vec2 vUv5; varying vec2 vUv6; varying vec2 vUv7;
    void main() {
        vUv = position.xy * 0.5 + 0.5;
        vUv0 = vUv + texelSize * vec2(-1.0, 1.0);
        vUv1 = vUv + texelSize * vec2(0.0, 1.0);
        vUv2 = vUv + texelSize * vec2(1.0, 1.0);
        vUv3 = vUv + texelSize * vec2(-1.0, 0.0);
        vUv4 = vUv + texelSize * vec2(1.0, 0.0);
        vUv5 = vUv + texelSize * vec2(-1.0, -1.0);
        vUv6 = vUv + texelSize * vec2(0.0, -1.0);
        vUv7 = vUv + texelSize * vec2(1.0, -1.0);
        gl_Position = vec4(position.xy, 1.0, 1.0);
    }
`

const UPSAMPLE_FRAGMENT = /* glsl */ `
    uniform sampler2D inputBuffer;
    uniform sampler2D supportBuffer;
    uniform float radius;
    varying vec2 vUv;
    varying vec2 vUv0; varying vec2 vUv1; varying vec2 vUv2; varying vec2 vUv3;
    varying vec2 vUv4; varying vec2 vUv5; varying vec2 vUv6; varying vec2 vUv7;
    void main() {
        vec4 c = vec4(0.0);
        c += texture2D(inputBuffer, vUv0) * 0.0625;
        c += texture2D(inputBuffer, vUv1) * 0.125;
        c += texture2D(inputBuffer, vUv2) * 0.0625;
        c += texture2D(inputBuffer, vUv3) * 0.125;
        c += texture2D(inputBuffer, vUv) * 0.25;
        c += texture2D(inputBuffer, vUv4) * 0.125;
        c += texture2D(inputBuffer, vUv5) * 0.0625;
        c += texture2D(inputBuffer, vUv6) * 0.125;
        c += texture2D(inputBuffer, vUv7) * 0.0625;
        vec4 baseColor = texture2D(supportBuffer, vUv);
        gl_FragColor = mix(baseColor, c, radius);
    }
`

// Bloom (screen blend) + vignette (Eskil technique) + linear→sRGB output.
const COMPOSITE_FRAGMENT = /* glsl */ `
    uniform sampler2D inputBuffer;
    uniform sampler2D bloomBuffer;
    uniform float intensity;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
        vec3 base = texture2D(inputBuffer, vUv).rgb;
        vec3 bloom = texture2D(bloomBuffer, vUv).rgb * intensity;
        vec3 color = min(base + bloom - min(base * bloom, vec3(1.0)), vec3(1.0));
        float d = distance(vUv, vec2(0.5));
        color *= smoothstep(0.8, offset * 0.799, d * (darkness + offset));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
    }
`

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Framer colour values can be hex, rgb(a), or `var(--token, fallback)`. */
function toColor(value: string | undefined, fallback: string): THREE.Color {
    const color = new THREE.Color()
    let css = (value || fallback).trim()
    const tokenMatch = css.match(/^var\(\s*--[^,]+,\s*(.+)\)$/)
    if (tokenMatch) css = tokenMatch[1].trim()
    try {
        color.setStyle(css)
    } catch (e) {
        color.setStyle(fallback)
    }
    return color
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/**
 * The far stop of the background ramp. The panel exposes one background colour;
 * the gradient keeps its depth by darkening that colour rather than asking for a
 * second one. The multiply lands in linear space, which is why the factor reads
 * lower than the sRGB pair it replaces (#AEB2B5 -> #939A9D).
 */
function shadeColor(value: string | undefined, shade: number): THREE.Color {
    return toColor(value, DEFAULT_BACKGROUND).multiplyScalar(clamp(num(shade, 0.7), 0, 1))
}

/**
 * A number, or the fallback when the prop arrived as something else.
 *
 * Outside Framer a control can hand over a value of the wrong type — an empty
 * string is the usual one — and `clamp` would coerce that to 0 rather than
 * reject it. Harmless for most props; for the pixel ratio it means a 0×0
 * drawing buffer and a black canvas, which is a very confusing way to find out.
 */
function num(value: unknown, fallback: number): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback
    // `Number("")` and `Number(null)` are both 0 — finite, and so silently
    // accepted by the check below. Those are exactly the values a host hands over
    // when it has nothing, so they have to be rejected before the coercion.
    if (value == null) return fallback
    if (typeof value === "string" && value.trim() === "") return fallback
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function makeFallbackMatcap(): THREE.Texture {
    const size = 256
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size
    const ctx = canvas.getContext("2d")
    if (ctx) {
        const gradient = ctx.createRadialGradient(size * 0.38, size * 0.35, size * 0.05, size * 0.5, size * 0.5, size * 0.5)
        gradient.addColorStop(0, "#ffffff")
        gradient.addColorStop(0.35, "#b9c0c6")
        gradient.addColorStop(0.85, "#4b5257")
        gradient.addColorStop(1, "#1a1d20")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, size, size)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
}

function loadTexture(
    url: string,
    onLoad: (texture: THREE.Texture) => void,
    fallback: () => THREE.Texture
): { cancel: () => void } {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("anonymous")
    loader.load(
        url,
        (texture) => {
            if (cancelled) {
                texture.dispose()
                return
            }
            onLoad(texture)
        },
        undefined,
        () => {
            if (!cancelled) onLoad(fallback())
        }
    )
    return { cancel: () => (cancelled = true) }
}

/** `count` capsules distributed on a sphere with a golden-angle spiral, pointing inwards. */
function buildCapsuleGeometry(count: number): THREE.InstancedBufferGeometry {
    const refGeometry = new THREE.CapsuleGeometry(1, 4, 4, 16)
    const geometry = new THREE.InstancedBufferGeometry()
    for (const name in refGeometry.attributes) {
        geometry.setAttribute(name, refGeometry.attributes[name])
    }
    geometry.setIndex(refGeometry.index)

    const positions = new Float32Array(count * 3)
    const quaternions = new Float32Array(count * 4)

    const sphereRadius = SPHERE_RADIUS
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const up = new THREE.Vector3(0, 1, 0)
    const tempPos = new THREE.Vector3()
    const tempQuat = new THREE.Quaternion()

    for (let i = 0, i3 = 0, i4 = 0; i < count; i++, i3 += 3, i4 += 4) {
        const y = 1 - (i / (count - 1)) * 2
        const radius = Math.sqrt(1 - y * y)
        const theta = goldenAngle * i

        const x = Math.cos(theta) * radius * sphereRadius
        const z = Math.sin(theta) * radius * sphereRadius
        const posY = y * sphereRadius

        positions[i3] = x
        positions[i3 + 1] = posY
        positions[i3 + 2] = z

        tempPos.set(-x, -posY, -z).normalize()
        tempQuat.setFromUnitVectors(up, tempPos)

        quaternions[i4] = tempQuat.x
        quaternions[i4 + 1] = tempQuat.y
        quaternions[i4 + 2] = tempQuat.z
        quaternions[i4 + 3] = tempQuat.w
    }

    geometry.setAttribute("a_instancePos", new THREE.InstancedBufferAttribute(positions, 3))
    geometry.setAttribute("a_instanceQuaternions", new THREE.InstancedBufferAttribute(quaternions, 4))
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3)
    return geometry
}

function orbitPosition(
    t: number,
    config: (typeof ORBIT_CONFIGS)[number],
    radius: number,
    out: THREE.Vector3
): THREE.Vector3 {
    const angle = config.dir * config.speed * t + config.phase
    const c = Math.cos(angle) * radius
    const s = Math.sin(angle) * radius
    if (config.plane === "xy") return out.set(c, s, 0)
    if (config.plane === "xz") return out.set(c, 0, s)
    return out.set(0, c, s)
}

/**
 * The dent a marble carves scales with both the marble and the Dent Size multiplier.
 * Its radius goes as 1/sqrt(attenuation), so the combined factor is squared.
 */
function dentAttenuation(dentSize: number, orbSize: number): number {
    const scale = Math.max(0.05, dentSize * (orbSize / BASE_ORB_SIZE))
    return 4 / (scale * scale)
}

function makeRenderTarget(options?: THREE.RenderTargetOptions): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, ...options })
    target.texture.minFilter = THREE.LinearFilter
    target.texture.magFilter = THREE.LinearFilter
    target.texture.generateMipmaps = false
    return target
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal orbit controls (rotate by dragging, zoom with wheel / pinch)
// ─────────────────────────────────────────────────────────────────────────────

class OrbitController {
    enabled = true
    zoomEnabled = true
    autoRotate = 0
    private theta = 0
    private phi = Math.PI / 2
    private radius = 5
    private targetTheta = 0
    private targetPhi = Math.PI / 2
    private targetRadius = 5
    private pointers = new Map<number, { x: number; y: number }>()
    private pinchDistance = 0
    private disposers: Array<() => void> = []

    constructor(private camera: THREE.PerspectiveCamera, private element: HTMLElement) {
        const spherical = new THREE.Spherical().setFromVector3(camera.position)
        this.radius = this.targetRadius = spherical.radius
        this.phi = this.targetPhi = spherical.phi
        this.theta = this.targetTheta = spherical.theta

        const on = <K extends keyof HTMLElementEventMap>(
            type: K,
            handler: (event: HTMLElementEventMap[K]) => void,
            options?: AddEventListenerOptions
        ) => {
            element.addEventListener(type, handler, options)
            this.disposers.push(() => element.removeEventListener(type, handler, options))
        }

        on("pointerdown", this.onPointerDown)
        on("pointermove", this.onPointerMove)
        on("pointerup", this.onPointerUp)
        on("pointercancel", this.onPointerUp)
        on("wheel", this.onWheel, { passive: false })
    }

    private onPointerDown = (event: PointerEvent) => {
        if (!this.enabled) return
        if (event.pointerType === "mouse" && event.button !== 0) return
        this.element.setPointerCapture(event.pointerId)
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (this.pointers.size === 2) this.pinchDistance = this.currentPinchDistance()
    }

    private onPointerMove = (event: PointerEvent) => {
        const previous = this.pointers.get(event.pointerId)
        if (!previous || !this.enabled) return
        const current = { x: event.clientX, y: event.clientY }
        this.pointers.set(event.pointerId, current)

        if (this.pointers.size === 1) {
            const height = this.element.clientHeight || 1
            this.targetTheta -= (2 * Math.PI * (current.x - previous.x)) / height
            this.targetPhi -= (2 * Math.PI * (current.y - previous.y)) / height
            this.targetPhi = clamp(this.targetPhi, 0.05, Math.PI - 0.05)
        } else if (this.pointers.size === 2 && this.zoomEnabled) {
            const distance = this.currentPinchDistance()
            if (this.pinchDistance > 0) {
                this.targetRadius = clamp(this.targetRadius * (this.pinchDistance / distance), 2.5, 14)
            }
            this.pinchDistance = distance
        }
    }

    private onPointerUp = (event: PointerEvent) => {
        this.pointers.delete(event.pointerId)
        if (this.element.hasPointerCapture(event.pointerId)) {
            this.element.releasePointerCapture(event.pointerId)
        }
    }

    private onWheel = (event: WheelEvent) => {
        if (!this.enabled || !this.zoomEnabled) return
        event.preventDefault()
        const scale = Math.pow(0.95, Math.abs(event.deltaY) * 0.01)
        this.targetRadius = clamp(event.deltaY < 0 ? this.targetRadius * scale : this.targetRadius / scale, 2.5, 14)
    }

    private currentPinchDistance(): number {
        const [a, b] = Array.from(this.pointers.values())
        return Math.hypot(a.x - b.x, a.y - b.y)
    }

    /** Where the camera currently sits around Y, in radians. */
    get azimuth(): number {
        return this.theta
    }

    /** Distance from the origin. Ignored while the pointer is down. */
    setDistance(radius: number) {
        if (this.pointers.size > 0) return
        this.targetRadius = clamp(radius, 2.5, 14)
    }

    /** Jump straight to the target orientation — used for non-animated renders. */
    snap() {
        this.theta = this.targetTheta
        this.phi = this.targetPhi
        this.radius = this.targetRadius
        this.camera.position.setFromSphericalCoords(this.radius, this.phi, this.theta)
        this.camera.lookAt(0, 0, 0)
    }

    /** Returns true when the camera moved this frame. */
    update(delta: number): boolean {
        if (this.autoRotate !== 0 && this.pointers.size === 0) {
            this.targetTheta += this.autoRotate * delta
        }
        const damping = 0.18
        const dTheta = this.targetTheta - this.theta
        const dPhi = this.targetPhi - this.phi
        const dRadius = this.targetRadius - this.radius
        if (Math.abs(dTheta) < 1e-5 && Math.abs(dPhi) < 1e-5 && Math.abs(dRadius) < 1e-5) return false
        this.theta += dTheta * damping
        this.phi += dPhi * damping
        this.radius += dRadius * damping
        this.camera.position.setFromSphericalCoords(this.radius, this.phi, this.theta)
        this.camera.lookAt(0, 0, 0)
        return true
    }

    dispose() {
        this.disposers.forEach((fn) => fn())
        this.disposers = []
        this.pointers.clear()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// The WebGL experience
// ─────────────────────────────────────────────────────────────────────────────

interface SceneParams {
    // Structure
    capsuleCount: number
    capsuleScale: number
    bulge: number
    dentSize: number
    orbCount: number
    orbSize: number
    orbDistance: number
    distance: number
    // Animation
    speed: number
    autoRotate: boolean
    autoRotateSpeed: number
    // Interaction
    interactive: boolean
    allowZoom: boolean
    // Colors
    background: string
    backgroundShade: number
    gradientAngle: number
    capsuleColor: string
    coreColor: string
    glassTint: string
    // Glass
    refraction: number
    glassThickness: number
    // Effects
    bloomIntensity: number
    bloomThreshold: number
    bloomSpread: number
    vignette: number
    vignetteSpread: number
    // Performance
    maxPixelRatio: number
}

interface Experience {
    setParams: (params: SceneParams) => void
    resize: () => void
    start: () => void
    stop: () => void
    renderOnce: () => void
    dispose: () => void
}

function createExperience(
    container: HTMLDivElement,
    initialParams: SceneParams,
    matcapUrl: string,
    animate: boolean
): Experience | null {
    let renderer: THREE.WebGLRenderer
    try {
        renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: false,
            stencil: false,
            alpha: false,
        })
    } catch (error) {
        console.warn("CapsuleOrb: WebGL is not available.", error)
        return null
    }

    let params = initialParams
    const canvas = renderer.domElement
    canvas.style.position = "absolute"
    canvas.style.inset = "0"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    container.appendChild(canvas)

    renderer.toneMapping = THREE.NoToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 1)

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 30)
    camera.position.set(0, 0, params.distance)
    camera.lookAt(0, 0, 0)

    const matcapTexture: { current: THREE.Texture | null } = { current: null }

    const heroUniforms: Record<string, THREE.IUniform> = {
        u_scale: { value: params.capsuleScale },
        u_bulge: { value: params.bulge },
        u_attenuation: { value: dentAttenuation(params.dentSize, params.orbSize) },
        u_color: { value: toColor(params.capsuleColor, DEFAULT_CAPSULE_COLOR) },
        u_spherePositions: {
            value: Array.from({ length: ORBIT_CONFIGS.length }, () => new THREE.Vector3(1000, 1000, 1000)),
        },
    }

    const sphereUniforms: Record<string, THREE.IUniform> = {
        u_sceneTexture: { value: null },
        u_matcap: { value: null },
        u_thickness: { value: params.glassThickness },
        u_ior: { value: params.refraction },
        u_glassTint: { value: toColor(params.glassTint, "#FFFFFF") },
    }

    const backgroundUniforms = {
        u_color0: { value: toColor(params.background, DEFAULT_BACKGROUND) },
        u_color1: { value: shadeColor(params.background, params.backgroundShade) },
        u_angle: { value: params.gradientAngle },
    }

    // Background gradient (clip-space quad, drawn first, no depth).
    const backgroundMaterial = new THREE.ShaderMaterial({
        vertexShader: BACKGROUND_VERTEX,
        fragmentShader: BACKGROUND_FRAGMENT,
        uniforms: backgroundUniforms,
        depthWrite: false,
        depthTest: false,
    })
    const background = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backgroundMaterial)
    background.renderOrder = -2
    background.frustumCulled = false
    scene.add(background)

    // Dark core sphere.
    const coreMaterial = new THREE.MeshBasicMaterial({ color: toColor(params.coreColor, "#111111") })
    const core = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32), coreMaterial)
    core.renderOrder = -1
    scene.add(core)

    // Instanced capsules.
    let capsuleGeometry = buildCapsuleGeometry(params.capsuleCount)
    const heroMaterial = new THREE.ShaderMaterial({
        vertexShader: HERO_VERTEX,
        fragmentShader: HERO_FRAGMENT,
        uniforms: heroUniforms,
    })
    const hero = new THREE.Mesh(capsuleGeometry, heroMaterial)
    hero.frustumCulled = false
    scene.add(hero)

    // Glass spheres (layer 1: rendered after the scene has been captured for refraction).
    const sphereGeometry = new THREE.SphereGeometry(BASE_ORB_SIZE, 32, 32)
    const sphereMaterial = new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERTEX,
        fragmentShader: SPHERE_FRAGMENT,
        uniforms: sphereUniforms,
    })
    const spheres = ORBIT_CONFIGS.map(() => {
        const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
        mesh.scale.setScalar(params.orbSize / BASE_ORB_SIZE)
        mesh.renderOrder = 1
        mesh.layers.set(1)
        scene.add(mesh)
        return mesh
    })

    // ── Post-processing ──────────────────────────────────────────────────────
    const fullscreenScene = new THREE.Scene()
    const fullscreenCamera = new THREE.Camera()
    const fullscreenGeometry = new THREE.BufferGeometry()
    fullscreenGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    )
    const fullscreenMesh = new THREE.Mesh(fullscreenGeometry)
    fullscreenMesh.frustumCulled = false
    fullscreenScene.add(fullscreenMesh)

    const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthBuffer: true })
    sceneTarget.texture.minFilter = THREE.LinearFilter
    sceneTarget.texture.magFilter = THREE.LinearFilter
    sceneTarget.texture.generateMipmaps = false

    const kawaseTarget = makeRenderTarget()
    const blurTarget = makeRenderTarget()
    const luminanceTarget = makeRenderTarget()
    const downTargets = Array.from({ length: BLOOM_LEVELS }, () => makeRenderTarget())
    const upTargets = Array.from({ length: BLOOM_LEVELS - 1 }, () => makeRenderTarget())

    const kawaseMaterial = new THREE.ShaderMaterial({
        vertexShader: KAWASE_VERTEX,
        fragmentShader: KAWASE_FRAGMENT,
        uniforms: {
            inputBuffer: { value: null },
            texelSize: { value: new THREE.Vector4() },
            kernel: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
    })
    const luminanceMaterial = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERTEX,
        fragmentShader: LUMINANCE_FRAGMENT,
        uniforms: {
            inputBuffer: { value: null },
            threshold: { value: params.bloomThreshold },
            smoothing: { value: 0.01 },
        },
        depthTest: false,
        depthWrite: false,
    })
    const downsampleMaterial = new THREE.ShaderMaterial({
        vertexShader: DOWNSAMPLE_VERTEX,
        fragmentShader: DOWNSAMPLE_FRAGMENT,
        uniforms: { inputBuffer: { value: null }, texelSize: { value: new THREE.Vector2() } },
        depthTest: false,
        depthWrite: false,
    })
    const upsampleMaterial = new THREE.ShaderMaterial({
        vertexShader: UPSAMPLE_VERTEX,
        fragmentShader: UPSAMPLE_FRAGMENT,
        uniforms: {
            inputBuffer: { value: null },
            supportBuffer: { value: null },
            texelSize: { value: new THREE.Vector2() },
            radius: { value: params.bloomSpread },
        },
        depthTest: false,
        depthWrite: false,
    })
    const compositeMaterial = new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERTEX,
        fragmentShader: COMPOSITE_FRAGMENT,
        uniforms: {
            inputBuffer: { value: null },
            bloomBuffer: { value: null },
            intensity: { value: params.bloomIntensity },
            offset: { value: params.vignetteSpread },
            darkness: { value: params.vignette },
        },
        depthTest: false,
        depthWrite: false,
    })

    function fullscreenPass(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
        fullscreenMesh.material = material
        renderer.setRenderTarget(target)
        renderer.render(fullscreenScene, fullscreenCamera)
    }

    // ── Sizing ───────────────────────────────────────────────────────────────
    const drawingSize = new THREE.Vector2()

    function resize() {
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        const dpr = clamp(window.devicePixelRatio || 1, 1, num(params.maxPixelRatio, 1.5))
        renderer.setPixelRatio(dpr)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()

        renderer.getDrawingBufferSize(drawingSize)
        const fullW = Math.max(1, Math.floor(drawingSize.x))
        const fullH = Math.max(1, Math.floor(drawingSize.y))
        const halfW = Math.max(1, Math.round(fullW / 2))
        const halfH = Math.max(1, Math.round(fullH / 2))

        sceneTarget.setSize(fullW, fullH)
        kawaseTarget.setSize(halfW, halfH)
        blurTarget.setSize(halfW, halfH)
        kawaseMaterial.uniforms.texelSize.value.set(1 / fullW, 1 / fullH, 0.5 / fullW, 0.5 / fullH)
        luminanceTarget.setSize(halfW, halfH)

        let w = halfW
        let h = halfH
        for (let i = 0; i < BLOOM_LEVELS; i++) {
            w = Math.max(1, Math.round(w / 2))
            h = Math.max(1, Math.round(h / 2))
            downTargets[i].setSize(w, h)
            if (i < upTargets.length) upTargets[i].setSize(w, h)
        }
    }

    // ── Textures ─────────────────────────────────────────────────────────────
    const matcapLoad = loadTexture(
        matcapUrl,
        (texture) => {
            matcapTexture.current = texture
            sphereUniforms.u_matcap.value = texture
            if (!animate) renderOnce()
        },
        makeFallbackMatcap
    )

    // ── Controls ─────────────────────────────────────────────────────────────
    const controls = new OrbitController(camera, container)
    controls.enabled = params.interactive
    controls.zoomEnabled = params.allowZoom
    controls.autoRotate = params.autoRotate ? params.autoRotateSpeed : 0

    // ── Frame ────────────────────────────────────────────────────────────────
    let time = 0
    const tempVector = new THREE.Vector3()
    const spherePositions: THREE.Vector3[] = heroUniforms.u_spherePositions.value

    function renderFrame(delta: number) {
        time += delta * params.speed
        controls.update(delta)

        for (let i = 0; i < spheres.length; i++) {
            if (i >= params.orbCount) {
                // Parked far away: `displacement` is a min() over the marbles, so a
                // distant marble contributes 1.0 and leaves the sphere undented.
                spheres[i].visible = false
                spherePositions[i].set(1000, 1000, 1000)
                continue
            }
            spheres[i].visible = true
            orbitPosition(time, ORBIT_CONFIGS[i], params.orbDistance, tempVector)
            spheres[i].position.copy(tempVector)
            spherePositions[i].copy(tempVector)
        }

        // 1. Opaque scene (background, core, capsules) into the multisampled buffer.
        renderer.autoClear = true
        camera.layers.set(0)
        renderer.setRenderTarget(sceneTarget)
        renderer.render(scene, camera)

        // 2. Blur a half-resolution copy for the glass refraction.
        kawaseMaterial.uniforms.inputBuffer.value = sceneTarget.texture
        fullscreenPass(kawaseMaterial, kawaseTarget)
        kawaseMaterial.uniforms.inputBuffer.value = kawaseTarget.texture
        fullscreenPass(kawaseMaterial, blurTarget)
        sphereUniforms.u_sceneTexture.value = blurTarget.texture

        // 3. Glass marbles on top, keeping the depth buffer.
        renderer.autoClear = false
        camera.layers.set(1)
        renderer.setRenderTarget(sceneTarget)
        renderer.render(scene, camera)
        renderer.autoClear = true

        // 4. Bloom: threshold, 8-level downsample, tent upsample.
        luminanceMaterial.uniforms.inputBuffer.value = sceneTarget.texture
        fullscreenPass(luminanceMaterial, luminanceTarget)

        let previous: THREE.WebGLRenderTarget = luminanceTarget
        for (let i = 0; i < BLOOM_LEVELS; i++) {
            downsampleMaterial.uniforms.texelSize.value.set(1 / previous.width, 1 / previous.height)
            downsampleMaterial.uniforms.inputBuffer.value = previous.texture
            fullscreenPass(downsampleMaterial, downTargets[i])
            previous = downTargets[i]
        }
        for (let i = BLOOM_LEVELS - 2; i >= 0; i--) {
            upsampleMaterial.uniforms.texelSize.value.set(1 / previous.width, 1 / previous.height)
            upsampleMaterial.uniforms.inputBuffer.value = previous.texture
            upsampleMaterial.uniforms.supportBuffer.value = downTargets[i].texture
            fullscreenPass(upsampleMaterial, upTargets[i])
            previous = upTargets[i]
        }

        // 5. Composite bloom + vignette to the screen in sRGB.
        compositeMaterial.uniforms.inputBuffer.value = sceneTarget.texture
        compositeMaterial.uniforms.bloomBuffer.value = upTargets[0].texture
        fullscreenPass(compositeMaterial, null)
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    let rafId = 0
    let running = false
    let visible = true
    let lastTime = 0
    let disposed = false

    function loop(now: number) {
        if (!running || disposed) return
        rafId = requestAnimationFrame(loop)
        const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0
        lastTime = now
        renderFrame(delta)
    }

    function start() {
        if (running || disposed || !visible) return
        running = true
        lastTime = 0
        rafId = requestAnimationFrame(loop)
    }

    function stop() {
        running = false
        cancelAnimationFrame(rafId)
    }

    function renderOnce() {
        if (disposed) return
        controls.snap()
        renderFrame(0)
    }

    const intersection =
        typeof IntersectionObserver !== "undefined"
            ? new IntersectionObserver((entries) => {
                  visible = entries.some((entry) => entry.isIntersecting)
                  if (!animate) return
                  if (visible) start()
                  else stop()
              })
            : null
    intersection?.observe(container)

    const onContextLost = (event: Event) => {
        event.preventDefault()
        stop()
    }
    const onContextRestored = () => {
        if (animate) start()
        else renderOnce()
    }
    canvas.addEventListener("webglcontextlost", onContextLost)
    canvas.addEventListener("webglcontextrestored", onContextRestored)

    resize()

    return {
        setParams(next) {
            const previous = params
            params = next

            // Structure — only the capsule count needs new attribute buffers.
            if (next.capsuleCount !== previous.capsuleCount) {
                const geometry = buildCapsuleGeometry(next.capsuleCount)
                capsuleGeometry.dispose()
                capsuleGeometry = geometry
                hero.geometry = geometry
            }
            heroUniforms.u_scale.value = next.capsuleScale
            heroUniforms.u_bulge.value = next.bulge
            heroUniforms.u_attenuation.value = dentAttenuation(next.dentSize, next.orbSize)
            spheres.forEach((mesh) => mesh.scale.setScalar(next.orbSize / BASE_ORB_SIZE))

            // Camera & interaction
            controls.enabled = next.interactive
            controls.zoomEnabled = next.allowZoom
            controls.autoRotate = next.autoRotate ? next.autoRotateSpeed : 0
            if (next.distance !== previous.distance) controls.setDistance(next.distance)

            // Colors
            heroUniforms.u_color.value = toColor(next.capsuleColor, DEFAULT_CAPSULE_COLOR)
            coreMaterial.color = toColor(next.coreColor, "#111111")
            sphereUniforms.u_glassTint.value = toColor(next.glassTint, "#FFFFFF")
            backgroundUniforms.u_color0.value = toColor(next.background, DEFAULT_BACKGROUND)
            backgroundUniforms.u_color1.value = shadeColor(next.background, next.backgroundShade)
            backgroundUniforms.u_angle.value = next.gradientAngle

            // Glass
            sphereUniforms.u_thickness.value = next.glassThickness
            sphereUniforms.u_ior.value = next.refraction

            // Effects
            compositeMaterial.uniforms.intensity.value = next.bloomIntensity
            compositeMaterial.uniforms.darkness.value = next.vignette
            compositeMaterial.uniforms.offset.value = next.vignetteSpread
            upsampleMaterial.uniforms.radius.value = next.bloomSpread
            luminanceMaterial.uniforms.threshold.value = next.bloomThreshold
        },
        resize,
        start,
        stop,
        renderOnce,
        dispose() {
            disposed = true
            stop()
            matcapLoad.cancel()
            intersection?.disconnect()
            controls.dispose()
            canvas.removeEventListener("webglcontextlost", onContextLost)
            canvas.removeEventListener("webglcontextrestored", onContextRestored)

            capsuleGeometry.dispose()
            sphereGeometry.dispose()
            core.geometry.dispose()
            background.geometry.dispose()
            fullscreenGeometry.dispose()
            ;[
                heroMaterial,
                sphereMaterial,
                backgroundMaterial,
                coreMaterial,
                kawaseMaterial,
                luminanceMaterial,
                downsampleMaterial,
                upsampleMaterial,
                compositeMaterial,
            ].forEach((material) => material.dispose())
            ;[sceneTarget, kawaseTarget, blurTarget, luminanceTarget, ...downTargets, ...upTargets].forEach(
                (target) => target.dispose()
            )
            matcapTexture.current?.dispose()
            renderer.dispose()
            renderer.forceContextLoss()
            if (canvas.parentNode === container) container.removeChild(canvas)
        },
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain React component
// ─────────────────────────────────────────────────────────────────────────────

interface ResponsiveImageValue {
    src?: string
    srcSet?: string
    alt?: string
}

/** The two grouped controls. Each renders as one row summarising its fields. */
interface OrbGlass {
    refraction: number
    thickness: number
}

export interface CapsuleOrbProps {
    // Colors
    background?: string
    backgroundShade?: number
    gradientAngle?: number
    capsuleColor?: string
    coreColor?: string
    glassTint?: string
    // Form
    capsuleCount?: number
    capsuleSize?: number
    bulge?: number
    dentSize?: number
    orbCount?: number
    marbleSize?: number
    orbDistance?: number
    distance?: number
    // Motion
    speed?: number
    autoRotate?: boolean
    autoRotateSpeed?: number
    // Interaction — drag to orbit is always on, so neither of these has a control.
    interactive?: boolean
    allowZoom?: boolean
    // Material
    glass?: OrbGlass
    // Effects
    bloomIntensity?: number
    bloomThreshold?: number
    bloomSpread?: number
    vignette?: number
    vignetteSpread?: number
    // Performance
    maxPixelRatio?: number
    // Texture
    matcapImage?: ResponsiveImageValue
    style?: CSSProperties
}

export default function CapsuleOrb(props: CapsuleOrbProps) {
    const {
        background = "#000000",
        backgroundShade = 0.7,
        gradientAngle = 0,
        capsuleColor = "#00FAFF",
        coreColor = "#111111",
        glassTint = "#FFFFFF",
        capsuleCount = 3000,
        capsuleSize = 100,
        bulge = 0.4,
        dentSize = 1,
        orbCount = 10,
        marbleSize = 100,
        orbDistance = 1.9,
        distance = 5,
        speed = 57,
        autoRotate = true,
        autoRotateSpeed = 0.3,
        interactive = true,
        allowZoom = true,
        glass = { thickness: 0.6, refraction: 1.45 },
        bloomIntensity = 1,
        bloomThreshold = 0.82,
        bloomSpread = 0.85,
        vignette = 0.6,
        vignetteSpread = 0.3,
        maxPixelRatio = 1.5,
        matcapImage,
        style,
    } = props

    // The grouped control arrives as an object, and the two sizes and the speed
    // dial as percentages. Both are read defensively: a partial object, or a number
    // the host handed over as a string, falls back to the scene's own value.
    const refraction = clamp(num(glass?.refraction, DEFAULT_GLASS.refraction), 1, 2.5)
    const glassThickness = clamp(num(glass?.thickness, DEFAULT_GLASS.thickness), 0, 2)
    const capsuleScale = BASE_CAPSULE_SCALE * (clamp(num(capsuleSize, 100), 10, 400) / 100)
    const orbSize = BASE_ORB_SIZE * (clamp(num(marbleSize, 100), 10, 400) / 100)
    const orbitSpeed = clamp(num(speed, BASE_SPEED), 0, 200) / BASE_SPEED
    const cameraDistance = clamp(num(distance, 5), 2.5, 14)

    const animate = true
    const matcapUrl = matcapImage?.src || DEFAULT_MATCAP_URL

    const containerRef = useRef<HTMLDivElement>(null)
    const experienceRef = useRef<Experience | null>(null)

    const params: SceneParams = {
        capsuleCount: Math.round(clamp(num(capsuleCount, DEFAULT_INSTANCES_COUNT), 100, 8000)),
        capsuleScale,
        bulge,
        dentSize,
        orbCount: Math.round(clamp(num(orbCount, ORBIT_CONFIGS.length), 0, ORBIT_CONFIGS.length)),
        orbSize,
        orbDistance,
        distance: cameraDistance,
        speed: orbitSpeed,
        autoRotate,
        autoRotateSpeed,
        interactive,
        allowZoom,
        background,
        backgroundShade,
        gradientAngle,
        capsuleColor,
        coreColor,
        glassTint,
        refraction,
        glassThickness,
        bloomIntensity,
        bloomThreshold,
        bloomSpread,
        vignette,
        vignetteSpread,
        maxPixelRatio,
    }
    const paramsRef = useRef(params)
    paramsRef.current = params

    // Build (and tear down) the WebGL scene.
    useEffect(() => {
        const container = containerRef.current
        if (!container || typeof window === "undefined") return

        const experience = createExperience(container, paramsRef.current, matcapUrl, animate)
        if (!experience) return
        experienceRef.current = experience

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => {
                      experience.resize()
                      if (!animate) experience.renderOnce()
                  })
                : null
        resizeObserver?.observe(container)

        if (animate) experience.start()
        else experience.renderOnce()

        return () => {
            resizeObserver?.disconnect()
            experience.dispose()
            experienceRef.current = null
        }
    }, [matcapUrl, animate])

    // Push property changes into the running scene without rebuilding it.
    useEffect(() => {
        const experience = experienceRef.current
        if (!experience) return
        experience.setParams(paramsRef.current)
        experience.resize()
        if (!animate) experience.renderOnce()
    }, [
        capsuleCount,
        capsuleScale,
        bulge,
        dentSize,
        orbCount,
        orbSize,
        orbDistance,
        cameraDistance,
        orbitSpeed,
        autoRotate,
        autoRotateSpeed,
        interactive,
        allowZoom,
        background,
        backgroundShade,
        gradientAngle,
        capsuleColor,
        coreColor,
        glassTint,
        refraction,
        glassThickness,
        bloomIntensity,
        bloomThreshold,
        bloomSpread,
        vignette,
        vignetteSpread,
        maxPixelRatio,
        animate,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: interactive ? "none" : "auto",
                cursor: interactive ? "grab" : "default",
                ...style,
            }}
        />
    )
}
