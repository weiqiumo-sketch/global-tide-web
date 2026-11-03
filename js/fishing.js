/**
 * 黄金钓鱼时间算法
 *
 * 思路：把「什么时候鱼口好」拆成几个可以独立量化、又能说清道理的环境因子，
 * 加权后给出 0–100 的活跃度，再把连续的高分窗口挑出来作为建议时段。
 *
 *   潮汐动能 40  —— 涨落越快鱼越活跃，平潮最差（权重最高）
 *   太阴时段 15  —— 月中天、月下中天（大时段）与月出月落（小时段）
 *   月相潮型 15  —— 朔望大潮水流强，上下弦小潮水流弱
 *   气压变化 10  —— 平稳或缓升最好，骤降骤升都差
 *   风力     10  —— 2–3 级有波纹最好，无风和大风都差
 *   水温      5  —— 15–25℃ 最适
 *   晨昏      5  —— 日出日落前后
 *
 * 这是经验模型，不是物理模型。界面上必须标明它是参考值。
 * 浏览器版：挂载到全局 GT 命名空间（无外部依赖）。
 */
(function (GT) {
  'use strict'

  const WEIGHTS = {
    tide: 40,
    solunar: 15,
    moon: 15,
    pressure: 10,
    wind: 10,
    sst: 5,
    dawn: 5
  }

  const LEVELS = [
    { min: 85, key: 'excellent', text: '极佳' },
    { min: 72, key: 'good', text: '好' },
    { min: 58, key: 'fair', text: '一般' },
    { min: 44, key: 'poor', text: '较差' },
    { min: 0, key: 'bad', text: '差' }
  ]

  function levelOf(score) {
    for (let i = 0; i < LEVELS.length; i++) {
      if (score >= LEVELS[i].min) return LEVELS[i]
    }
    return LEVELS[4]
  }

  function clamp01(v) {
    if (v === null || v === undefined || isNaN(v)) return null
    return Math.max(0, Math.min(1, v))
  }

  function pick(env, ms, field) {
    if (!env || !env.rows || !env.rows.length) return null
    const idx = Math.round((ms - env.base) / env.step)
    if (idx < 0 || idx >= env.rows.length) return null
    const v = env.rows[idx][field]
    return v === undefined ? null : v
  }

  /* ------------------------------------------------------------------ */
  /* 各因子打分（0–1）                                                    */
  /* ------------------------------------------------------------------ */

  function tideScore(rate, maxRate) {
    if (maxRate <= 0.001) return 0.2
    const r = Math.min(1, Math.abs(rate) / maxRate)
    return 0.15 + 0.85 * Math.pow(r, 0.7)
  }

  function solunarScore(ms, moon) {
    let best = 0.12
    const majors = [moon.transit, moon.underfoot]
    for (let i = 0; i < majors.length; i++) {
      if (!majors[i]) continue
      const d = Math.abs(ms - majors[i]) / 60000
      if (d <= 60) best = Math.max(best, 1 - (d / 60) * 0.6)
    }
    const minors = [moon.rise, moon.set]
    for (let i = 0; i < minors.length; i++) {
      if (!minors[i]) continue
      const d = Math.abs(ms - minors[i]) / 60000
      if (d <= 30) best = Math.max(best, 0.78 - (d / 30) * 0.45)
    }
    return best
  }

  function moonScore(phase) {
    const spring = Math.abs(Math.cos(phase * 2 * Math.PI))
    return 0.35 + 0.65 * spring
  }

  function pressureScore(delta6h) {
    if (delta6h === null || delta6h === undefined) return 0.6
    if (delta6h <= -6) return 0.2
    if (delta6h <= -2) return 0.55
    if (delta6h <= 1) return 0.88
    if (delta6h <= 4) return 1
    return 0.6
  }

  function windScore(kmh) {
    if (kmh === null || kmh === undefined) return 0.6
    if (kmh < 3) return 0.55
    if (kmh < 8) return 0.75
    if (kmh <= 25) return 1
    if (kmh <= 35) return 0.7
    if (kmh <= 50) return 0.35
    return 0.05
  }

  function sstScore(c) {
    if (c === null || c === undefined) return 0.6
    if (c >= 16 && c <= 24) return 1
    if (c >= 12 && c < 16) return 0.78
    if (c > 24 && c <= 28) return 0.75
    if (c >= 8 && c < 12) return 0.45
    if (c > 28 && c <= 31) return 0.45
    return 0.2
  }

  function dawnScore(ms, sun) {
    if (!sun || (!sun.rise && !sun.set)) return 0.2
    let best = 0.1
    const marks = [sun.rise, sun.set]
    for (let i = 0; i < marks.length; i++) {
      if (!marks[i]) continue
      const d = Math.abs(ms - marks[i]) / 60000
      if (d <= 45) best = Math.max(best, 1)
      else if (d <= 90) best = Math.max(best, 0.7)
      else if (d <= 150) best = Math.max(best, 0.35)
    }
    return best
  }

  /* ------------------------------------------------------------------ */
  /* 因子文案                                                            */
  /* ------------------------------------------------------------------ */

  function tideNote(rate, state) {
    const r = Math.abs(rate)
    const dir = state === 'rising' ? '涨潮' : state === 'falling' ? '退潮' : '平潮'
    if (r < 0.06) return dir + '转流，水几乎不动'
    if (r < 0.2) return dir + '中，水流平缓'
    if (r < 0.45) return dir + '中，水流顺畅'
    return dir + '中，水流很急'
  }

  function solunarNote(ms, moon) {
    const marks = [
      { t: moon.transit, txt: '月中天' },
      { t: moon.underfoot, txt: '月下中天' },
      { t: moon.rise, txt: '月出' },
      { t: moon.set, txt: '月落' }
    ]
    let best = null
    let bestD = Infinity
    marks.forEach((m) => {
      if (!m.t) return
      const d = Math.abs(ms - m.t)
      if (d < bestD) {
        bestD = d
        best = m.txt
      }
    })
    if (!best) return '太阴时段不可用'
    const mins = Math.round(bestD / 60000)
    if (mins <= 45) return '正处' + best + '前后'
    if (mins <= 120) return best + '后 ' + mins + ' 分'
    return '距' + best + ' ' + Math.round(mins / 60) + ' 小时'
  }

  function moonNote(phase, age) {
    const spring = Math.abs(Math.cos(phase * 2 * Math.PI))
    const kind = spring > 0.75 ? '大潮' : spring > 0.4 ? '中潮' : '小潮'
    return '月龄 ' + age.toFixed(1) + ' 天，' + kind
  }

  function pressureNote(delta) {
    if (delta === null) return '暂无气压数据'
    if (delta <= -6) return '气压骤降 ' + delta.toFixed(1) + ' hPa'
    if (delta <= -2) return '气压缓降 ' + delta.toFixed(1) + ' hPa'
    if (delta <= 1) return '气压平稳'
    if (delta <= 4) return '气压缓升 +' + delta.toFixed(1) + ' hPa'
    return '气压骤升 +' + delta.toFixed(1) + ' hPa'
  }

  /* ------------------------------------------------------------------ */
  /* 主分析                                                              */
  /* ------------------------------------------------------------------ */

  function analyseDay(ctx) {
    const HALF = 30 * 60000
    const points = []
    const dayEnd = ctx.dayEnd || ctx.dayStart + 24 * 3600000
    const pointCount = Math.round((dayEnd - ctx.dayStart) / HALF)
    const rateAt = (ms) => {
      const a = tideAt(ctx.series, ms - HALF)
      const b = tideAt(ctx.series, ms + HALF)
      if (a === null || b === null) return 0
      return b - a
    }

    let maxRate = 0
    for (let i = 0; i < pointCount; i++) {
      const ms = ctx.dayStart + i * HALF
      const r = rateAt(ms)
      if (Math.abs(r) > maxRate) maxRate = Math.abs(r)
      points.push({ ms: ms, rate: r })
    }

    const scored = points.map((p) => {
      const weatherMs = p.ms
      const windVal = pick(ctx.weather, weatherMs, 'windSpeed')
      const presNow = pick(ctx.weather, weatherMs, 'pressure')
      const presBefore = pick(ctx.weather, weatherMs - 6 * 3600000, 'pressure')
      const deltaP =
        presNow === null || presBefore === null ? null : presNow - presBefore
      const sstVal = pick(ctx.marine, weatherMs, 'sst')

      const s = {
        tide: tideScore(p.rate, maxRate),
        solunar: solunarScore(p.ms, ctx.moon),
        moon: moonScore(ctx.moon.phase),
        pressure: pressureScore(deltaP),
        wind: windScore(windVal),
        sst: sstScore(sstVal),
        dawn: dawnScore(p.ms, ctx.sun)
      }

      let raw = 0
      let keys = 0
      Object.keys(WEIGHTS).forEach((k) => {
        raw += WEIGHTS[k] * s[k]
        keys++
      })
      const score = Math.round(raw)

      return {
        ms: p.ms,
        rate: p.rate,
        score: score,
        deltaP: deltaP,
        wind: windVal,
        sst: sstVal,
        tide: s.tide,
        solunar: s.solunar,
        moon: s.moon,
        pressure: s.pressure,
        windScore: s.wind,
        sstScore: s.sst,
        dawn: s.dawn
      }
    })

    const hourly = []
    for (let h = 0; h < Math.round((dayEnd - ctx.dayStart) / 3600000); h++) {
      const a = scored[h * 2]
      const b = scored[h * 2 + 1]
      hourly.push({
        hour: h,
        score: Math.max(a.score, b.score),
        rate: (a.rate + b.rate) / 2
      })
    }

    const peak = Math.max.apply(
      null,
      scored.map((s) => s.score)
    )

    const threshold = Math.max(62, peak - 10)
    const slots = []
    let runStart = -1
    for (let i = 0; i < scored.length; i++) {
      const ok = scored[i].score >= threshold
      if (ok && runStart === -1) runStart = i
      if ((!ok || i === scored.length - 1) && runStart !== -1) {
        const end = ok ? i : i - 1
        if (end - runStart >= 1) {
          let sum = 0
          for (let k = runStart; k <= end; k++) sum += scored[k].score
          slots.push({
            start: scored[runStart].ms,
            end: scored[end].ms + HALF,
            score: Math.round(sum / (end - runStart + 1))
          })
        }
        runStart = -1
      }
    }
    slots.sort((a, b) => b.score - a.score || a.start - b.start)
    const best = slots.slice(0, 2).sort((a, b) => a.start - b.start)

    const refIdx = scored.indexOf(
      scored.reduce((m, s) => (s.score > m.score ? s : m), scored[0])
    )
    const ref = scored[refIdx]
    const stateOf = (r) => (r > 0.02 ? 'rising' : r < -0.02 ? 'falling' : 'slack')

    const factors = [
      {
        key: 'tide',
        label: '潮汐',
        weight: WEIGHTS.tide,
        score: Math.round(scored[refIdx].tide * 100),
        note: tideNote(ref.rate, stateOf(ref.rate))
      },
      {
        key: 'solunar',
        label: '太阴时段',
        weight: WEIGHTS.solunar,
        score: Math.round(scored[refIdx].solunar * 100),
        note: solunarNote(ref.ms, ctx.moon)
      },
      {
        key: 'moon',
        label: '月相',
        weight: WEIGHTS.moon,
        score: Math.round(scored[refIdx].moon * 100),
        note: moonNote(ctx.moon.phase, ctx.moon.age)
      },
      {
        key: 'pressure',
        label: '气压',
        weight: WEIGHTS.pressure,
        score: Math.round(scored[refIdx].pressure * 100),
        note: pressureNote(ref.deltaP)
      },
      {
        key: 'wind',
        label: '风力',
        weight: WEIGHTS.wind,
        score: Math.round(scored[refIdx].windScore * 100),
        note:
          ref.wind === null
            ? '暂无风力数据'
            : ref.wind < 3
            ? '几乎无风，水面太静'
            : ref.wind <= 25
            ? '风力适中，水面有波纹'
            : '风力偏大，影响抛投'
      },
      {
        key: 'sst',
        label: '水温',
        weight: WEIGHTS.sst,
        score: Math.round(scored[refIdx].sstScore * 100),
        note:
          ref.sst === null
            ? '暂无水温数据'
            : ref.sst >= 16 && ref.sst <= 24
            ? '水温 ' + ref.sst.toFixed(1) + '℃，正合适'
            : '水温 ' + ref.sst.toFixed(1) + '℃，偏离适宜区间'
      },
      {
        key: 'dawn',
        label: '晨昏',
        weight: WEIGHTS.dawn,
        score: Math.round(scored[refIdx].dawn * 100),
        note:
          scored[refIdx].dawn >= 0.9
            ? '正处日出日落前后'
            : scored[refIdx].dawn >= 0.6
            ? '接近晨昏时段'
            : '不在晨昏时段'
      }
    ]

    const sorted = factors.slice().sort((a, b) => b.score * b.weight - a.score * a.weight)
    const highlights = sorted
      .filter((f) => f.score >= 70)
      .slice(0, 3)
      .map((f) => f.label + '：' + f.note)
    const cautions = sorted
      .slice()
      .reverse()
      .filter((f) => f.score < 45)
      .slice(0, 2)
      .map((f) => f.label + '：' + f.note)

    return {
      hourly: hourly,
      points: scored,
      peak: peak,
      best: best,
      threshold: threshold,
      level: levelOf(peak),
      factors: factors,
      highlights: highlights,
      cautions: cautions
    }
  }

  function tideAt(series, ms) {
    if (!series || !series.length) return null
    if (ms <= series[0].t) return series[0].h
    const last = series[series.length - 1]
    if (ms >= last.t) return last.h
    const step = series[1].t - series[0].t
    const idx = Math.floor((ms - series[0].t) / step)
    const a = series[idx]
    const b = series[idx + 1] || last
    const span = b.t - a.t
    if (span <= 0) return a.h
    return a.h + ((b.h - a.h) * (ms - a.t)) / span
  }

  GT.fishing = {
    WEIGHTS: WEIGHTS,
    LEVELS: LEVELS,
    levelOf: levelOf,
    analyseDay: analyseDay,
    tideAt: tideAt,
    clamp01: clamp01
  }
})(window.GT = window.GT || {})
