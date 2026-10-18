"use client"

/// <reference types="@webgpu/types" />

import * as React from "react"
import { useEffect, useRef, useState } from "react"

/**
 * WaterBall — a real-time fluid simulation held together as a sphere.
 *
 * Direct port of matsuoka-601/waterball (MIT). Two halves, both on the GPU:
 *
 *   1. Simulation. Moving Least Squares Material Point Method (Hu et al.).
 *      Particles carry position, velocity and an affine velocity field C;
 *      each step scatters them onto a background grid (p2g), resolves
 *      pressure and viscosity there (updateGrid), then gathers back
 *      (g2p). The grid is what makes incompressibility cheap — neighbour
 *      search is just the 3x3x3 cells a particle overlaps. A radial force
 *      toward the box centre in g2p is the only thing making it a ball
 *      rather than a puddle.
 *
 *   2. Rendering. Screen-space fluid rendering (GDC 2010). No mesh is ever
 *      built. Particles are drawn as view-facing quads into a depth map,
 *      that depth map is bilaterally blurred until the blobbiness is gone,
 *      normals are reconstructed from its screen-space derivatives, and a
 *      separately accumulated thickness map drives Beer-Lambert absorption.
 *      Reflection comes from a cubemap, mixed in by Fresnel.
 *
 * The cubemap is fetched from the upstream repo at runtime, so this file
 * stays self-contained; if the fetch fails a plain procedural sky is used
 * instead, and the water still reflects something.
 *
 * WebGPU only — Chrome, Edge, and Safari with the feature flag on. Anything
 * else gets a static notice rather than a blank frame.
 */

// ---------------------------------------------------------------------------
// WGSL — verbatim from the original, inlined so the component is one file.
// ---------------------------------------------------------------------------

const CLEAR_GRID_WGSL = /* wgsl */ `
struct Cell {
    vx: i32,
    vy: i32,
    vz: i32,
    mass: i32,
}

@group(0) @binding(0) var<storage, read_write> cells: array<Cell>;

@compute @workgroup_size(64)
fn clearGrid(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < arrayLength(&cells)) {
        cells[id.x].mass = 0;
        cells[id.x].vx = 0;
        cells[id.x].vy = 0;
        cells[id.x].vz = 0;
    }
}
`

const SPAWN_PARTICLES_WGSL = /* wgsl */ `
struct Particle {
    position: vec3f,
    v: vec3f,
    C: mat3x3f,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> init_box_size: vec3f;
@group(0) @binding(2) var<uniform> numParticles: i32;
@group(0) @binding(3) var<uniform> ballRadius: f32;

// PCG-style integer hash. Deterministic per slot, so the ball fills the same
// way every run rather than flickering with a frame-varying seed.
fn hash01(seed: u32) -> f32 {
    var x: u32 = seed * 747796405u + 2891336453u;
    x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u;
    return f32((x >> 22u) ^ x) / 4294967295.0;
}

@compute @workgroup_size(1)
fn spawn() {
    let center: vec3f = init_box_size / 2;

    // The original jet, moved in close. Water still arrives as a stream with
    // real inward momentum — that is what makes the ball slosh as it fills
    // rather than just accumulating — but the nozzle sits a hair proud of the
    // surface instead of out in the corner of the box, so there is no visible
    // stream in flight, only water entering at one point on the shell.
    //
    // Just outside the radius on purpose: g2p's restoring force acts only on
    // particles *inside* the shell and scales with how deep they are, so a
    // nozzle any further in would fling each batch straight back out.
    let nozzle: vec3f = center + vec3f(0., 0., -ballRadius * 1.05);
    let nozzleRadius: f32 = ballRadius * 0.2;
    let jetSpeed: f32 = 0.6;

    for (var i = 0; i < 100; i++) {
        let slot = (numParticles - 1) - i;
        let seed = u32(slot);

        // sqrt spreads the batch evenly over the disc; without it everything
        // crowds the middle of the nozzle.
        let rd = nozzleRadius * sqrt(hash01(seed * 3u));
        let theta = hash01(seed * 3u + 1u) * 6.283185307;
        let pos = nozzle + vec3f(rd * cos(theta), rd * sin(theta), 0.);

        particles[slot].position = pos;
        particles[slot].v = normalize(center - pos) * jetSpeed;
        particles[slot].C = mat3x3f(vec3f(0.), vec3f(0.), vec3f(0.));
    }
}
`

const P2G_1_WGSL = /* wgsl */ `
struct Particle {
    position: vec3f,
    v: vec3f,
    C: mat3x3f,
}
struct Cell {
    vx: atomic<i32>,
    vy: atomic<i32>,
    vz: atomic<i32>,
    mass: atomic<i32>,
}

override fixed_point_multiplier: f32;

fn encodeFixedPoint(floating_point: f32) -> i32 {
    return i32(floating_point * fixed_point_multiplier);
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(2) var<uniform> init_box_size: vec3f;
@group(0) @binding(3) var<uniform> numParticles: u32;

@compute @workgroup_size(64)
fn p2g_1(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < numParticles) {
        var weights: array<vec3f, 3>;

        let particle = particles[id.x];
        let cell_idx: vec3f = floor(particle.position);
        let cell_diff: vec3f = particle.position - (cell_idx + 0.5f);
        weights[0] = 0.5f * (0.5f - cell_diff) * (0.5f - cell_diff);
        weights[1] = 0.75f - cell_diff * cell_diff;
        weights[2] = 0.5f * (0.5f + cell_diff) * (0.5f + cell_diff);

        let C: mat3x3f = particle.C;

        for (var gx = 0; gx < 3; gx++) {
            for (var gy = 0; gy < 3; gy++) {
                for (var gz = 0; gz < 3; gz++) {
                    let weight: f32 = weights[gx].x * weights[gy].y * weights[gz].z;
                    let cell_x: vec3f = vec3f(
                            cell_idx.x + f32(gx) - 1.,
                            cell_idx.y + f32(gy) - 1.,
                            cell_idx.z + f32(gz) - 1.
                        );
                    let cell_dist = (cell_x + 0.5f) - particle.position;

                    let Q: vec3f = C * cell_dist;

                    let mass_contrib: f32 = weight * 1.0;
                    let vel_contrib: vec3f = mass_contrib * (particle.v + Q);
                    let cell_index: i32 =
                        i32(cell_x.x) * i32(init_box_size.y) * i32(init_box_size.z) +
                        i32(cell_x.y) * i32(init_box_size.z) +
                        i32(cell_x.z);
                    atomicAdd(&cells[cell_index].mass, encodeFixedPoint(mass_contrib));
                    atomicAdd(&cells[cell_index].vx, encodeFixedPoint(vel_contrib.x));
                    atomicAdd(&cells[cell_index].vy, encodeFixedPoint(vel_contrib.y));
                    atomicAdd(&cells[cell_index].vz, encodeFixedPoint(vel_contrib.z));
                }
            }
        }
    }
}
`

const P2G_2_WGSL = /* wgsl */ `
struct Particle {
    position: vec3f,
    v: vec3f,
    C: mat3x3f,
}
struct Cell {
    vx: atomic<i32>,
    vy: atomic<i32>,
    vz: atomic<i32>,
    mass: i32,
}

override fixed_point_multiplier: f32;
override stiffness: f32;
override rest_density: f32;
override dynamic_viscosity: f32;
override dt: f32;

fn encodeFixedPoint(floating_point: f32) -> i32 {
    return i32(floating_point * fixed_point_multiplier);
}
fn decodeFixedPoint(fixed_point: i32) -> f32 {
    return f32(fixed_point) / fixed_point_multiplier;
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(2) var<uniform> init_box_size: vec3f;
@group(0) @binding(3) var<uniform> numParticles: u32;
@group(0) @binding(4) var<storage, read_write> densities: array<f32>;

@compute @workgroup_size(64)
fn p2g_2(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < numParticles) {
        var weights: array<vec3f, 3>;

        let particle = particles[id.x];
        let cell_idx: vec3f = floor(particle.position);
        let cell_diff: vec3f = particle.position - (cell_idx + 0.5f);
        weights[0] = 0.5f * (0.5f - cell_diff) * (0.5f - cell_diff);
        weights[1] = 0.75f - cell_diff * cell_diff;
        weights[2] = 0.5f * (0.5f + cell_diff) * (0.5f + cell_diff);

        var density: f32 = 0.;
        for (var gx = 0; gx < 3; gx++) {
            for (var gy = 0; gy < 3; gy++) {
                for (var gz = 0; gz < 3; gz++) {
                    let weight: f32 = weights[gx].x * weights[gy].y * weights[gz].z;
                    let cell_x: vec3f = vec3f(
                            cell_idx.x + f32(gx) - 1.,
                            cell_idx.y + f32(gy) - 1.,
                            cell_idx.z + f32(gz) - 1.
                        );
                    let cell_index: i32 =
                        i32(cell_x.x) * i32(init_box_size.y) * i32(init_box_size.z) +
                        i32(cell_x.y) * i32(init_box_size.z) +
                        i32(cell_x.z);
                    density += decodeFixedPoint(cells[cell_index].mass) * weight;
                }
            }
        }

        let volume: f32 = 1.0 / density;
        densities[id.x] = density;

        let pressure: f32 = max(-0.0, stiffness * (pow(density / rest_density, 5.) - 1));

        var stress: mat3x3f = mat3x3f(-pressure, 0, 0, 0, -pressure, 0, 0, 0, -pressure);
        let dudv: mat3x3f = particle.C;
        let strain: mat3x3f = dudv + transpose(dudv);
        stress += dynamic_viscosity * strain;

        let eq_16_term0 = -volume * 4 * stress * dt;

        for (var gx = 0; gx < 3; gx++) {
            for (var gy = 0; gy < 3; gy++) {
                for (var gz = 0; gz < 3; gz++) {
                    let weight: f32 = weights[gx].x * weights[gy].y * weights[gz].z;
                    let cell_x: vec3f = vec3f(
                            cell_idx.x + f32(gx) - 1.,
                            cell_idx.y + f32(gy) - 1.,
                            cell_idx.z + f32(gz) - 1.
                        );
                    let cell_dist = (cell_x + 0.5f) - particle.position;
                    let cell_index: i32 =
                        i32(cell_x.x) * i32(init_box_size.y) * i32(init_box_size.z) +
                        i32(cell_x.y) * i32(init_box_size.z) +
                        i32(cell_x.z);
                    let momentum: vec3f = eq_16_term0 * weight * cell_dist;
                    atomicAdd(&cells[cell_index].vx, encodeFixedPoint(momentum.x));
                    atomicAdd(&cells[cell_index].vy, encodeFixedPoint(momentum.y));
                    atomicAdd(&cells[cell_index].vz, encodeFixedPoint(momentum.z));
                }
            }
        }
    }
}
`

const UPDATE_GRID_WGSL = /* wgsl */ `
struct Cell {
    vx: i32,
    vy: i32,
    vz: i32,
    mass: i32,
}
struct RenderUniforms {
    texel_size: vec2f,
    sphere_size: f32,
    inv_projection_matrix: mat4x4f,
    projection_matrix: mat4x4f,
    view_matrix: mat4x4f,
    inv_view_matrix: mat4x4f,
}
struct MouseInfo {
    screenSize: vec2f,
    mouseCoord : vec2f,
    mouseVel : vec2f,
    mouseRadius: f32,
    forceStrength: f32,
}

override fixed_point_multiplier: f32;
override dt: f32;

@group(0) @binding(0) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(1) var<uniform> real_box_size: vec3f;
@group(0) @binding(2) var<uniform> init_box_size: vec3f;
@group(0) @binding(3) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(4) var depthTexture: texture_2d<f32>;
@group(0) @binding(5) var<uniform> mouseInfo: MouseInfo;

fn encodeFixedPoint(floating_point: f32) -> i32 {
    return i32(floating_point * fixed_point_multiplier);
}
fn decodeFixedPoint(fixed_point: i32) -> f32 {
    return f32(fixed_point) / fixed_point_multiplier;
}

fn computeViewPosFromUVDepth(tex_coord: vec2f, depth: f32) -> vec3f {
    var ndc: vec4f = vec4f(tex_coord.x * 2.0 - 1.0, 1.0 - 2.0 * tex_coord.y, 0.0, 1.0);
    ndc.z = -uniforms.projection_matrix[2].z + uniforms.projection_matrix[3].z / depth;
    ndc.w = 1.0;

    var eye_pos: vec4f = uniforms.inv_projection_matrix * ndc;

    return eye_pos.xyz / eye_pos.w;
}

fn getViewPosFromTexCoord(tex_coord: vec2f, iuv: vec2f) -> vec3f {
    var depth: f32 = abs(textureLoad(depthTexture, vec2u(iuv), 0).x);
    return computeViewPosFromUVDepth(tex_coord, depth);
}

@compute @workgroup_size(64)
fn updateGrid(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < arrayLength(&cells)) {
        let uv: vec2f = mouseInfo.mouseCoord;
        let iuv = uv * mouseInfo.screenSize;
        let depth: f32 = abs(textureLoad(depthTexture, vec2u(iuv), 0).x);
        var mouseCellIndex: u32 = 1000000000;
        var cellSquareDistToMouse: f32 = 1e9;
        var forceDir = vec3f(0.);
        if (depth < 1e5) {
            let mouseViewPos = getViewPosFromTexCoord(uv, iuv);
            let mouseWorldPos = uniforms.inv_view_matrix * vec4f(mouseViewPos, 1.);
            let mouseCellPos: vec3i = vec3i(floor(mouseWorldPos).xyz);
            mouseCellIndex =    u32(mouseCellPos.x) * u32(init_box_size.y) * u32(init_box_size.z) +
                                u32(mouseCellPos.y) * u32(init_box_size.z) +
                                u32(mouseCellPos.z);
            let center = real_box_size / 2;
            if (dot(mouseInfo.mouseVel, mouseInfo.mouseVel) > 0.) {
                forceDir = (uniforms.inv_view_matrix * vec4f(mouseInfo.mouseVel, 0.0, 0)).xyz;
            } else {
                forceDir = vec3f(0.);
            }

            var x: f32 = f32(i32(id.x) / i32(init_box_size.z) / i32(init_box_size.y));
            var y: f32 = f32((i32(id.x) / i32(init_box_size.z)) % i32(init_box_size.y));
            var z: f32 = f32(i32(id.x) % i32(init_box_size.z));
            let cellPos = vec3f(x, y, z);
            let diff = floor(mouseWorldPos).xyz - cellPos;
            cellSquareDistToMouse = dot(diff, diff);
        }

        let dt = dt;
        let r = mouseInfo.mouseRadius;

        if (cells[id.x].mass > 0) {
            var float_v: vec3f = vec3f(
                decodeFixedPoint(cells[id.x].vx),
                decodeFixedPoint(cells[id.x].vy),
                decodeFixedPoint(cells[id.x].vz)
            );
            float_v /= decodeFixedPoint(cells[id.x].mass);

            if (cellSquareDistToMouse < r * r) {
                let strength = (r * r - cellSquareDistToMouse) / (r * r) * mouseInfo.forceStrength;
                cells[id.x].vx = encodeFixedPoint(float_v.x + strength * forceDir.x);
                cells[id.x].vy = encodeFixedPoint(float_v.y + strength * forceDir.y);
                cells[id.x].vz = encodeFixedPoint(float_v.z + strength * forceDir.z);
            } else {
                cells[id.x].vx = encodeFixedPoint(float_v.x);
                cells[id.x].vy = encodeFixedPoint(float_v.y);
                cells[id.x].vz = encodeFixedPoint(float_v.z);
            }

            var x: i32 = i32(id.x) / i32(init_box_size.z) / i32(init_box_size.y);
            var y: i32 = (i32(id.x) / i32(init_box_size.z)) % i32(init_box_size.y);
            var z: i32 = i32(id.x) % i32(init_box_size.z);
            if (x < 2 || x > i32(ceil(real_box_size.x) - 3)) { cells[id.x].vx = 0; }
            if (y < 2 || y > i32(ceil(real_box_size.y) - 3)) { cells[id.x].vy = 0; }
            if (z < 2 || z > i32(ceil(real_box_size.z) - 3)) { cells[id.x].vz = 0; }
        }
    }
}
`

const G2P_WGSL = /* wgsl */ `
struct Particle {
    position: vec3f,
    v: vec3f,
    C: mat3x3f,
}
struct Cell {
    vx: i32,
    vy: i32,
    vz: i32,
    mass: i32,
}

override fixed_point_multiplier: f32;
override dt: f32;

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> cells: array<Cell>;
@group(0) @binding(2) var<uniform> real_box_size: vec3f;
@group(0) @binding(3) var<uniform> init_box_size: vec3f;
@group(0) @binding(4) var<uniform> numParticles: u32;
@group(0) @binding(5) var<uniform> sphereRadius: f32;

fn decodeFixedPoint(fixed_point: i32) -> f32 {
    return f32(fixed_point) / fixed_point_multiplier;
}

@compute @workgroup_size(64)
fn g2p(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < numParticles) {
        particles[id.x].v = vec3f(0.);
        var weights: array<vec3f, 3>;

        let particle = particles[id.x];
        let cell_idx: vec3f = floor(particle.position);
        let cell_diff: vec3f = particle.position - (cell_idx + 0.5f);
        weights[0] = 0.5f * (0.5f - cell_diff) * (0.5f - cell_diff);
        weights[1] = 0.75f - cell_diff * cell_diff;
        weights[2] = 0.5f * (0.5f + cell_diff) * (0.5f + cell_diff);

        var B: mat3x3f = mat3x3f(vec3f(0.), vec3f(0.), vec3f(0.));
        for (var gx = 0; gx < 3; gx++) {
            for (var gy = 0; gy < 3; gy++) {
                for (var gz = 0; gz < 3; gz++) {
                    let weight: f32 = weights[gx].x * weights[gy].y * weights[gz].z;
                    let cell_x: vec3f = vec3f(
                        cell_idx.x + f32(gx) - 1.,
                        cell_idx.y + f32(gy) - 1.,
                        cell_idx.z + f32(gz) - 1.
                    );
                    let cell_dist: vec3f = (cell_x + 0.5f) - particle.position;
                    let cell_index: i32 =
                        i32(cell_x.x) * i32(init_box_size.y) * i32(init_box_size.z) +
                        i32(cell_x.y) * i32(init_box_size.z) +
                        i32(cell_x.z);
                    let weighted_velocity: vec3f = vec3f(
                        decodeFixedPoint(cells[cell_index].vx),
                        decodeFixedPoint(cells[cell_index].vy),
                        decodeFixedPoint(cells[cell_index].vz)
                    ) * weight;
                    let term: mat3x3f = mat3x3f(
                        weighted_velocity * cell_dist.x,
                        weighted_velocity * cell_dist.y,
                        weighted_velocity * cell_dist.z
                    );

                    B += term;

                    particles[id.x].v += weighted_velocity;
                }
            }
        }

        particles[id.x].C = B * 4.0f;
        particles[id.x].position += particles[id.x].v * dt;
        particles[id.x].position = vec3f(
            clamp(particles[id.x].position.x, 1., real_box_size.x - 2.),
            clamp(particles[id.x].position.y, 1., real_box_size.y - 2.),
            clamp(particles[id.x].position.z, 1., real_box_size.z - 2.)
        );

        let center = vec3f(real_box_size.x / 2, real_box_size.y / 2, real_box_size.z / 2);
        let dist = center - particles[id.x].position;
        let dirToOrigin = normalize(dist);
        var rForce = vec3f(0);

        let r: f32 = sphereRadius;

        if (dot(dist, dist) < r * r) {
            particles[id.x].v += -(r - sqrt(dot(dist, dist))) * dirToOrigin * 3.0;
        }

        particles[id.x].v += dirToOrigin * 0.1;

        let k = 3.0;
        let wall_stiffness = 1.0;
        let x_n: vec3f = particles[id.x].position + particles[id.x].v * dt * k;
        let wall_min: vec3f = vec3f(3.);
        let wall_max: vec3f = real_box_size - 4.;
        if (x_n.x < wall_min.x) { particles[id.x].v.x += wall_stiffness * (wall_min.x - x_n.x); }
        if (x_n.x > wall_max.x) { particles[id.x].v.x += wall_stiffness * (wall_max.x - x_n.x); }
        if (x_n.y < wall_min.y) { particles[id.x].v.y += wall_stiffness * (wall_min.y - x_n.y); }
        if (x_n.y > wall_max.y) { particles[id.x].v.y += wall_stiffness * (wall_max.y - x_n.y); }
        if (x_n.z < wall_min.z) { particles[id.x].v.z += wall_stiffness * (wall_min.z - x_n.z); }
        if (x_n.z > wall_max.z) { particles[id.x].v.z += wall_stiffness * (wall_max.z - x_n.z); }
    }
}
`

const COPY_POSITION_WGSL = /* wgsl */ `
struct Particle {
    position: vec3f,
    v: vec3f,
    C: mat3x3f,
}

struct PosVel {
    position: vec3f,
    v: vec3f,
    density: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> posvel: array<PosVel>;
@group(0) @binding(2) var<uniform> numParticles: u32;
@group(0) @binding(3) var<storage, read> densities: array<f32>;

@compute @workgroup_size(64)
fn copyPosition(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x < numParticles) {
        posvel[id.x].position = particles[id.x].position;
        posvel[id.x].v = particles[id.x].v;
        posvel[id.x].density = densities[id.x];
    }
}
`

const FULL_SCREEN_WGSL = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
  @location(1) iuv : vec2f,
}

override screenWidth: f32;
override screenHeight: f32;

@vertex
fn vs(@builtin(vertex_index) vertex_index : u32) -> VertexOutput {
    var out: VertexOutput;

    var pos = array(
        vec2( 1.0,  1.0),
        vec2( 1.0, -1.0),
        vec2(-1.0, -1.0),
        vec2( 1.0,  1.0),
        vec2(-1.0, -1.0),
        vec2(-1.0,  1.0),
    );

    var uv = array(
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
    );

    out.position = vec4(pos[vertex_index], 0.0, 1.0);
    out.uv = uv[vertex_index];
    out.iuv = out.uv * vec2f(screenWidth, screenHeight);

    return out;
}
`

// Shared by depthMap and thicknessMap: the velocity-stretched billboard.
const STRETCH_WGSL = /* wgsl */ `
fn computeStretchedVertex(position: vec2f, velocity_dir: vec2f, strength: f32) -> vec2f {
    let stretch_offset: vec2f = dot(velocity_dir, position) * velocity_dir;
    return position + stretch_offset * strength;
}

fn area(v1: vec2f, v2: vec2f, v3: vec2f, v4: vec2f) -> f32 {
    let ab = v2 - v1;
    let ad = v4 - v1;
    let s = abs(ab.x * ad.y - ab.y * ad.x);
    return s;
}

fn scaleQuad(vel: vec2f, r: f32, strength: f32) -> f32 {
    let s1: f32 = r * r;
    let v1 = computeStretchedVertex(vec2f(0.5 * r, 0.5 * r), vel, strength);
    let v2 = computeStretchedVertex(vec2f(-0.5 * r, 0.5 * r), vel, strength);
    let v3 = computeStretchedVertex(vec2f(-0.5 * r, -0.5 * r), vel, strength);
    let v4 = computeStretchedVertex(vec2f(0.5 * r, -0.5 * r), vel, strength);
    let s2: f32 = area(v1, v2, v3, v4);
    return sqrt(s1 / s2);
}
`

const RENDER_UNIFORMS_WGSL = /* wgsl */ `
struct RenderUniforms {
    texel_size: vec2f,
    sphere_size: f32,
    inv_projection_matrix: mat4x4f,
    projection_matrix: mat4x4f,
    view_matrix: mat4x4f,
    inv_view_matrix: mat4x4f,
}

struct PosVel {
    position: vec3f,
    v: vec3f,
    density: f32,
}
`

const DEPTH_MAP_WGSL = /* wgsl */ `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) view_position: vec3f,
}

struct FragmentInput {
    @location(0) uv: vec2f,
    @location(1) view_position: vec3f,
}

struct FragmentOutput {
    @location(0) frag_color: vec4f,
    @builtin(frag_depth) frag_depth: f32,
}

${RENDER_UNIFORMS_WGSL}

@group(0) @binding(0) var<storage> particles: array<PosVel>;
@group(0) @binding(1) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(2) var<uniform> stretchStrength: f32;

override restDensity: f32;
override densitySizeScale: f32;

${STRETCH_WGSL}

@vertex
fn vs(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32
) -> VertexOutput {
    var corner_positions = array(
        vec2( 0.5,  0.5),
        vec2( 0.5, -0.5),
        vec2(-0.5, -0.5),
        vec2( 0.5,  0.5),
        vec2(-0.5, -0.5),
        vec2(-0.5,  0.5),
    );

    let size = uniforms.sphere_size * clamp(particles[instance_index].density / restDensity * densitySizeScale, 0.0, 1.0);
    let projected_velocity = (uniforms.view_matrix * vec4f(particles[instance_index].v, 0.0)).xy;
    let stretched_position = computeStretchedVertex(corner_positions[vertex_index] * size, projected_velocity, stretchStrength);
    let corner = vec3(stretched_position, 0.0) * scaleQuad(projected_velocity, size, stretchStrength);

    let uv = corner_positions[vertex_index] + 0.5;

    let real_position = particles[instance_index].position;
    let view_position = (uniforms.view_matrix * vec4f(real_position, 1.0)).xyz;

    let out_position = uniforms.projection_matrix * vec4f(view_position + corner, 1.0);

    return VertexOutput(out_position, uv, view_position);
}

@fragment
fn fs(input: FragmentInput) -> FragmentOutput {
    var out: FragmentOutput;

    var normalxy: vec2f = input.uv * 2.0 - 1.0;
    var r2: f32 = dot(normalxy, normalxy);
    if (r2 > 1.0) {
        discard;
    }
    var normalz = sqrt(1.0 - r2);
    var normal = vec3(normalxy, normalz);

    var radius = uniforms.sphere_size / 2;
    var real_view_pos: vec4f = vec4f(input.view_position + normal * radius, 1.0);
    var clip_space_pos: vec4f = uniforms.projection_matrix * real_view_pos;
    out.frag_depth = clip_space_pos.z / clip_space_pos.w;

    out.frag_color = vec4(real_view_pos.z, 0., 0., 1.);
    return out;
}
`

const THICKNESS_MAP_WGSL = /* wgsl */ `
${RENDER_UNIFORMS_WGSL}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

struct FragmentInput {
    @location(0) uv: vec2f,
}

@group(0) @binding(0) var<storage> particles: array<PosVel>;
@group(0) @binding(1) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(2) var<uniform> stretchStrength: f32;

override restDensity: f32;
override densitySizeScale: f32;

${STRETCH_WGSL}

@vertex
fn vs(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32
) -> VertexOutput {
    var corner_positions = array(
        vec2( 0.5,  0.5),
        vec2( 0.5, -0.5),
        vec2(-0.5, -0.5),
        vec2( 0.5,  0.5),
        vec2(-0.5, -0.5),
        vec2(-0.5,  0.5),
    );

    let size = uniforms.sphere_size * clamp(particles[instance_index].density / restDensity * densitySizeScale, 0.0, 1.0);
    let projected_velocity = (uniforms.view_matrix * vec4f(particles[instance_index].v, 0.0)).xy;
    let stretched_position = computeStretchedVertex(corner_positions[vertex_index] * size, projected_velocity, stretchStrength);
    let corner = vec3(stretched_position, 0.0) * scaleQuad(projected_velocity, size, stretchStrength);

    let uv = corner_positions[vertex_index] + 0.5;

    let real_position = particles[instance_index].position;
    let view_position = (uniforms.view_matrix * vec4f(real_position, 1.0)).xyz;

    let out_position = uniforms.projection_matrix * vec4f(view_position + corner, 1.0);

    return VertexOutput(out_position, uv);
}

@fragment
fn fs(input: FragmentInput) -> @location(0) vec4f {
    var normalxy: vec2f = input.uv * 2.0 - 1.0;
    var r2: f32 = dot(normalxy, normalxy);
    if (r2 > 1.0) {
        discard;
    }
    var thickness: f32 = sqrt(1.0 - r2);
    let particle_alpha = 0.05;

    return vec4f(vec3f(particle_alpha * thickness), 1.0);
}
`

const BILATERAL_WGSL = /* wgsl */ `
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: FilterUniforms;

struct FragmentInput {
    @location(0) uv: vec2f,
    @location(1) iuv: vec2f
}

override depth_threshold: f32;
override projected_particle_constant: f32;
override max_filter_size: f32;

struct FilterUniforms {
    blur_dir: vec2f,
}

@fragment
fn fs(input: FragmentInput) -> @location(0) vec4f {
    var depth: f32 = abs(textureLoad(texture, vec2u(input.iuv), 0).r);

    if (depth >= 1e4) {
        return vec4f(vec3f(depth), 1.);
    }

    var filter_size: i32 = min(i32(max_filter_size), i32(ceil(projected_particle_constant / depth)));

    var sigma: f32 = f32(filter_size) / 3.0;
    var two_sigma: f32 = 2.0 * sigma * sigma;
    var sigma_depth: f32 = depth_threshold / 3.0;
    var two_sigma_depth: f32 = 2.0 * sigma_depth * sigma_depth;

    var sum: f32 = 0.0;
    var wsum: f32 = 0.0;
    for (var x: i32 = -filter_size; x <= filter_size; x++) {
        var coords: vec2f = vec2f(f32(x));
        var sampled_depth: f32 = abs(textureLoad(texture, vec2u(input.iuv + coords * uniforms.blur_dir), 0).r);

        var rr: f32 = dot(coords, coords);
        var w: f32 = exp(-rr / two_sigma);

        var r_depth: f32 = sampled_depth - depth;
        var wd: f32 = exp(-r_depth * r_depth / two_sigma_depth);
        sum += sampled_depth * w * wd;
        wsum += w * wd;
    }

    sum /= wsum;

    return vec4f(sum, 0., 0., 1.);
}
`

const GAUSSIAN_WGSL = /* wgsl */ `
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: FilterUniforms;

struct FragmentInput {
    @location(0) uv: vec2f,
    @location(1) iuv: vec2f
}

struct FilterUniforms {
    blur_dir: vec2f,
}

@fragment
fn fs(input: FragmentInput) -> @location(0) vec4f {
    var thickness: f32 = textureLoad(texture, vec2u(input.iuv), 0).r;
    if (thickness == 0.) {
        return vec4f(0., 0., 0., 1.);
    }

    var filter_size: i32 = 30;
    var sigma: f32 = f32(filter_size) / 3.0;
    var two_sigma: f32 = 2.0 * sigma * sigma;

    var sum = 0.;
    var wsum = 0.;

    for (var x: i32 = -filter_size; x <= filter_size; x++) {
        var coords: vec2f = vec2f(f32(x));
        var sampled_thickness: f32 = textureLoad(texture, vec2u(input.iuv + uniforms.blur_dir * coords), 0).r;

        var w: f32 = exp(-coords.x * coords.x / two_sigma);

        sum += sampled_thickness * w;
        wsum += w;
    }

    sum /= wsum;

    return vec4f(sum, 0., 0., 1.);
}
`

const FLUID_WGSL = /* wgsl */ `
@group(0) @binding(0) var texture_sampler: sampler;
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(3) var thickness_texture: texture_2d<f32>;
@group(0) @binding(4) var envmap_texture: texture_cube<f32>;
@group(0) @binding(5) var<uniform> water: WaterUniforms;

struct WaterUniforms {
    water_color: vec3f,
    absorption: f32,
    fresnel_f0: f32,
}

struct RenderUniforms {
    texel_size: vec2f,
    sphere_size: f32,
    inv_projection_matrix: mat4x4f,
    projection_matrix: mat4x4f,
    view_matrix: mat4x4f,
    inv_view_matrix: mat4x4f,
}

struct FragmentInput {
    @location(0) uv: vec2f,
    @location(1) iuv: vec2f,
}

fn computeViewPosFromUVDepth(tex_coord: vec2f, depth: f32) -> vec3f {
    var ndc: vec4f = vec4f(tex_coord.x * 2.0 - 1.0, 1.0 - 2.0 * tex_coord.y, 0.0, 1.0);
    ndc.z = -uniforms.projection_matrix[2].z + uniforms.projection_matrix[3].z / depth;
    ndc.w = 1.0;

    var eye_pos: vec4f = uniforms.inv_projection_matrix * ndc;

    return eye_pos.xyz / eye_pos.w;
}

fn getViewPosFromTexCoord(tex_coord: vec2f, iuv: vec2f) -> vec3f {
    var depth: f32 = abs(textureLoad(texture, vec2u(iuv), 0).x);
    return computeViewPosFromUVDepth(tex_coord, depth);
}

@fragment
fn fs(input: FragmentInput) -> @location(0) vec4f {
    var depth: f32 = abs(textureLoad(texture, vec2u(input.iuv), 0).r);

    // Not a background — this is the neutral grey the water refracts, and it
    // is all that is left of it. Pixels the fluid does not cover stay clear.
    let refractionBase: vec3f = vec3f(0.7, 0.7, 0.75);

    if (depth >= 1e4) {
        return vec4f(0.);
    }

    var viewPos: vec3f = computeViewPosFromUVDepth(input.uv, depth);

    var ddx: vec3f = getViewPosFromTexCoord(input.uv + vec2f(uniforms.texel_size.x, 0.), input.iuv + vec2f(1.0, 0.0)) - viewPos;
    var ddy: vec3f = getViewPosFromTexCoord(input.uv + vec2f(0., uniforms.texel_size.y), input.iuv + vec2f(0.0, 1.0)) - viewPos;
    var ddx2: vec3f = viewPos - getViewPosFromTexCoord(input.uv + vec2f(-uniforms.texel_size.x, 0.), input.iuv + vec2f(-1.0, 0.0));
    var ddy2: vec3f = viewPos - getViewPosFromTexCoord(input.uv + vec2f(0., -uniforms.texel_size.y), input.iuv + vec2f(0.0, -1.0));

    if (abs(ddx.z) > abs(ddx2.z)) {
        ddx = ddx2;
    }
    if (abs(ddy.z) > abs(ddy2.z)) {
        ddy = ddy2;
    }

    var normal: vec3f = -normalize(cross(ddx, ddy));
    var rayDir = normalize(viewPos);
    var lightDir = normalize((uniforms.view_matrix * vec4f(-1, 1, -1, 0.)).xyz);
    var H: vec3f        = normalize(lightDir - rayDir);
    var specular: f32   = pow(max(0.0, dot(H, normal)), 250.);
    var diffuse: f32  = max(0.0, dot(lightDir, normal)) * 1.0;

    var thickness = textureLoad(thickness_texture, vec2u(input.iuv), 0).r;

    // Beer-Lambert: the further light travels through the body, the more of
    // everything but the water's own colour is absorbed.
    var transmittance: vec3f = exp(-water.absorption * thickness * (1.0 - water.water_color));

    var refractionColor: vec3f = refractionBase * transmittance;

    let F0 = water.fresnel_f0;
    var fresnel: f32 = clamp(F0 + (1.0 - F0) * pow(1.0 - dot(normal, -rayDir), 5.0) + 0.0, 0., 1.);

    var reflectionDir: vec3f = reflect(rayDir, normal);
    var reflectionDirWorld: vec3f = (uniforms.inv_view_matrix * vec4f(reflectionDir, 0.0)).xyz;
    var reflectionColor: vec3f = textureSampleLevel(envmap_texture, texture_sampler, reflectionDirWorld, 0.).rgb;
    var finalColor = 0.0 * specular + mix(refractionColor, reflectionColor, fresnel);

    let maxDeltaZ = max(max(abs(ddx.z), abs(ddy.z)), max(abs(ddx2.z), abs(ddy2.z)));
    if (maxDeltaZ > 1.5 * uniforms.sphere_size) {
        return vec4f(mix(finalColor, vec3f(0.9), 0.4), 1.0);
    }

    return vec4f(finalColor, 1.0);
}
`

// ---------------------------------------------------------------------------
// Minimal column-major mat4, matching wgpu-matrix semantics (WebGPU 0..1 depth,
// post-multiplied transforms). Only what the camera needs; no dependency.
// ---------------------------------------------------------------------------

type M4 = Float32Array

function m4identity(): M4 {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
}

function m4perspective(fov: number, aspect: number, near: number, far: number): M4 {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov)
    const m = new Float32Array(16)
    const rangeInv = 1 / (near - far)
    m[0] = f / aspect
    m[5] = f
    m[10] = far * rangeInv
    m[11] = -1
    m[14] = far * near * rangeInv
    return m
}

function m4mul(a: M4, b: M4): M4 {
    const out = new Float32Array(16)
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4],
            b1 = b[c * 4 + 1],
            b2 = b[c * 4 + 2],
            b3 = b[c * 4 + 3]
        for (let r = 0; r < 4; r++) {
            out[c * 4 + r] =
                a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3
        }
    }
    return out
}

function m4translate(m: M4, v: number[]): M4 {
    const t = m4identity()
    t[12] = v[0]
    t[13] = v[1]
    t[14] = v[2]
    return m4mul(m, t)
}

function m4rotateX(m: M4, a: number): M4 {
    const c = Math.cos(a),
        s = Math.sin(a)
    const r = m4identity()
    r[5] = c
    r[6] = s
    r[9] = -s
    r[10] = c
    return m4mul(m, r)
}

function m4rotateY(m: M4, a: number): M4 {
    const c = Math.cos(a),
        s = Math.sin(a)
    const r = m4identity()
    r[0] = c
    r[2] = -s
    r[8] = s
    r[10] = c
    return m4mul(m, r)
}

function v3sub(a: number[], b: number[]) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function v3cross(a: number[], b: number[]) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
function v3dot(a: number[], b: number[]) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
function v3norm(a: number[]) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
}

function m4lookAt(eye: number[], target: number[], up: number[]): M4 {
    const z = v3norm(v3sub(eye, target))
    const x = v3norm(v3cross(up, z))
    const y = v3norm(v3cross(z, x))
    const m = new Float32Array(16)
    m[0] = x[0]
    m[1] = y[0]
    m[2] = z[0]
    m[4] = x[1]
    m[5] = y[1]
    m[6] = z[1]
    m[8] = x[2]
    m[9] = y[2]
    m[10] = z[2]
    m[12] = -v3dot(x, eye)
    m[13] = -v3dot(y, eye)
    m[14] = -v3dot(z, eye)
    m[15] = 1
    return m
}

function m4inverse(a: M4): M4 {
    const [
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        a30, a31, a32, a33,
    ] = a as unknown as number[]

    const b00 = a00 * a11 - a01 * a10
    const b01 = a00 * a12 - a02 * a10
    const b02 = a00 * a13 - a03 * a10
    const b03 = a01 * a12 - a02 * a11
    const b04 = a01 * a13 - a03 * a11
    const b05 = a02 * a13 - a03 * a12
    const b06 = a20 * a31 - a21 * a30
    const b07 = a20 * a32 - a22 * a30
    const b08 = a20 * a33 - a23 * a30
    const b09 = a21 * a32 - a22 * a31
    const b10 = a21 * a33 - a23 * a31
    const b11 = a22 * a33 - a23 * a32

    let det =
        b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    if (!det) return m4identity()
    det = 1.0 / det

    const out = new Float32Array(16)
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
    return out
}

// ---------------------------------------------------------------------------
// Constants from the original demo.
// ---------------------------------------------------------------------------

const MAX_PARTICLES = 200000
const PARTICLE_STRUCT_SIZE = 80
const RESOLUTION_SCALE = 0.7

const PARTICLE_COUNTS = [30000, 60000, 100000]
const BOX_SIZES = [
    [52, 52, 52],
    [60, 60, 60],
    [72, 72, 72],
]
const CAMERA_DISTANCES = [60, 70, 90]
const BALL_RADII = [15, 20, 25]
const CURSOR_RADII = [5, 6, 8]
const STRETCH_STRENGTHS = [2.5, 2.0, 1.5]

const FOV = (45 * Math.PI) / 180
const PARTICLE_RADIUS = 0.7
const ZOOM_RATE = 0.7

const CUBEMAP_BASE =
    "https://raw.githubusercontent.com/matsuoka-601/waterball/main/public/cubemap"
// The order the cube view expects: +X, -X, +Y, -Y, +Z, -Z.
const CUBEMAP_FACES = ["posx", "negx", "posy", "negy", "posz", "negz"]

// ---------------------------------------------------------------------------
// Cubemap. Fetched from upstream; a flat procedural sky stands in if that fails
// so an offline canvas still gets a sane reflection instead of black water.
// ---------------------------------------------------------------------------

function proceduralFace(index: number): ImageBitmap | HTMLCanvasElement {
    const size = 128
    const c = document.createElement("canvas")
    c.width = c.height = size
    const g = c.getContext("2d")!
    if (index === 2) {
        g.fillStyle = "#7FB2E5"
        g.fillRect(0, 0, size, size)
    } else if (index === 3) {
        g.fillStyle = "#4A4438"
        g.fillRect(0, 0, size, size)
    } else {
        const grad = g.createLinearGradient(0, 0, 0, size)
        grad.addColorStop(0, "#7FB2E5")
        grad.addColorStop(0.48, "#CFE2F2")
        grad.addColorStop(0.52, "#6E6552")
        grad.addColorStop(1, "#4A4438")
        g.fillStyle = grad
        g.fillRect(0, 0, size, size)
    }
    return c
}

async function loadCubemapSources(): Promise<
    (ImageBitmap | HTMLCanvasElement)[]
> {
    try {
        return await Promise.all(
            CUBEMAP_FACES.map(async (name) => {
                const res = await fetch(`${CUBEMAP_BASE}/${name}.png`)
                if (!res.ok) throw new Error(String(res.status))
                return createImageBitmap(await res.blob())
            })
        )
    } catch {
        return CUBEMAP_FACES.map((_, i) => proceduralFace(i))
    }
}

// ---------------------------------------------------------------------------
// Camera. Orbit only on the horizontal axis, as in the original.
// ---------------------------------------------------------------------------

class Camera {
    isDragging = false
    prevX = 0
    prevY = 0
    prevHoverX = 0
    prevHoverY = 0
    currentHoverX = 0
    currentHoverY = 0
    hasHover = false
    currentXtheta = -Math.PI / 2
    currentYtheta = 0
    maxYTheta = 0
    minYTheta = (-0.99 * Math.PI) / 2
    sensitivity = 0.005
    currentDistance = 70
    maxDistance = 140
    minDistance = 49
    target: number[] = [0, 0, 0]
    fov = FOV
    zoomRate = ZOOM_RATE

    constructor(
        private canvas: HTMLCanvasElement,
        private views: RenderUniformViews
    ) {}

    reset(initDistance: number, target: number[], fov: number, zoomRate: number) {
        this.isDragging = false
        this.prevX = 0
        this.prevY = 0
        this.currentXtheta = -Math.PI / 2
        this.currentYtheta = 0
        this.maxYTheta = 0
        this.minYTheta = (-0.99 * Math.PI) / 2
        this.sensitivity = 0.005
        this.currentDistance = initDistance
        this.maxDistance = 2 * initDistance
        this.minDistance = 0.7 * initDistance
        this.target = target
        this.fov = fov
        this.zoomRate = zoomRate

        const aspect = this.canvas.clientWidth / this.canvas.clientHeight
        const projection = m4perspective(fov, aspect, 0.1, 300)
        this.views.projection_matrix.set(projection)
        this.views.inv_projection_matrix.set(m4inverse(projection))
        this.recalculateView()
    }

    recalculateView() {
        let mat = m4identity()
        mat = m4translate(mat, this.target)
        mat = m4rotateY(mat, this.currentXtheta)
        mat = m4rotateX(mat, this.currentYtheta)
        mat = m4translate(mat, [0, 0, this.currentDistance])
        // The transformed origin is the translation column.
        const position = [mat[12], mat[13], mat[14]]

        const view = m4lookAt(position, this.target, [0, 1, 0])
        this.views.view_matrix.set(view)
        this.views.inv_view_matrix.set(m4inverse(view))
    }

    // Size drives this. Kept separate from reset() so changing it does not
    // snap the orbit back to its starting angle.
    setDistance(distance: number) {
        this.currentDistance = distance
        this.minDistance = 0.7 * distance
        this.maxDistance = 2 * distance
        this.recalculateView()
    }

    zoom(deltaY: number) {
        this.currentDistance += (deltaY > 0 ? 1 : -1) * this.zoomRate
        if (this.currentDistance < this.minDistance)
            this.currentDistance = this.minDistance
        if (this.currentDistance > this.maxDistance)
            this.currentDistance = this.maxDistance
        this.recalculateView()
    }

    drag(x: number) {
        const deltaX = this.prevX - x
        this.currentXtheta += this.sensitivity * deltaX
        if (this.currentYtheta > this.maxYTheta) this.currentYtheta = this.maxYTheta
        if (this.currentYtheta < this.minYTheta) this.currentYtheta = this.minYTheta
        this.prevX = x
        this.recalculateView()
    }

    calcMouseVelocity(): number[] {
        if (this.isDragging || !this.hasHover) return [0, 0]

        const [mx, my] = this.calcPlaneCoord(this.currentHoverX, this.currentHoverY)
        const [px, py] = this.calcPlaneCoord(this.prevHoverX, this.prevHoverY)
        // Scale matters here as much as direction — do not normalize.
        return [mx - px, my - py]
    }

    calcPlaneCoord(x: number, y: number): number[] {
        const normalizedX = x / this.canvas.width
        const normalizedY = y / this.canvas.height
        const ndcX = 2.0 * normalizedX - 1.0
        const ndcY = (1.0 - normalizedY) * 2.0 - 1.0

        const viewSpaceMouseRay = [
            ndcX *
                Math.tan(this.fov / 2.0) *
                (this.canvas.width / this.canvas.height),
            ndcY * Math.tan(this.fov / 2.0),
        ]

        return [
            viewSpaceMouseRay[0] * this.currentDistance,
            viewSpaceMouseRay[1] * this.currentDistance,
        ]
    }

    setNewPrevMouseCoord() {
        this.prevHoverX = this.currentHoverX
        this.prevHoverY = this.currentHoverY
    }

    stepAngle(radiansPerFrame: number) {
        this.currentXtheta += radiansPerFrame
        this.recalculateView()
    }
}

// ---------------------------------------------------------------------------
// Render uniforms — one 272-byte block, per instance.
// ---------------------------------------------------------------------------

type RenderUniformViews = {
    texel_size: Float32Array
    sphere_size: Float32Array
    inv_projection_matrix: Float32Array
    projection_matrix: Float32Array
    view_matrix: Float32Array
    inv_view_matrix: Float32Array
}

function makeRenderUniforms() {
    const values = new ArrayBuffer(272)
    const views: RenderUniformViews = {
        texel_size: new Float32Array(values, 0, 2),
        sphere_size: new Float32Array(values, 8, 2),
        inv_projection_matrix: new Float32Array(values, 16, 16),
        projection_matrix: new Float32Array(values, 80, 16),
        view_matrix: new Float32Array(values, 144, 16),
        inv_view_matrix: new Float32Array(values, 208, 16),
    }
    return { values, views }
}

// ---------------------------------------------------------------------------
// MLS-MPM simulator.
// ---------------------------------------------------------------------------

class MLSMPMSimulator {
    private maxXGrids = 80
    private maxYGrids = 80
    private maxZGrids = 80
    private cellStructSize = 16

    numParticles = 0
    gridCount = 0
    frameCount = 0
    restDensity = 4.0

    private device: GPUDevice
    private renderDiameter: number
    private views: RenderUniformViews

    private realBoxSizeBuffer: GPUBuffer
    private initBoxSizeBuffer: GPUBuffer
    private numParticlesBuffer: GPUBuffer
    private densityBuffer: GPUBuffer
    private mouseInfoUniformBuffer: GPUBuffer
    private ballRadiusBuffer: GPUBuffer
    private mouseInfoValues: ArrayBuffer

    private clearGridPipeline: GPUComputePipeline
    private spawnParticlesPipeline: GPUComputePipeline
    private p2g1Pipeline: GPUComputePipeline
    private p2g2Pipeline: GPUComputePipeline
    private updateGridPipeline: GPUComputePipeline
    private g2pPipeline: GPUComputePipeline
    private copyPositionPipeline: GPUComputePipeline

    private clearGridBindGroup: GPUBindGroup
    private spawnParticlesBindGroup: GPUBindGroup
    private p2g1BindGroup: GPUBindGroup
    private p2g2BindGroup: GPUBindGroup
    private updateGridBindGroup: GPUBindGroup
    private g2pBindGroup: GPUBindGroup
    private copyPositionBindGroup: GPUBindGroup

    constructor(
        particleBuffer: GPUBuffer,
        posvelBuffer: GPUBuffer,
        renderDiameter: number,
        device: GPUDevice,
        renderUniformBuffer: GPUBuffer,
        depthMapTextureView: GPUTextureView,
        canvas: HTMLCanvasElement,
        views: RenderUniformViews
    ) {
        this.device = device
        this.renderDiameter = renderDiameter
        this.views = views

        const mod = (code: string) => device.createShaderModule({ code })
        const clearGridModule = mod(CLEAR_GRID_WGSL)
        const spawnParticlesModule = mod(SPAWN_PARTICLES_WGSL)
        const p2g1Module = mod(P2G_1_WGSL)
        const p2g2Module = mod(P2G_2_WGSL)
        const updateGridModule = mod(UPDATE_GRID_WGSL)
        const g2pModule = mod(G2P_WGSL)
        const copyPositionModule = mod(COPY_POSITION_WGSL)

        const constants = {
            stiffness: 3.0,
            restDensity: this.restDensity,
            dynamic_viscosity: 0.1,
            dt: 0.2,
            fixed_point_multiplier: 1e7,
        }

        this.clearGridPipeline = device.createComputePipeline({
            label: "clear grid pipeline",
            layout: "auto",
            compute: { module: clearGridModule },
        })
        this.spawnParticlesPipeline = device.createComputePipeline({
            label: "spawn particles pipeline",
            layout: "auto",
            compute: { module: spawnParticlesModule },
        })
        this.p2g1Pipeline = device.createComputePipeline({
            label: "p2g 1 pipeline",
            layout: "auto",
            compute: {
                module: p2g1Module,
                constants: {
                    fixed_point_multiplier: constants.fixed_point_multiplier,
                },
            },
        })
        this.p2g2Pipeline = device.createComputePipeline({
            label: "p2g 2 pipeline",
            layout: "auto",
            compute: {
                module: p2g2Module,
                constants: {
                    fixed_point_multiplier: constants.fixed_point_multiplier,
                    stiffness: constants.stiffness,
                    rest_density: constants.restDensity,
                    dynamic_viscosity: constants.dynamic_viscosity,
                    dt: constants.dt,
                },
            },
        })
        this.updateGridPipeline = device.createComputePipeline({
            label: "update grid pipeline",
            layout: "auto",
            compute: {
                module: updateGridModule,
                constants: {
                    fixed_point_multiplier: constants.fixed_point_multiplier,
                    dt: constants.dt,
                },
            },
        })
        this.g2pPipeline = device.createComputePipeline({
            label: "g2p pipeline",
            layout: "auto",
            compute: {
                module: g2pModule,
                constants: {
                    fixed_point_multiplier: constants.fixed_point_multiplier,
                    dt: constants.dt,
                },
            },
        })
        this.copyPositionPipeline = device.createComputePipeline({
            label: "copy position pipeline",
            layout: "auto",
            compute: { module: copyPositionModule },
        })

        const maxGridCount = this.maxXGrids * this.maxYGrids * this.maxZGrids
        this.mouseInfoValues = new ArrayBuffer(32)

        const cellBuffer = device.createBuffer({
            label: "cells buffer",
            size: this.cellStructSize * maxGridCount,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })
        this.densityBuffer = device.createBuffer({
            label: "density buffer",
            size: 4 * MAX_PARTICLES,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })
        this.realBoxSizeBuffer = device.createBuffer({
            label: "real box size buffer",
            size: 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.initBoxSizeBuffer = device.createBuffer({
            label: "init box size buffer",
            size: 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.numParticlesBuffer = device.createBuffer({
            label: "number of particles buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.mouseInfoUniformBuffer = device.createBuffer({
            label: "mouse info buffer",
            size: this.mouseInfoValues.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.ballRadiusBuffer = device.createBuffer({
            label: "ball radius buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        new Float32Array(this.mouseInfoValues, 0, 2).set([
            canvas.width,
            canvas.height,
        ])
        device.queue.writeBuffer(this.mouseInfoUniformBuffer, 0, this.mouseInfoValues)

        this.clearGridBindGroup = device.createBindGroup({
            layout: this.clearGridPipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: cellBuffer } }],
        })
        this.spawnParticlesBindGroup = device.createBindGroup({
            layout: this.spawnParticlesPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: particleBuffer } },
                { binding: 1, resource: { buffer: this.initBoxSizeBuffer } },
                { binding: 2, resource: { buffer: this.numParticlesBuffer } },
                { binding: 3, resource: { buffer: this.ballRadiusBuffer } },
            ],
        })
        this.p2g1BindGroup = device.createBindGroup({
            layout: this.p2g1Pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: particleBuffer } },
                { binding: 1, resource: { buffer: cellBuffer } },
                { binding: 2, resource: { buffer: this.initBoxSizeBuffer } },
                { binding: 3, resource: { buffer: this.numParticlesBuffer } },
            ],
        })
        this.p2g2BindGroup = device.createBindGroup({
            layout: this.p2g2Pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: particleBuffer } },
                { binding: 1, resource: { buffer: cellBuffer } },
                { binding: 2, resource: { buffer: this.initBoxSizeBuffer } },
                { binding: 3, resource: { buffer: this.numParticlesBuffer } },
                { binding: 4, resource: { buffer: this.densityBuffer } },
            ],
        })
        this.updateGridBindGroup = device.createBindGroup({
            layout: this.updateGridPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: cellBuffer } },
                { binding: 1, resource: { buffer: this.realBoxSizeBuffer } },
                { binding: 2, resource: { buffer: this.initBoxSizeBuffer } },
                { binding: 3, resource: { buffer: renderUniformBuffer } },
                { binding: 4, resource: depthMapTextureView },
                { binding: 5, resource: { buffer: this.mouseInfoUniformBuffer } },
            ],
        })
        this.g2pBindGroup = device.createBindGroup({
            layout: this.g2pPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: particleBuffer } },
                { binding: 1, resource: { buffer: cellBuffer } },
                { binding: 2, resource: { buffer: this.realBoxSizeBuffer } },
                { binding: 3, resource: { buffer: this.initBoxSizeBuffer } },
                { binding: 4, resource: { buffer: this.numParticlesBuffer } },
                { binding: 5, resource: { buffer: this.ballRadiusBuffer } },
            ],
        })
        this.copyPositionBindGroup = device.createBindGroup({
            layout: this.copyPositionPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: particleBuffer } },
                { binding: 1, resource: { buffer: posvelBuffer } },
                { binding: 2, resource: { buffer: this.numParticlesBuffer } },
                { binding: 3, resource: { buffer: this.densityBuffer } },
            ],
        })
    }

    reset(initBoxSize: number[], ballRadius: number) {
        this.views.sphere_size.set([this.renderDiameter])
        const maxGridCount = this.maxXGrids * this.maxYGrids * this.maxZGrids
        this.gridCount =
            Math.ceil(initBoxSize[0]) *
            Math.ceil(initBoxSize[1]) *
            Math.ceil(initBoxSize[2])
        if (this.gridCount > maxGridCount) {
            throw new Error("gridCount should be equal to or less than maxGridCount")
        }
        this.device.queue.writeBuffer(
            this.initBoxSizeBuffer,
            0,
            new Float32Array(initBoxSize)
        )
        this.device.queue.writeBuffer(
            this.ballRadiusBuffer,
            0,
            new Float32Array([ballRadius])
        )
        this.frameCount = 0
        this.changeBoxSize(initBoxSize)
        this.changeNumParticles(0)
    }

    execute(
        commandEncoder: GPUCommandEncoder,
        mouseCoord: number[],
        mouseVel: number[],
        targetNumParticles: number,
        cursorRadius: number,
        cursorForce: number
    ) {
        const computePass = commandEncoder.beginComputePass()

        new Float32Array(this.mouseInfoValues, 8, 2).set([mouseCoord[0], mouseCoord[1]])
        new Float32Array(this.mouseInfoValues, 16, 2).set([mouseVel[0], mouseVel[1]])
        new Float32Array(this.mouseInfoValues, 24, 2).set([cursorRadius, cursorForce])
        this.device.queue.writeBuffer(
            this.mouseInfoUniformBuffer,
            0,
            this.mouseInfoValues
        )

        // The count is written to its uniform *during* encoding, so the spawn
        // shader — which runs on submit — sees the already-incremented value
        // and fills the newly claimed slots. Do not reorder these two.
        if (this.frameCount % 2 == 0 && this.numParticles < targetNumParticles) {
            computePass.setBindGroup(0, this.spawnParticlesBindGroup)
            computePass.setPipeline(this.spawnParticlesPipeline)
            computePass.dispatchWorkgroups(1)
            this.changeNumParticles(this.numParticles + 100)
        }

        for (let i = 0; i < 2; i++) {
            computePass.setBindGroup(0, this.clearGridBindGroup)
            computePass.setPipeline(this.clearGridPipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.gridCount / 64))
            computePass.setBindGroup(0, this.p2g1BindGroup)
            computePass.setPipeline(this.p2g1Pipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.numParticles / 64))
            computePass.setBindGroup(0, this.p2g2BindGroup)
            computePass.setPipeline(this.p2g2Pipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.numParticles / 64))
            computePass.setBindGroup(0, this.updateGridBindGroup)
            computePass.setPipeline(this.updateGridPipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.gridCount / 64))
            computePass.setBindGroup(0, this.g2pBindGroup)
            computePass.setPipeline(this.g2pPipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.numParticles / 64))
            computePass.setBindGroup(0, this.copyPositionBindGroup)
            computePass.setPipeline(this.copyPositionPipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.numParticles / 64))
            computePass.setBindGroup(0, this.copyPositionBindGroup)
            computePass.setPipeline(this.copyPositionPipeline)
            computePass.dispatchWorkgroups(Math.ceil(this.numParticles / 64))
        }
        computePass.end()

        this.frameCount++
    }

    changeBoxSize(realBoxSize: number[]) {
        this.device.queue.writeBuffer(
            this.realBoxSizeBuffer,
            0,
            new Float32Array(realBoxSize)
        )
    }

    changeNumParticles(numParticles: number) {
        this.device.queue.writeBuffer(
            this.numParticlesBuffer,
            0,
            new Int32Array([numParticles])
        )
        this.numParticles = numParticles
    }
}

// ---------------------------------------------------------------------------
// Screen-space fluid renderer.
// ---------------------------------------------------------------------------

class FluidRenderer {
    private device: GPUDevice

    private depthMapPipeline: GPURenderPipeline
    private depthFilterPipeline: GPURenderPipeline
    private thicknessMapPipeline: GPURenderPipeline
    private thicknessFilterPipeline: GPURenderPipeline
    private fluidPipeline: GPURenderPipeline

    private depthMapTextureView: GPUTextureView
    private tmpDepthMapTextureView: GPUTextureView
    private thicknessTextureView: GPUTextureView
    private tmpThicknessTextureView: GPUTextureView
    private depthTestTextureView: GPUTextureView

    private depthMapBindGroup: GPUBindGroup
    private depthFilterBindGroups: GPUBindGroup[]
    private thicknessMapBindGroup: GPUBindGroup
    private thicknessFilterBindGroups: GPUBindGroup[]
    private fluidBindGroup: GPUBindGroup

    private stretchStrengthBuffer: GPUBuffer
    private waterUniformBuffer: GPUBuffer

    constructor(
        device: GPUDevice,
        canvas: HTMLCanvasElement,
        presentationFormat: GPUTextureFormat,
        radius: number,
        fov: number,
        posvelBuffer: GPUBuffer,
        renderUniformBuffer: GPUBuffer,
        cubemapTextureView: GPUTextureView,
        depthMapTextureView: GPUTextureView,
        restDensity: number
    ) {
        this.device = device
        const maxFilterSize = 100
        const blurDepthScale = 10
        const diameter = 2 * radius
        const blurFilterSize = 12

        const screenConstants = {
            screenHeight: canvas.height,
            screenWidth: canvas.width,
        }
        const filterConstants = {
            depth_threshold: radius * blurDepthScale,
            max_filter_size: maxFilterSize,
            projected_particle_constant:
                (blurFilterSize * diameter * 0.05 * (canvas.height / 2)) /
                Math.tan(fov / 2),
        }
        const renderEffectConstants = {
            restDensity: restDensity,
            densitySizeScale: 4.0,
        }
        const sampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        })

        const mod = (code: string) => device.createShaderModule({ code })
        const vertexModule = mod(FULL_SCREEN_WGSL)
        const depthMapModule = mod(DEPTH_MAP_WGSL)
        const depthFilterModule = mod(BILATERAL_WGSL)
        const fluidModule = mod(FLUID_WGSL)
        const thicknessMapModule = mod(THICKNESS_MAP_WGSL)
        const thicknessFilterModule = mod(GAUSSIAN_WGSL)

        this.depthMapPipeline = device.createRenderPipeline({
            label: "depth map pipeline",
            layout: "auto",
            vertex: { module: depthMapModule, constants: renderEffectConstants },
            fragment: {
                module: depthMapModule,
                targets: [{ format: "r32float" }],
            },
            primitive: { topology: "triangle-list" },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth32float",
            },
        })
        this.depthFilterPipeline = device.createRenderPipeline({
            label: "filter pipeline",
            layout: "auto",
            vertex: { module: vertexModule, constants: screenConstants },
            fragment: {
                module: depthFilterModule,
                constants: filterConstants,
                targets: [{ format: "r32float" }],
            },
            primitive: { topology: "triangle-list" },
        })
        this.thicknessMapPipeline = device.createRenderPipeline({
            label: "thickness map pipeline",
            layout: "auto",
            vertex: { module: thicknessMapModule, constants: renderEffectConstants },
            fragment: {
                module: thicknessMapModule,
                targets: [
                    {
                        format: "r16float",
                        writeMask: GPUColorWrite.RED,
                        blend: {
                            color: {
                                operation: "add",
                                srcFactor: "one",
                                dstFactor: "one",
                            },
                            alpha: {
                                operation: "add",
                                srcFactor: "one",
                                dstFactor: "one",
                            },
                        },
                    },
                ],
            },
            primitive: { topology: "triangle-list" },
        })
        this.thicknessFilterPipeline = device.createRenderPipeline({
            label: "thickness filter pipeline",
            layout: "auto",
            vertex: { module: vertexModule, constants: screenConstants },
            fragment: {
                module: thicknessFilterModule,
                targets: [{ format: "r16float" }],
            },
            primitive: { topology: "triangle-list" },
        })
        this.fluidPipeline = device.createRenderPipeline({
            label: "fluid rendering pipeline",
            layout: "auto",
            vertex: { module: vertexModule, constants: screenConstants },
            fragment: {
                module: fluidModule,
                targets: [{ format: presentationFormat }],
            },
            primitive: { topology: "triangle-list" },
        })

        const tmpDepthMapTexture = device.createTexture({
            label: "temporary depth map texture",
            size: [canvas.width, canvas.height, 1],
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: "r32float",
        })
        const thicknessTexture = device.createTexture({
            label: "thickness map texture",
            size: [canvas.width, canvas.height, 1],
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: "r16float",
        })
        const tmpThicknessTexture = device.createTexture({
            label: "temporary thickness map texture",
            size: [canvas.width, canvas.height, 1],
            usage:
                GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: "r16float",
        })
        const depthTestTexture = device.createTexture({
            size: [canvas.width, canvas.height, 1],
            format: "depth32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        this.depthMapTextureView = depthMapTextureView
        this.tmpDepthMapTextureView = tmpDepthMapTexture.createView()
        this.thicknessTextureView = thicknessTexture.createView()
        this.tmpThicknessTextureView = tmpThicknessTexture.createView()
        this.depthTestTextureView = depthTestTexture.createView()

        const filterXUniformBuffer = device.createBuffer({
            label: "filter uniform buffer",
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        const filterYUniformBuffer = device.createBuffer({
            label: "filter uniform buffer",
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.stretchStrengthBuffer = device.createBuffer({
            label: "stretch strength buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.waterUniformBuffer = device.createBuffer({
            label: "water optics buffer",
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        device.queue.writeBuffer(filterXUniformBuffer, 0, new Float32Array([1, 0]))
        device.queue.writeBuffer(filterYUniformBuffer, 0, new Float32Array([0, 1]))

        this.depthMapBindGroup = device.createBindGroup({
            label: "depth map bind group",
            layout: this.depthMapPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: posvelBuffer } },
                { binding: 1, resource: { buffer: renderUniformBuffer } },
                { binding: 2, resource: { buffer: this.stretchStrengthBuffer } },
            ],
        })
        this.depthFilterBindGroups = [
            device.createBindGroup({
                label: "filterX bind group",
                layout: this.depthFilterPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 1, resource: this.depthMapTextureView },
                    { binding: 2, resource: { buffer: filterXUniformBuffer } },
                ],
            }),
            device.createBindGroup({
                label: "filterY bind group",
                layout: this.depthFilterPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 1, resource: this.tmpDepthMapTextureView },
                    { binding: 2, resource: { buffer: filterYUniformBuffer } },
                ],
            }),
        ]
        this.thicknessMapBindGroup = device.createBindGroup({
            label: "thickness map bind group",
            layout: this.thicknessMapPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: posvelBuffer } },
                { binding: 1, resource: { buffer: renderUniformBuffer } },
                { binding: 2, resource: { buffer: this.stretchStrengthBuffer } },
            ],
        })
        this.thicknessFilterBindGroups = [
            device.createBindGroup({
                label: "thickness filterX bind group",
                layout: this.thicknessFilterPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 1, resource: this.thicknessTextureView },
                    { binding: 2, resource: { buffer: filterXUniformBuffer } },
                ],
            }),
            device.createBindGroup({
                label: "thickness filterY bind group",
                layout: this.thicknessFilterPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 1, resource: this.tmpThicknessTextureView },
                    { binding: 2, resource: { buffer: filterYUniformBuffer } },
                ],
            }),
        ]
        this.fluidBindGroup = device.createBindGroup({
            label: "fluid bind group",
            layout: this.fluidPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: this.depthMapTextureView },
                { binding: 2, resource: { buffer: renderUniformBuffer } },
                { binding: 3, resource: this.thicknessTextureView },
                { binding: 4, resource: cubemapTextureView },
                { binding: 5, resource: { buffer: this.waterUniformBuffer } },
            ],
        })
    }

    execute(
        context: GPUCanvasContext,
        commandEncoder: GPUCommandEncoder,
        numParticles: number,
        stretchStrength: number,
        optics: WaterOptics
    ) {
        this.device.queue.writeBuffer(
            this.stretchStrengthBuffer,
            0,
            new Float32Array([stretchStrength])
        )
        this.device.queue.writeBuffer(
            this.waterUniformBuffer,
            0,
            new Float32Array([
                optics.color[0],
                optics.color[1],
                optics.color[2],
                optics.absorption,
                optics.fresnelF0,
                0,
                0,
                0,
            ])
        )

        const depthMapPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: this.depthMapTextureView,
                    clearValue: { r: 1e6, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
            depthStencilAttachment: {
                view: this.depthTestTextureView,
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            },
        }

        const depthFilterPassDescriptors: GPURenderPassDescriptor[] = [
            {
                colorAttachments: [
                    {
                        view: this.tmpDepthMapTextureView,
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            },
            {
                colorAttachments: [
                    {
                        view: this.depthMapTextureView,
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            },
        ]

        const thicknessMapPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: this.thicknessTextureView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        }

        const thicknessFilterPassDescriptors: GPURenderPassDescriptor[] = [
            {
                colorAttachments: [
                    {
                        view: this.tmpThicknessTextureView,
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            },
            {
                colorAttachments: [
                    {
                        view: this.thicknessTextureView,
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            },
        ]

        const fluidPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        }

        const depthMapPassEncoder =
            commandEncoder.beginRenderPass(depthMapPassDescriptor)
        depthMapPassEncoder.setBindGroup(0, this.depthMapBindGroup)
        depthMapPassEncoder.setPipeline(this.depthMapPipeline)
        depthMapPassEncoder.draw(6, numParticles)
        depthMapPassEncoder.end()

        for (let iter = 0; iter < 4; iter++) {
            const x = commandEncoder.beginRenderPass(depthFilterPassDescriptors[0])
            x.setBindGroup(0, this.depthFilterBindGroups[0])
            x.setPipeline(this.depthFilterPipeline)
            x.draw(6)
            x.end()
            const y = commandEncoder.beginRenderPass(depthFilterPassDescriptors[1])
            y.setBindGroup(0, this.depthFilterBindGroups[1])
            y.setPipeline(this.depthFilterPipeline)
            y.draw(6)
            y.end()
        }

        const thicknessMapPassEncoder = commandEncoder.beginRenderPass(
            thicknessMapPassDescriptor
        )
        thicknessMapPassEncoder.setBindGroup(0, this.thicknessMapBindGroup)
        thicknessMapPassEncoder.setPipeline(this.thicknessMapPipeline)
        thicknessMapPassEncoder.draw(6, numParticles)
        thicknessMapPassEncoder.end()

        for (let iter = 0; iter < 1; iter++) {
            const x = commandEncoder.beginRenderPass(
                thicknessFilterPassDescriptors[0]
            )
            x.setBindGroup(0, this.thicknessFilterBindGroups[0])
            x.setPipeline(this.thicknessFilterPipeline)
            x.draw(6)
            x.end()
            const y = commandEncoder.beginRenderPass(
                thicknessFilterPassDescriptors[1]
            )
            y.setBindGroup(0, this.thicknessFilterBindGroups[1])
            y.setPipeline(this.thicknessFilterPipeline)
            y.draw(6)
            y.end()
        }

        const fluidPassEncoder =
            commandEncoder.beginRenderPass(fluidPassDescriptor)
        fluidPassEncoder.setBindGroup(0, this.fluidBindGroup)
        fluidPassEncoder.setPipeline(this.fluidPipeline)
        fluidPassEncoder.draw(6)
        fluidPassEncoder.end()
    }
}

// ---------------------------------------------------------------------------
// Engine wiring: everything above, plus the frame loop and input.
// ---------------------------------------------------------------------------

/** Everything the fluid shader needs to know about how the water looks. */
type WaterOptics = {
    color: [number, number, number]
    absorption: number
    fresnelF0: number
}

/** Live settings, read fresh each frame so a control change never rebuilds. */
type LiveSettings = {
    detailIndex: number
    waterColor: string
    absorption: number
    fresnelF0: number
    squeeze: number
    sizePercent: number
    autoRotate: boolean
    spinSpeed: number
    cursorForce: number
}

// Any CSS colour Framer hands us — hex, rgb(), hsl() — resolved through a 1x1
// canvas, which is the one parser guaranteed to agree with the browser.
// Cached, because this is read every frame.
const colorCache = new Map<string, [number, number, number]>()

function parseColor(css: string): [number, number, number] {
    const cached = colorCache.get(css)
    if (cached) return cached

    let rgb: [number, number, number] = [0.0, 0.7375, 0.95]
    try {
        const probe = document.createElement("canvas")
        probe.width = probe.height = 1
        const g = probe.getContext("2d", { willReadFrequently: true })!
        g.fillStyle = "#000000"
        g.fillStyle = css
        g.fillRect(0, 0, 1, 1)
        const d = g.getImageData(0, 0, 1, 1).data
        rgb = [d[0] / 255, d[1] / 255, d[2] / 255]
    } catch {
        // Keep the default blue if the document is unavailable.
    }
    colorCache.set(css, rgb)
    return rgb
}

async function startWaterBall(
    canvas: HTMLCanvasElement,
    settings: { current: LiveSettings },
    onError: (message: string) => void
): Promise<() => void> {
    const teardown: (() => void)[] = []
    let disposed = false

    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
        onError("WebGPU is not supported in this browser.")
        return () => {}
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        onError("No WebGPU adapter available.")
        return () => {}
    }
    const device = await adapter.requestDevice()
    if (disposed) {
        device.destroy()
        return () => {}
    }
    teardown.push(() => device.destroy())

    const context = canvas.getContext("webgpu") as GPUCanvasContext | null
    if (!context) {
        onError("Could not create a WebGPU context.")
        return () => teardown.forEach((fn) => fn())
    }

    canvas.width = Math.max(1, Math.floor(RESOLUTION_SCALE * canvas.clientWidth))
    canvas.height = Math.max(1, Math.floor(RESOLUTION_SCALE * canvas.clientHeight))

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    // Premultiplied, so everything the fluid does not cover stays clear and
    // the component sits on whatever is behind it in the layout.
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: "premultiplied",
    })

    const sources = await loadCubemapSources()
    if (disposed) {
        teardown.forEach((fn) => fn())
        return () => {}
    }

    const cubemapTexture = device.createTexture({
        dimension: "2d",
        size: [sources[0].width, sources[0].height, 6],
        format: "rgba8unorm",
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
    })
    sources.forEach((source, i) => {
        device.queue.copyExternalImageToTexture(
            { source: source as any },
            { texture: cubemapTexture, origin: [0, 0, i] },
            [source.width, source.height]
        )
    })
    const cubemapTextureView = cubemapTexture.createView({ dimension: "cube" })

    const { values: renderUniformsValues, views: renderUniformsViews } =
        makeRenderUniforms()
    renderUniformsViews.texel_size.set([1.0 / canvas.width, 1.0 / canvas.height])

    const particleBuffer = device.createBuffer({
        label: "particles buffer",
        size: PARTICLE_STRUCT_SIZE * MAX_PARTICLES,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    const posvelBuffer = device.createBuffer({
        label: "position buffer",
        size: 32 * MAX_PARTICLES,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    const renderUniformBuffer = device.createBuffer({
        label: "render uniform buffer",
        size: renderUniformsValues.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const depthMapTexture = device.createTexture({
        label: "depth map texture",
        size: [canvas.width, canvas.height, 1],
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        format: "r32float",
    })
    const depthMapTextureView = depthMapTexture.createView()

    const particleDiameter = 2 * PARTICLE_RADIUS
    const simulator = new MLSMPMSimulator(
        particleBuffer,
        posvelBuffer,
        particleDiameter,
        device,
        renderUniformBuffer,
        depthMapTextureView,
        canvas,
        renderUniformsViews
    )
    const renderer = new FluidRenderer(
        device,
        canvas,
        presentationFormat,
        PARTICLE_RADIUS,
        FOV,
        posvelBuffer,
        renderUniformBuffer,
        cubemapTextureView,
        depthMapTextureView,
        simulator.restDensity
    )

    const camera = new Camera(canvas, renderUniformsViews)

    // Input. Coordinates are taken relative to the canvas rect so the
    // component works anywhere on a page, not only full-bleed.
    const localCoords = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect()
        return [e.clientX - rect.left, e.clientY - rect.top]
    }
    const onMouseDown = (e: MouseEvent) => {
        const [x, y] = localCoords(e)
        camera.isDragging = true
        camera.prevX = x
        camera.prevY = y
    }
    const onMouseMove = (e: MouseEvent) => {
        const [x, y] = localCoords(e)
        camera.currentHoverX = x
        camera.currentHoverY = y
        if (!camera.hasHover) {
            camera.prevHoverX = x
            camera.prevHoverY = y
            camera.hasHover = true
        }
        if (camera.isDragging) camera.drag(x)
    }
    const onMouseUp = () => {
        camera.isDragging = false
    }
    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        camera.zoom(e.deltaY)
    }
    canvas.addEventListener("mousedown", onMouseDown)
    canvas.addEventListener("mousemove", onMouseMove)
    canvas.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("mouseup", onMouseUp)
    teardown.push(() => {
        canvas.removeEventListener("mousedown", onMouseDown)
        canvas.removeEventListener("mousemove", onMouseMove)
        canvas.removeEventListener("wheel", onWheel)
        window.removeEventListener("mouseup", onMouseUp)
    })

    let detailIndex = -1
    let boxSize = BOX_SIZES[1]
    let liveBoxSize = [...boxSize]
    let squeezeRatio = 1.0
    let appliedSize = -1
    let raf = 0

    const frame = () => {
        if (disposed) return
        const s = settings.current

        if (s.detailIndex !== detailIndex) {
            detailIndex = s.detailIndex
            boxSize = BOX_SIZES[detailIndex]
            simulator.reset(boxSize, BALL_RADII[detailIndex])
            camera.reset(
                CAMERA_DISTANCES[detailIndex],
                [boxSize[0] / 2, boxSize[1] / 2, boxSize[2] / 2],
                FOV,
                ZOOM_RATE
            )
            liveBoxSize = [...boxSize]
            squeezeRatio = 1.0
            appliedSize = -1
        }

        if (s.sizePercent !== appliedSize) {
            appliedSize = s.sizePercent
            camera.setDistance(CAMERA_DISTANCES[detailIndex] * (100 / appliedSize))
        }

        // The wall is moved toward its target at a limited rate: closing fast
        // enough to outrun the fluid would tunnel particles through it.
        const targetRatio = s.squeeze / 200 + 0.5
        const minClosingSpeed = -0.01
        const maxOpeningSpeed = 0.04
        let step = Math.max(targetRatio - squeezeRatio, minClosingSpeed)
        step = Math.min(step, maxOpeningSpeed)
        squeezeRatio += step

        liveBoxSize[2] = boxSize[2] * squeezeRatio
        simulator.changeBoxSize(liveBoxSize)
        device.queue.writeBuffer(renderUniformBuffer, 0, renderUniformsValues)

        const commandEncoder = device.createCommandEncoder()

        simulator.execute(
            commandEncoder,
            [
                camera.currentHoverX / canvas.clientWidth,
                camera.currentHoverY / canvas.clientHeight,
            ],
            camera.calcMouseVelocity(),
            PARTICLE_COUNTS[detailIndex],
            CURSOR_RADII[detailIndex],
            s.cursorForce
        )
        renderer.execute(
            context,
            commandEncoder,
            simulator.numParticles,
            STRETCH_STRENGTHS[detailIndex],
            {
                color: parseColor(s.waterColor),
                absorption: s.absorption,
                fresnelF0: s.fresnelF0,
            }
        )

        device.queue.submit([commandEncoder.finish()])

        camera.setNewPrevMouseCoord()
        if (s.autoRotate) camera.stepAngle(s.spinSpeed)

        raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    teardown.push(() => cancelAnimationFrame(raf))

    device.lost.then((info) => {
        if (!disposed)
            onError(info.reason ? `Device lost: ${info.reason}` : "Device lost.")
    })

    return () => {
        disposed = true
        teardown.reverse().forEach((fn) => fn())
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// One source of truth for every default. The sliders are whole numbers and are
// mapped to their effective values below, so nothing in the panel reads as a
// float with six decimal places.
const DEFAULTS = {
    waterColor: "#ACE8FF",
    tint: 20,
    reflection: 20,
    detail: "small",
    squeeze: 100,
    size: 100,
    autoRotate: false,
    spinSpeed: 12,
    cursorForce: 20,
}

type Detail = "small" | "medium" | "large"

const DETAIL_INDEX: Record<Detail, number> = { small: 0, medium: 1, large: 2 }

interface WaterBallProps {
    waterColor?: string
    tint?: number
    reflection?: number
    detail?: Detail
    squeeze?: number
    size?: number
    autoRotate?: boolean
    spinSpeed?: number
    cursorForce?: number
    style?: React.CSSProperties
}

export default function WaterBall(props: WaterBallProps) {
    const {
        waterColor = DEFAULTS.waterColor,
        tint = DEFAULTS.tint,
        reflection = DEFAULTS.reflection,
        detail = DEFAULTS.detail as Detail,
        squeeze = DEFAULTS.squeeze,
        size = DEFAULTS.size,
        autoRotate = DEFAULTS.autoRotate,
        spinSpeed = DEFAULTS.spinSpeed,
        cursorForce = DEFAULTS.cursorForce,
        style,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Mapped once per render into the shape the frame loop wants; the loop reads
    // this ref, so turning a knob never restarts the simulation.
    const settings = useRef<LiveSettings>(null as unknown as LiveSettings)
    settings.current = {
        detailIndex: DETAIL_INDEX[detail] ?? 1,
        waterColor,
        absorption: tint / 10,
        fresnelF0: reflection / 100,
        squeeze,
        sizePercent: size,
        autoRotate,
        spinSpeed: spinSpeed / 1000,
        cursorForce: cursorForce / 100,
    }

    // Every pipeline bakes the screen size in as an override constant and every
    // offscreen texture is allocated at it, so a resize means a full rebuild.
    // Debounced, since a drag-resize would otherwise rebuild every frame.
    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        let timer: ReturnType<typeof setTimeout>
        const ro = new ResizeObserver((entries) => {
            const r = entries[0].contentRect
            clearTimeout(timer)
            timer = setTimeout(() => {
                setCanvasSize({ w: Math.round(r.width), h: Math.round(r.height) })
            }, 200)
        })
        ro.observe(host)
        const r = host.getBoundingClientRect()
        setCanvasSize({ w: Math.round(r.width), h: Math.round(r.height) })
        return () => {
            clearTimeout(timer)
            ro.disconnect()
        }
    }, [])

    useEffect(() => {
        if (!canvasSize || canvasSize.w < 2 || canvasSize.h < 2) return
        const canvas = canvasRef.current
        if (!canvas) return

        setError(null)
        let stop: (() => void) | null = null
        let cancelled = false

        startWaterBall(canvas, settings, setError).then((fn) => {
            if (cancelled) fn()
            else stop = fn
        })

        return () => {
            cancelled = true
            stop?.()
        }
    }, [canvasSize?.w, canvasSize?.h])

    return (
        <div
            ref={hostRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block" }}
            />
            {error && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        textAlign: "center",
                        font: "13px/1.5 system-ui, sans-serif",
                        color: "#8A8A94",
                    }}
                >
                    {error}
                </div>
            )}
        </div>
    )
}
