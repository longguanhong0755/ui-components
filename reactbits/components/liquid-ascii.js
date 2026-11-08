/* ReactBits Pro public preview module 74230 for liquid-ascii.
 * Extracted from https://pro.reactbits.dev/_next/static/chunks/74230.f15ea2e4bbecdb1f.js
 * This is the compiled browser implementation, not the original TSX. */

const module = {
  74230: (t, e, s) => {
    (s.r(e), s.d(e, { default: () => d }));
    var i = s(95155),
      r = s(12115),
      l = s(30701),
      o = s(56388),
      a = s(90761),
      n = s(90650);
    function h(t, e, s) {
      return t < e ? e : t > s ? s : t;
    }
    class u {
      constructor(t, e, s, i, r, l) {
        ((this.medium = t),
          (this.gx = Math.floor(e / i)),
          (this.gy = Math.floor(s / i)),
          (this.step = Math.max(e / this.gx, s / this.gy)),
          (this.invStep = 1 / this.step),
          (this.totalCells = this.gx * this.gy),
          (this.hx = new Float32Array(this.totalCells)),
          (this.hy = new Float32Array(this.totalCells)),
          (this.dhx = new Float32Array(this.totalCells)),
          (this.dhy = new Float32Array(this.totalCells)),
          (this.oldHx = new Float32Array(this.totalCells)),
          (this.oldHy = new Float32Array(this.totalCells)),
          (this.tension = new Float32Array(this.totalCells)),
          (this.wall = new Float32Array(this.totalCells)),
          (this.kind = new Int32Array(this.totalCells)),
          (this.shade = new Float32Array(3 * this.totalCells)),
          (this.maxParts = l),
          (this.pos = new Float32Array(2 * l)),
          (this.vel = new Float32Array(2 * l)),
          (this.partDensity = new Float32Array(this.totalCells)),
          (this.restDensity = 0),
          (this.pRad = r),
          (this.pInvH = 1 / (2.2 * r)),
          (this.pNx = Math.floor(e * this.pInvH) + 1),
          (this.pNy = Math.floor(s * this.pInvH) + 1),
          (this.pTotal = this.pNx * this.pNy),
          (this.bucketCount = new Int32Array(this.pTotal)),
          (this.bucketStart = new Int32Array(this.pTotal + 1)),
          (this.bucketIds = new Int32Array(l)),
          (this.count = 0));
      }
      push(t, e) {
        for (let s = 0; s < this.count; s++)
          ((this.vel[2 * s + 1] += t * e),
            (this.pos[2 * s] += this.vel[2 * s] * t),
            (this.pos[2 * s + 1] += this.vel[2 * s + 1] * t));
      }
      separate(t) {
        this.bucketCount.fill(0);
        for (let t = 0; t < this.count; t++) {
          let e = h(Math.floor(this.pos[2 * t] * this.pInvH), 0, this.pNx - 1),
            s = h(
              Math.floor(this.pos[2 * t + 1] * this.pInvH),
              0,
              this.pNy - 1,
            );
          this.bucketCount[e * this.pNy + s]++;
        }
        let e = 0;
        for (let t = 0; t < this.pTotal; t++)
          ((e += this.bucketCount[t]), (this.bucketStart[t] = e));
        this.bucketStart[this.pTotal] = e;
        for (let t = 0; t < this.count; t++) {
          let e = h(Math.floor(this.pos[2 * t] * this.pInvH), 0, this.pNx - 1),
            s = h(
              Math.floor(this.pos[2 * t + 1] * this.pInvH),
              0,
              this.pNy - 1,
            ),
            i = e * this.pNy + s;
          (this.bucketStart[i]--, (this.bucketIds[this.bucketStart[i]] = t));
        }
        let s = 2 * this.pRad,
          i = s * s;
        for (let e = 0; e < t; e++)
          for (let t = 0; t < this.count; t++) {
            let e = this.pos[2 * t],
              r = this.pos[2 * t + 1],
              l = Math.floor(e * this.pInvH),
              o = Math.floor(r * this.pInvH),
              a = Math.max(l - 1, 0),
              n = Math.max(o - 1, 0),
              h = Math.min(l + 1, this.pNx - 1),
              u = Math.min(o + 1, this.pNy - 1);
            for (let l = a; l <= h; l++)
              for (let o = n; o <= u; o++) {
                let a = l * this.pNy + o,
                  n = this.bucketStart[a],
                  h = this.bucketStart[a + 1];
                for (let l = n; l < h; l++) {
                  let o = this.bucketIds[l];
                  if (o === t) continue;
                  let a = this.pos[2 * o] - e,
                    n = this.pos[2 * o + 1] - r,
                    h = a * a + n * n;
                  if (h > i || 0 === h) continue;
                  let u = Math.sqrt(h),
                    c = (0.5 * (s - u)) / u;
                  ((a *= c),
                    (n *= c),
                    (this.pos[2 * t] -= a),
                    (this.pos[2 * t + 1] -= n),
                    (this.pos[2 * o] += a),
                    (this.pos[2 * o + 1] += n));
                }
              }
          }
      }
      clampWalls() {
        let t = 1 / this.invStep,
          e = this.pRad,
          s = t + e,
          i = (this.gx - 1) * t - e,
          r = t + e,
          l = (this.gy - 1) * t - e;
        for (let t = 0; t < this.count; t++) {
          let e = this.pos[2 * t],
            o = this.pos[2 * t + 1];
          (e < s && ((e = s), (this.vel[2 * t] = 0)),
            e > i && ((e = i), (this.vel[2 * t] = 0)),
            o < r && ((o = r), (this.vel[2 * t + 1] = 0)),
            o > l && ((o = l), (this.vel[2 * t + 1] = 0)),
            (this.pos[2 * t] = e),
            (this.pos[2 * t + 1] = o));
        }
      }
      impulse(t, e, s, i, r) {
        if (r <= 0) return;
        let l = r * r,
          o = Math.sqrt(s * s + i * i),
          a = s,
          n = i;
        o > 2 && ((a = (s / o) * 2), (n = (i / o) * 2));
        for (let s = 0; s < this.count; s++) {
          let i = this.pos[2 * s] - t,
            o = this.pos[2 * s + 1] - e,
            h = i * i + o * o;
          if (h < l && h > 1e-4) {
            let t = 1 - Math.sqrt(h) / r,
              e = t * t;
            ((this.vel[2 * s] += a * e), (this.vel[2 * s + 1] += n * e));
          }
        }
      }
      measureDensity() {
        let t = this.gy,
          e = this.step,
          s = this.invStep,
          i = 0.5 * e,
          r = this.partDensity;
        r.fill(0);
        for (let l = 0; l < this.count; l++) {
          let o = h(this.pos[2 * l], e, (this.gx - 1) * e),
            a = h(this.pos[2 * l + 1], e, (this.gy - 1) * e),
            n = Math.floor((o - i) * s),
            u = (o - i - n * e) * s,
            c = Math.min(n + 1, this.gx - 2),
            d = Math.floor((a - i) * s),
            p = (a - i - d * e) * s,
            f = Math.min(d + 1, this.gy - 2),
            m = 1 - u,
            y = 1 - p;
          (n < this.gx && d < this.gy && (r[n * t + d] += m * y),
            c < this.gx && d < this.gy && (r[c * t + d] += u * y),
            c < this.gx && f < this.gy && (r[c * t + f] += u * p),
            n < this.gx && f < this.gy && (r[n * t + f] += m * p));
        }
        if (0 === this.restDensity) {
          let t = 0,
            e = 0;
          for (let s = 0; s < this.totalCells; s++)
            0 === this.kind[s] && ((t += r[s]), e++);
          e > 0 && (this.restDensity = t / e);
        }
      }
      gridTransfer(t, e) {
        let s = this.gy,
          i = this.step,
          r = this.invStep,
          l = 0.5 * i;
        if (t) {
          (this.oldHx.set(this.hx),
            this.oldHy.set(this.hy),
            this.dhx.fill(0),
            this.dhy.fill(0),
            this.hx.fill(0),
            this.hy.fill(0));
          for (let t = 0; t < this.totalCells; t++)
            this.kind[t] = 0 === this.wall[t] ? 2 : 1;
          for (let t = 0; t < this.count; t++) {
            let e = h(Math.floor(this.pos[2 * t] * r), 0, this.gx - 1),
              i = h(Math.floor(this.pos[2 * t + 1] * r), 0, this.gy - 1);
            1 === this.kind[e * s + i] && (this.kind[e * s + i] = 0);
          }
        }
        for (let o = 0; o < 2; o++) {
          let a = 0 === o ? 0 : l,
            n = 0 === o ? l : 0,
            u = 0 === o ? this.hx : this.hy,
            c = 0 === o ? this.oldHx : this.oldHy,
            d = 0 === o ? this.dhx : this.dhy;
          for (let l = 0; l < this.count; l++) {
            let p = h(this.pos[2 * l], i, (this.gx - 1) * i),
              f = h(this.pos[2 * l + 1], i, (this.gy - 1) * i),
              m = Math.min(Math.floor((p - a) * r), this.gx - 2),
              y = (p - a - m * i) * r,
              v = Math.min(m + 1, this.gx - 2),
              g = Math.min(Math.floor((f - n) * r), this.gy - 2),
              x = (f - n - g * i) * r,
              C = Math.min(g + 1, this.gy - 2),
              b = (1 - y) * (1 - x),
              w = y * (1 - x),
              k = y * x,
              M = (1 - y) * x,
              S = m * s + g,
              F = v * s + g,
              I = v * s + C,
              j = m * s + C;
            if (t) {
              let t = this.vel[2 * l + o];
              ((u[S] += t * b),
                (d[S] += b),
                (u[F] += t * w),
                (d[F] += w),
                (u[I] += t * k),
                (d[I] += k),
                (u[j] += t * M),
                (d[j] += M));
            } else {
              let t = 0 === o ? s : 1,
                i = +(1 !== this.kind[S] || 1 !== this.kind[S - t]),
                r = +(1 !== this.kind[F] || 1 !== this.kind[F - t]),
                a = +(1 !== this.kind[I] || 1 !== this.kind[I - t]),
                n = +(1 !== this.kind[j] || 1 !== this.kind[j - t]),
                h = i * b + r * w + a * k + n * M;
              if (h > 0) {
                let t =
                    (i * b * u[S] +
                      r * w * u[F] +
                      a * k * u[I] +
                      n * M * u[j]) /
                    h,
                  s =
                    (i * b * (u[S] - c[S]) +
                      r * w * (u[F] - c[F]) +
                      a * k * (u[I] - c[I]) +
                      n * M * (u[j] - c[j])) /
                    h,
                  d = this.vel[2 * l + o] + s;
                this.vel[2 * l + o] = (1 - e) * t + e * d;
              }
            }
          }
          if (t) {
            for (let t = 0; t < u.length; t++) d[t] > 0 && (u[t] /= d[t]);
            for (let t = 0; t < this.gx; t++)
              for (let e = 0; e < this.gy; e++) {
                let i = 2 === this.kind[t * s + e];
                ((i || (t > 0 && 2 === this.kind[(t - 1) * s + e])) &&
                  (this.hx[t * s + e] = this.oldHx[t * s + e]),
                  (i || (e > 0 && 2 === this.kind[t * s + e - 1])) &&
                    (this.hy[t * s + e] = this.oldHy[t * s + e]));
              }
          }
        }
      }
      solvePressure(t, e, s, i) {
        (this.tension.fill(0),
          this.oldHx.set(this.hx),
          this.oldHy.set(this.hy));
        let r = this.gy,
          l = (this.medium * this.step) / e;
        for (let e = 0; e < t; e++)
          for (let t = 1; t < this.gx - 1; t++)
            for (let e = 1; e < this.gy - 1; e++) {
              if (0 !== this.kind[t * r + e]) continue;
              let o = t * r + e,
                a = (t - 1) * r + e,
                n = (t + 1) * r + e,
                h = t * r + e - 1,
                u = t * r + e + 1,
                c = this.wall[a],
                d = this.wall[n],
                p = this.wall[h],
                f = this.wall[u],
                m = c + d + p + f;
              if (0 === m) continue;
              let y = this.hx[n] - this.hx[o] + this.hy[u] - this.hy[o];
              if (this.restDensity > 0 && i) {
                let t = this.partDensity[o] - this.restDensity;
                t > 0 && (y -= t);
              }
              let v = (-y / m) * s;
              ((this.tension[o] += l * v),
                (this.hx[o] -= c * v),
                (this.hx[n] += d * v),
                (this.hy[o] -= p * v),
                (this.hy[u] += f * v));
            }
      }
      computeShade() {
        this.shade.fill(0);
        for (let t = 0; t < this.totalCells; t++)
          if (2 === this.kind[t])
            ((this.shade[3 * t] = 0.5),
              (this.shade[3 * t + 1] = 0.5),
              (this.shade[3 * t + 2] = 0.5));
          else if (0 === this.kind[t]) {
            let e = this.partDensity[t];
            this.restDensity > 0 && (e /= this.restDensity);
            let s = h(e, 0, 1.9999),
              i = Math.floor(s / 0.25),
              r = (s - 0.25 * i) / 0.25,
              l = i % 2 == 0 ? r : 1 - r;
            ((this.shade[3 * t] = l),
              (this.shade[3 * t + 1] = l),
              (this.shade[3 * t + 2] = l));
          }
      }
      tick(t, e, s, i, r, l) {
        (this.push(t, e),
          this.separate(r),
          this.clampWalls(),
          this.gridTransfer(!0, s),
          this.measureDensity(),
          this.solvePressure(i, t, l, !0),
          this.gridTransfer(!1, s),
          this.computeShade());
      }
    }
    let c = ({
      width: t = "100%",
      height: e = "100%",
      className: s,
      children: l,
      speed: o = 0.9,
      cellSize: a = 15,
      gravity: h = -25,
      flipRatio: c = 0.3,
      pressureIters: d = 30,
      separationIters: p = 3,
      overRelaxation: f = 1.5,
      fillHeight: m = 0.4,
      cursorRadius: y = 0.25,
      cursorForce: v = 66,
      characters: g = " \xb7:-~=+*#%@",
      color: x = "#ffffff",
      backgroundColor: C = "#000000",
      fontFamily: b = "monospace",
      opacity: w = 1,
      autoWave: k = !0,
    }) => {
      let M = (0, r.useRef)(null),
        S = (0, r.useRef)(null),
        F = (0, r.useRef)(null),
        I = (0, r.useRef)({
          cursorX: -999,
          cursorY: -999,
          cursorVX: 0,
          cursorVY: 0,
          lastMoveTime: 0,
          autoTime: 0,
          cols: 0,
          rows: 0,
          simH: 2,
          scale: 1,
          letterSpacing: 0,
        }),
        j = (0, r.useRef)({
          speed: o,
          gravity: h,
          flipRatio: c,
          pressureIters: d,
          separationIters: p,
          overRelaxation: f,
          fillHeight: m,
          cursorRadius: y,
          cursorForce: v,
          characters: g,
          color: x,
          backgroundColor: C,
          fontFamily: b,
          opacity: w,
          cellSize: a,
          autoWave: k,
        });
      (0, r.useEffect)(() => {
        j.current = {
          speed: o,
          gravity: h,
          flipRatio: c,
          pressureIters: d,
          separationIters: p,
          overRelaxation: f,
          fillHeight: m,
          cursorRadius: y,
          cursorForce: v,
          characters: g,
          color: x,
          backgroundColor: C,
          fontFamily: b,
          opacity: w,
          cellSize: a,
          autoWave: k,
        };
      }, [o, h, c, d, p, f, m, y, v, g, x, C, b, w, a, k]);
      let H = (0, r.useCallback)(() => {
        let t = M.current;
        if (!t) return;
        let e = t.getBoundingClientRect(),
          s = j.current.cellSize,
          i = document.createElement("canvas").getContext("2d"),
          r = 0.6 * s;
        if (i) {
          i.font = `${s}px ${j.current.fontFamily}`;
          let t = i.measureText("@");
          t.width > 0 && (r = t.width);
        }
        let l = s - r,
          o = Math.ceil(e.width / s) + 4,
          a = Math.ceil(e.height / s) + 4,
          n = (a * s) / 2,
          h = (o * s) / n,
          c = 2 / a,
          d = 0.3 * c,
          p = 2 * d,
          f = (Math.sqrt(3) / 2) * p,
          m = j.current.fillHeight,
          y = Math.floor((h - 2 * c - 2 * d) / p),
          v = Math.floor((2 * m - 2 * c - 2 * d) / f),
          g = y * v,
          x = new u(1e3, h, 2, c, d, g);
        x.count = g;
        let C = 0,
          b = (h - y * p) / 2;
        for (let t = 0; t < y; t++)
          for (let e = 0; e < v; e++)
            ((x.pos[C++] = c + d + p * t + (e % 2 == 0 ? 0 : d) + b),
              (x.pos[C++] = c + d + f * e + 0));
        let w = x.gy;
        for (let t = 0; t < x.gx; t++)
          for (let e = 0; e < x.gy; e++) {
            let s = 1;
            ((0 === t || t === x.gx - 1 || 0 === e || e === x.gy - 1) &&
              (s = 0),
              (x.wall[t * w + e] = s));
          }
        F.current = x;
        let k = I.current;
        ((k.cols = o),
          (k.rows = a),
          (k.simH = 2),
          (k.scale = n),
          (k.letterSpacing = l));
      }, []);
      return (
        (0, r.useEffect)(() => {
          H();
          let t = M.current;
          if (!t) return;
          let e = new ResizeObserver(() => H());
          return (e.observe(t), () => e.disconnect());
        }, [H, a, m]),
        (0, r.useEffect)(() => {
          let t = M.current;
          if (!t) return;
          let e = (e, s) => {
              let i,
                r,
                l,
                o,
                a = I.current,
                { x: n, y: h } =
                  ((i = t.getBoundingClientRect()),
                  (r = I.current),
                  (l = e - i.left),
                  (o = s - i.top),
                  {
                    x: l / r.scale,
                    y: (r.rows * j.current.cellSize - o) / r.scale,
                  });
              (a.cursorX > -900 &&
                ((a.cursorVX += n - a.cursorX), (a.cursorVY += h - a.cursorY)),
                (a.cursorX = n),
                (a.cursorY = h),
                (a.lastMoveTime = performance.now()));
            },
            s = () => {
              let t = I.current;
              ((t.cursorX = -999),
                (t.cursorY = -999),
                (t.cursorVX = 0),
                (t.cursorVY = 0));
            },
            i = (t) => e(t.clientX, t.clientY),
            r = (t) => {
              (t.preventDefault(),
                e(t.touches[0].clientX, t.touches[0].clientY));
            };
          return (
            t.addEventListener("mousemove", i),
            t.addEventListener("mouseleave", s),
            t.addEventListener("touchstart", r, { passive: !1 }),
            t.addEventListener("touchmove", r, { passive: !1 }),
            t.addEventListener("touchend", s),
            () => {
              (t.removeEventListener("mousemove", i),
                t.removeEventListener("mouseleave", s),
                t.removeEventListener("touchstart", r),
                t.removeEventListener("touchmove", r),
                t.removeEventListener("touchend", s));
            }
          );
        }, []),
        (0, r.useEffect)(() => {
          let t = S.current;
          if (!t) return;
          let e = 0,
            s = () => {
              let i = F.current,
                r = I.current,
                l = j.current;
              if (!i) {
                e = requestAnimationFrame(s);
                return;
              }
              let o = (1 / 120) * l.speed;
              if (r.cursorX > -900) {
                let t = r.cursorVX * l.cursorForce,
                  e = r.cursorVY * l.cursorForce,
                  s = Math.min(i.gx * i.step, i.gy * i.step),
                  o = l.cursorRadius * s;
                i.impulse(r.cursorX, r.cursorY, t, e, o);
              }
              ((r.cursorVX = 0), (r.cursorVY = 0));
              let a = performance.now() - r.lastMoveTime;
              if (l.autoWave && a > 2e3) {
                r.autoTime += o;
                let t = r.autoTime,
                  e = i.gx * i.step,
                  s = i.gy * i.step,
                  n = Math.min(e, s),
                  h = l.cursorRadius * n * 1.5,
                  u = e * (0.5 + 0.35 * Math.sin(0.7 * t)),
                  c = s * (0.3 + 0.15 * Math.sin(1.1 * t)),
                  d = 0.35 * Math.cos(0.7 * t) * e * 0.7,
                  p = 0.15 * Math.cos(1.1 * t) * s * 1.1,
                  f = Math.min((a - 2e3) / 1e3, 1) * l.cursorForce * 0.4;
                i.impulse(u, c, d * f, p * f, h);
              } else r.autoTime = 0;
              i.tick(
                o,
                l.gravity,
                l.flipRatio,
                l.pressureIters,
                l.separationIters,
                l.overRelaxation,
              );
              let n = l.characters,
                h = n.length,
                u = i.gy,
                c = "",
                d = i.gx - 1,
                p = u - 2;
              for (let t = p; t > 0; t--) {
                let e = "";
                for (let s = 1; s < d; s++)
                  e +=
                    n[
                      Math.min(Math.floor(i.shade[3 * (s * u + t)] * h), h - 1)
                    ];
                c += e + "\n";
              }
              ((t.textContent = c),
                (t.style.color = l.color),
                (t.style.backgroundColor = l.backgroundColor),
                (t.style.fontFamily = l.fontFamily),
                (t.style.opacity = String(l.opacity)),
                (t.style.fontSize = l.cellSize + "px"),
                (t.style.lineHeight = l.cellSize + "px"),
                (t.style.letterSpacing = r.letterSpacing + "px"),
                (e = requestAnimationFrame(s)));
            };
          return (
            (e = requestAnimationFrame(s)),
            () => cancelAnimationFrame(e)
          );
        }, []),
        (0, i.jsxs)("div", {
          ref: M,
          className: (0, n.cn)("relative overflow-hidden cursor-pointer", s),
          style: { width: t, height: e, backgroundColor: C },
          children: [
            (0, i.jsx)("pre", {
              ref: S,
              className:
                "absolute inset-0 m-0 p-0 overflow-hidden select-none whitespace-pre",
              style: {
                fontFamily: b,
                fontSize: `${a}px`,
                lineHeight: `${a}px`,
                letterSpacing: "0px",
                color: x,
                opacity: w,
              },
            }),
            l &&
              (0, i.jsx)("div", {
                className: "pointer-events-none relative z-10",
                children: l,
              }),
          ],
        })
      );
    };
    c.displayName = "LiquidAscii";
    let d = () => {
      let [t, e] = (0, a.I)(),
        { resolvedTheme: s } = (0, l.D)(),
        [n, h] = (0, r.useState)(0.9),
        [u, d] = (0, r.useState)(15),
        [p, f] = (0, r.useState)(-25),
        [m, y] = (0, r.useState)(0.3),
        [v, g] = (0, r.useState)(30),
        [x, C] = (0, r.useState)(3),
        [b, w] = (0, r.useState)(1.5),
        [k, M] = (0, r.useState)(0.4),
        [S, F] = (0, r.useState)(0.25),
        [I, j] = (0, r.useState)(66),
        [H, N] = (0, r.useState)(!0),
        [R, A] = (0, r.useState)(1),
        [T, E] = (0, r.useState)(null),
        [D, P] = (0, r.useState)(null),
        X = (0, r.useMemo)(
          () => (null !== T ? T : "dark" === s ? "#ffffff" : "#000000"),
          [s, T],
        ),
        L = (0, r.useMemo)(
          () => (null !== D ? D : "dark" === s ? "#0a0a0a" : "#FFFFFF"),
          [s, D],
        );
      return (0, i.jsxs)("div", {
        children: [
          (0, i.jsx)(o.Bg, {}),
          (0, i.jsxs)(o.VX, {
            children: [
              (0, i.jsxs)(o.Ec, {
                children: [
                  (0, i.jsx)(o.Ch, {
                    onRefresh: e,
                    children: (0, i.jsx)("div", {
                      className: "relative h-full w-full",
                      children: (0, i.jsx)(
                        c,
                        {
                          width: "100%",
                          height: "100%",
                          speed: n,
                          cellSize: u,
                          gravity: p,
                          flipRatio: m,
                          pressureIters: v,
                          separationIters: x,
                          overRelaxation: b,
                          fillHeight: k,
                          cursorRadius: S,
                          cursorForce: I,
                          color: X,
                          backgroundColor: L,
                          opacity: R,
                          autoWave: H,
                        },
                        t,
                      ),
                    }),
                  }),
                  (0, i.jsxs)(o.IH, {
                    children: [
                      (0, i.jsx)(o.yt, {
                        title: "Speed",
                        value: n,
                        onChange: h,
                        min: 0.1,
                        max: 3,
                        step: 0.01,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Cell Size",
                        value: u,
                        onChange: d,
                        min: 6,
                        max: 30,
                        step: 1,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Gravity",
                        value: p,
                        onChange: f,
                        min: -50,
                        max: 0,
                        step: 1,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "FLIP Ratio",
                        value: m,
                        onChange: y,
                        min: 0,
                        max: 1,
                        step: 0.01,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Fill Height",
                        value: k,
                        onChange: M,
                        min: 0.1,
                        max: 1,
                        step: 0.05,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Over-Relaxation",
                        value: b,
                        onChange: w,
                        min: 1,
                        max: 2,
                        step: 0.01,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Cursor Radius",
                        value: S,
                        onChange: F,
                        min: 0,
                        max: 0.5,
                        step: 0.01,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Cursor Force",
                        value: I,
                        onChange: j,
                        min: 0,
                        max: 200,
                        step: 1,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Pressure Iters",
                        value: v,
                        onChange: g,
                        min: 5,
                        max: 80,
                        step: 1,
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Separation Iters",
                        value: x,
                        onChange: C,
                        min: 1,
                        max: 10,
                        step: 1,
                      }),
                      (0, i.jsx)(o.tl, {
                        title: "Auto Wave",
                        checked: H,
                        onChange: N,
                      }),
                      (0, i.jsx)(o.W7, {
                        title: "Text Color",
                        value: X,
                        onChange: (t) => E(t),
                      }),
                      (0, i.jsx)(o.W7, {
                        title: "Background",
                        value: L,
                        onChange: (t) => P(t),
                      }),
                      (0, i.jsx)(o.yt, {
                        title: "Opacity",
                        value: R,
                        onChange: A,
                        min: 0,
                        max: 1,
                        step: 0.05,
                      }),
                    ],
                  }),
                  (0, i.jsx)(o.Ub, {
                    data: [
                      {
                        name: "width",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container width",
                      },
                      {
                        name: "height",
                        type: "string | number",
                        default: '"100%"',
                        description: "Container height",
                      },
                      {
                        name: "className",
                        type: "string",
                        default: '""',
                        description: "Additional CSS classes for styling",
                      },
                      {
                        name: "children",
                        type: "ReactNode",
                        default: "undefined",
                        description: "Content rendered above the effect",
                      },
                      {
                        name: "speed",
                        type: "number",
                        default: "0.9",
                        description: "Simulation timestep multiplier (0.1–3)",
                      },
                      {
                        name: "cellSize",
                        type: "number",
                        default: "15",
                        description: "Character cell size in pixels (6–30)",
                      },
                      {
                        name: "gravity",
                        type: "number",
                        default: "-25",
                        description:
                          "Gravity strength (negative = downward, 0 = zero-g) (-50–0)",
                      },
                      {
                        name: "flipRatio",
                        type: "number",
                        default: "0.3",
                        description:
                          "FLIP vs PIC blending ratio (0=PIC, 1=FLIP)",
                      },
                      {
                        name: "pressureIters",
                        type: "number",
                        default: "30",
                        description:
                          "Number of pressure solver iterations (5–80)",
                      },
                      {
                        name: "separationIters",
                        type: "number",
                        default: "3",
                        description:
                          "Number of particle separation passes (1–10)",
                      },
                      {
                        name: "overRelaxation",
                        type: "number",
                        default: "1.5",
                        description:
                          "Over-relaxation factor for pressure solve (1–2)",
                      },
                      {
                        name: "fillHeight",
                        type: "number",
                        default: "0.4",
                        description: "Fill fraction of the tank (0–1)",
                      },
                      {
                        name: "cursorRadius",
                        type: "number",
                        default: "0.25",
                        description:
                          "Radius of mouse influence as fraction of short side (0–0.5)",
                      },
                      {
                        name: "cursorForce",
                        type: "number",
                        default: "66",
                        description: "Strength of cursor push force (0–200)",
                      },
                      {
                        name: "characters",
                        type: "string",
                        default: '" \xb7:-~=+*#%@"',
                        description:
                          "Characters ordered by visual weight (light to heavy)",
                      },
                      {
                        name: "color",
                        type: "string",
                        default: '"#ffffff"',
                        description: "Text color (hex)",
                      },
                      {
                        name: "backgroundColor",
                        type: "string",
                        default: '"#000000"',
                        description: "Background color (hex)",
                      },
                      {
                        name: "fontFamily",
                        type: "string",
                        default: '"monospace"',
                        description: "Font family for rendering",
                      },
                      {
                        name: "opacity",
                        type: "number",
                        default: "1",
                        description: "Master opacity (0–1)",
                      },
                      {
                        name: "autoWave",
                        type: "boolean",
                        default: "true",
                        description: "Auto-animate waves when cursor is idle",
                      },
                    ],
                  }),
                ],
              }),
              (0, i.jsx)(o.lT, { children: (0, i.jsx)(o.Gv, {}) }),
            ],
          }),
        ],
      });
    };
  },
};
