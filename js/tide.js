/**
 * 潮汐调和推算内核 —— 完全离线
 *
 * 潮位模型（Schureman）：
 *   h(t) = Z0 + Σ f_i · H_i · cos( V_i(t) + u_i − g_i )
 *
 * V 是平衡潮引数，由 6 个天文角线性组合而成：
 *   τ = 15°·UT + h − s    （平太阴时角）
 *   s  月球平黄经 / h 太阳平黄经 / p 月球近地点 / N 升交点 / p1 太阳近地点
 *
 * 数据来源两种：
 *   1) 权威调和常数（NOAA 等）—— 直接代入，精度即为官方精度
 *   2) 从实测/预报序列做最小二乘反演 —— 用于把任意潮位曲线变成可离线外推的模型
 *
 * 浏览器版：挂载到全局 GT 命名空间，依赖 GT.astro。
 */
(function (GT) {
  'use strict'

  const astro = GT.astro
  const RAD = Math.PI / 180

  const CONSTITUENTS = [
    { name: 'M2', speed: 28.9841042, c: [2, 0, 0, 0, 0, 0], group: 'M2' },
    { name: 'S2', speed: 30.0, c: [2, 2, -2, 0, 0, 0], group: 'S2' },
    { name: 'N2', speed: 28.4397295, c: [2, -1, 0, 1, 0, 0], group: 'M2' },
    { name: 'K2', speed: 30.0821373, c: [2, 2, 0, 0, 0, 0], group: 'K2' },
    { name: 'K1', speed: 15.0410686, c: [1, 1, 0, 0, 0, 0], group: 'K1' },
    { name: 'O1', speed: 13.9430356, c: [1, -1, 0, 0, 0, 0], group: 'O1' },
    { name: 'P1', speed: 14.9589314, c: [1, 1, -2, 0, 0, 0], group: 'P1' },
    { name: 'Q1', speed: 13.3986609, c: [1, -2, 0, 1, 0, 0], group: 'O1' },
    { name: 'M4', speed: 57.9682084, c: [4, 0, 0, 0, 0, 0], group: 'M4' },
    { name: 'MS4', speed: 58.9841042, c: [4, 2, -2, 0, 0, 0], group: 'MS4' },
    { name: '2N2', speed: 27.8953548, c: [2, -2, 0, 2, 0, 0], group: 'M2' },
    { name: 'MU2', speed: 27.9682084, c: [2, -2, 2, 0, 0, 0], group: 'M2' },
    { name: 'L2', speed: 29.5284789, c: [2, 1, 0, -1, 0, 0], group: 'M2' },
    { name: 'J1', speed: 15.5854435, c: [1, 2, 0, -1, 0, 0], group: 'O1' },
    { name: 'M1', speed: 14.4966939, c: [1, 0, 0, 1, 0, 0], group: 'O1' },
    { name: 'S1', speed: 15.0, c: [1, 1, -1, 0, 0, 0], group: 'P1' },
    { name: '2Q1', speed: 12.8542862, c: [1, -3, 0, 2, 0, 0], group: 'O1' }
  ]

  const BY_NAME = {}
  CONSTITUENTS.forEach((c) => {
    BY_NAME[c.name] = c
  })

  const FIT_SET = ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1', 'M4', 'MS4']

  /* ------------------------------------------------------------------ */
  /* 天文引数                                                            */
  /* ------------------------------------------------------------------ */

  function astroArgs(jd) {
    const T = (jd - 2451545.0) / 36525
    const h = 280.46646 + 36000.76983 * T
    const s = 218.3164477 + 481267.88123421 * T
    const p = 83.3532465 + 4069.0137287 * T
    const N = 125.044555 - 1934.1361849 * T
    const p1 = 282.93734 + 1.71945766667 * T
    const ut = (((jd + 0.5) % 1) + 1) % 1
    const tau = 15 * udeg(ut) + h - s
    return { tau: tau, s: s, h: h, p: p, N: N, p1: p1 }
  }

  function udeg(fractionOfDay) {
    return fractionOfDay * 24
  }

  function equilibriumArgument(c, args) {
    return (
      c.c[0] * args.tau +
      c.c[1] * args.s +
      c.c[2] * args.h +
      c.c[3] * args.p +
      c.c[4] * args.N +
      c.c[5] * args.p1
    )
  }

  function nodeFactor(group, Ndeg) {
    const N = Ndeg * RAD
    const cosN = Math.cos(N)
    const cos2N = Math.cos(2 * N)
    const cos3N = Math.cos(3 * N)
    const sinN = Math.sin(N)
    const sin2N = Math.sin(2 * N)
    const sin3N = Math.sin(3 * N)

    switch (group) {
      case 'M2': {
        const f = 1.0004 - 0.0373 * cosN + 0.0002 * cos2N
        const u = -2.14 * sinN
        return { f: f, u: u }
      }
      case 'K1': {
        const f =
          1.006 + 0.115 * cosN - 0.0088 * cos2N + 0.0006 * cos3N
        const u = -8.86 * sinN + 0.68 * sin2N - 0.07 * sin3N
        return { f: f, u: u }
      }
      case 'O1': {
        const f =
          1.0089 + 0.1871 * cosN - 0.0147 * cos2N + 0.0014 * cos3N
        const u = 10.8 * sinN - 1.34 * sin2N + 0.19 * sin3N
        return { f: f, u: u }
      }
      case 'K2': {
        const f =
          1.0241 + 0.2863 * cosN + 0.0083 * cos2N - 0.0015 * cos3N
        const u = -17.74 * sinN + 0.68 * sin2N - 0.04 * sin3N
        return { f: f, u: u }
      }
      case 'M4': {
        const m = nodeFactor('M2', Ndeg)
        return { f: m.f * m.f, u: 2 * m.u }
      }
      case 'MS4': {
        return nodeFactor('M2', Ndeg)
      }
      default:
        return { f: 1, u: 0 }
    }
  }

  /* ------------------------------------------------------------------ */
  /* 正演                                                                */
  /* ------------------------------------------------------------------ */

  function predictAt(model, ms) {
    const jd = astro.jdFromMs(ms)
    const args = astroArgs(jd)
    const N = args.N
    let h = model.z0 || 0
    const list = model.constituents
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const def = BY_NAME[item.name]
      if (!def) continue
      const V = equilibriumArgument(def, args)
      const nu = nodeFactor(def.group, N)
      h +=
        nu.f *
        item.amplitude *
        Math.cos((V + nu.u - item.phase) * RAD)
    }
    return h
  }

  function predictSeries(opts) {
    const stepMs = opts.stepMin * 60000
    const out = new Array(opts.count)
    for (let i = 0; i < opts.count; i++) {
      const t = opts.startMs + i * stepMs
      out[i] = { t: t, h: predictAt(opts.model, t) }
    }
    return out
  }

  /* ------------------------------------------------------------------ */
  /* 极值与插值                                                          */
  /* ------------------------------------------------------------------ */

  function findExtremes(series) {
    const out = []
    const n = series.length
    for (let i = 1; i < n - 1; i++) {
      const a = series[i - 1].h
      const b = series[i].h
      const c = series[i + 1].h
      const isHigh = b > a && b >= c
      const isLow = b < a && b <= c
      if (!isHigh && !isLow) continue

      const denom = a - 2 * b + c
      let offset = 0
      if (Math.abs(denom) > 1e-9) {
        offset = (0.5 * (a - c)) / denom
        if (offset > 0.5) offset = 0.5
        if (offset < -0.5) offset = -0.5
      }
      const step = series[i + 1].t - series[i].t
      out.push({
        ms: series[i].t + offset * step,
        h: b - 0.25 * (a - c) * offset,
        type: isHigh ? 'high' : 'low'
      })
    }
    return out
  }

  function heightAt(series, ms) {
    if (!series.length) return null
    if (ms <= series[0].t) return series[0].h
    const last = series[series.length - 1]
    if (ms >= last.t) return last.h
    const step = series[1].t - series[0].t
    const idx = Math.floor((ms - series[0].t) / step)
    const a = series[idx]
    const b = series[idx + 1] || last
    const span = b.t - a.t
    if (span <= 0) return a.h
    const r = (ms - a.t) / span
    return a.h + (b.h - a.h) * r
  }

  function stateAt(series, ms) {
    const a = heightAt(series, ms - 6 * 60000)
    const b = heightAt(series, ms + 6 * 60000)
    if (a === null || b === null) return 'unknown'
    if (b - a > 0.005) return 'rising'
    if (b - a < -0.005) return 'falling'
    return 'slack'
  }

  function nearestExtreme(extremes, ms, dir) {
    if (dir === 'next') {
      for (let i = 0; i < extremes.length; i++) {
        if (extremes[i].ms > ms) return extremes[i]
      }
    } else {
      for (let i = extremes.length - 1; i >= 0; i--) {
        if (extremes[i].ms < ms) return extremes[i]
      }
    }
    return null
  }

  /* ------------------------------------------------------------------ */
  /* 最小二乘反演：把一段潮位序列变成调和常数                             */
  /* ------------------------------------------------------------------ */

  function solveLinear(A, b) {
    const n = b.length
    const M = []
    for (let i = 0; i < n; i++) {
      M.push(A[i].slice())
      M[i].push(b[i])
    }
    for (let col = 0; col < n; col++) {
      let pivot = col
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r
      }
      if (Math.abs(M[pivot][col]) < 1e-12) return null
      if (pivot !== col) {
        const tmp = M[pivot]
        M[pivot] = M[col]
        M[col] = tmp
      }
      const pv = M[col][col]
      for (let r = col + 1; r < n; r++) {
        const factor = M[r][col] / pv
        if (factor === 0) continue
        for (let c = col; c <= n; c++) {
          M[r][c] -= factor * M[col][c]
        }
      }
    }
    const x = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      let sum = M[i][n]
      for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j]
      x[i] = sum / M[i][i]
    }
    return x
  }

  function fitSeries(series, names) {
    const list = (names || FIT_SET)
      .map((n) => BY_NAME[n])
      .filter(Boolean)
    if (!series || series.length < list.length * 4) return null

    const t0 = series[0].t
    const rows = series.length
    const cols = 1 + list.length * 2

    const AtA = []
    for (let i = 0; i < cols; i++) AtA.push(new Array(cols).fill(0))
    const Atb = new Array(cols).fill(0)

    const jd0 = astro.jdFromMs(t0)
    const args0 = astroArgs(jd0)
    const nu = list.map((c) => nodeFactor(c.group, args0.N))

    const design = new Array(rows)
    for (let r = 0; r < rows; r++) {
      const hours = (series[r].t - t0) / 3600000
      const row = new Array(cols)
      row[0] = 1
      let k = 1
      for (let j = 0; j < list.length; j++) {
        const ang = (equilibriumArgument(list[j], args0) + nu[j].u + list[j].speed * hours) * RAD
        row[k++] = Math.cos(ang)
        row[k++] = Math.sin(ang)
      }
      design[r] = row
    }

    for (let r = 0; r < rows; r++) {
      const row = design[r]
      const y = series[r].h
      for (let i = 0; i < cols; i++) {
        Atb[i] += row[i] * y
        for (let j = i; j < cols; j++) AtA[i][j] += row[i] * row[j]
      }
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < i; j++) AtA[i][j] = AtA[j][i]
    }

    const x = solveLinear(AtA, Atb)
    if (!x) return null

    const z0 = x[0]
    const constituents = []
    for (let j = 0; j < list.length; j++) {
      const a = x[1 + j * 2]
      const b = x[2 + j * 2]
      constituents.push({
        name: list[j].name,
        amplitude: Math.sqrt(a * a + b * b),
        phase: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
      })
    }

    const model = { z0: z0, constituents: constituents }
    let sse = 0
    for (let r = 0; r < rows; r++) {
      const d = series[r].h - predictAt(model, series[r].t)
      sse += d * d
    }

    return {
      z0: z0,
      constituents: constituents,
      rms: Math.sqrt(sse / rows)
    }
  }

  /* ------------------------------------------------------------------ */
  /* 无数据时的先验模型                                                  */
  /* ------------------------------------------------------------------ */

  function synthesizeModel(opts) {
    const lat = Math.abs(opts.lat || 30)
    const meanRange = opts.meanRange || (lat > 40 ? 2.4 : lat > 20 ? 1.8 : 1.2)

    const semi = Math.max(0.55, Math.min(0.92, 1.0 - lat / 120))
    const m2 = (meanRange / 2) * semi * 0.82
    const s2 = m2 * 0.24
    const n2 = m2 * 0.19
    const k2 = m2 * 0.07
    const k1 = (meanRange / 2) * (1 - semi) * 0.9 + m2 * 0.08
    const o1 = k1 * 0.72
    const p1 = k1 * 0.33

    const base = (opts.phaseHint || 0) % 360

    const mk = (name, amplitude, phase) => ({
      name: name,
      amplitude: amplitude,
      phase: (phase + base + 720) % 360
    })

    return {
      z0: 0,
      estimated: true,
      constituents: [
        mk('M2', m2, 0),
        mk('S2', s2, 20),
        mk('N2', n2, -20),
        mk('K2', k2, 20),
        mk('K1', k1, 90),
        mk('O1', o1, 90),
        mk('P1', p1, 90)
      ]
    }
  }

  GT.tide = {
    CONSTITUENTS: CONSTITUENTS,
    BY_NAME: BY_NAME,
    FIT_SET: FIT_SET,
    astroArgs: astroArgs,
    equilibriumArgument: equilibriumArgument,
    nodeFactor: nodeFactor,
    predictAt: predictAt,
    predictSeries: predictSeries,
    findExtremes: findExtremes,
    heightAt: heightAt,
    stateAt: stateAt,
    nearestExtreme: nearestExtreme,
    fitSeries: fitSeries,
    synthesizeModel: synthesizeModel
  }
})(window.GT = window.GT || {})
