/**
 * 绘图：潮汐曲线 + 月相
 * 纯函数，接收 Canvas 2D 上下文（浏览器 canvas 接口一致）。
 * 浏览器版：挂载到全局 GT 命名空间，依赖 GT.format / GT.units。
 */
(function (GT) {
  'use strict'

  const fmt = GT.format
  const units = GT.units

  function niceStep(range) {
    const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10]
    for (let i = 0; i < candidates.length; i++) {
      if (range / candidates[i] <= 5) return candidates[i]
    }
    return 10
  }

  const COLOR = {
    grid: 'rgba(232,241,239,0.07)',
    axis: 'rgba(232,241,239,0.16)',
    label: '#7c959b',
    tide: '#4fc3b0',
    tideFill: 'rgba(79,195,176,0.13)',
    beacon: '#f0b429',
    extremeHigh: '#e8f1ef',
    extremeLow: '#7c959b'
  }

  function drawTideChart(ctx, opts) {
    const W = opts.W
    const H = opts.H
    const series = opts.series
    if (!series || series.length < 2) return

    const t0 = opts.viewStart
    const t1 = opts.viewEnd
    const span = t1 - t0

    let hMin = Infinity
    let hMax = -Infinity
    for (let i = 0; i < series.length; i++) {
      const h = series[i].h
      if (h < hMin) hMin = h
      if (h > hMax) hMax = h
    }
    let pad = (hMax - hMin) * 0.18
    if (pad < 0.25) pad = 0.25
    hMin -= pad
    hMax += pad
    const step = niceStep(hMax - hMin)
    const gridMin = Math.floor(hMin / step) * step
    const gridMax = Math.ceil(hMax / step) * step
    const hRange = gridMax - gridMin || 1

    const L = 6
    const R = W - 8
    const T = 30
    const B = H - 26
    const plotW = R - L
    const plotH = B - T

    const x = (ms) => L + ((ms - t0) / span) * plotW
    const y = (h) => T + (1 - (h - gridMin) / hRange) * plotH

    /* ---- 水平网格 + 高度刻度 ---- */
    ctx.font = '10px -apple-system, "PingFang SC", sans-serif'
    ctx.textBaseline = 'middle'
    for (let v = gridMin; v <= gridMax + 1e-9; v += step) {
      const yy = y(v)
      ctx.strokeStyle = COLOR.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(L, yy)
      ctx.lineTo(R, yy)
      ctx.stroke()
      ctx.fillStyle = COLOR.label
      ctx.textAlign = 'left'
      const txt = (opts.heightUnit === 'ft' ? v * 3.28084 : v).toFixed(step < 1 ? 1 : 0)
      ctx.fillText(txt, L + 2, yy - 7)
    }

    /* ---- 时间轴 ---- */
    ctx.textBaseline = 'top'
    for (let hh = 0; hh <= 24; hh += 3) {
      const ms = t0 + hh * 3600000
      const xx = x(ms)
      ctx.strokeStyle = hh % 6 === 0 ? COLOR.axis : COLOR.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(xx, T)
      ctx.lineTo(xx, B)
      ctx.stroke()
      if (hh % 6 === 0) {
        ctx.fillStyle = COLOR.label
        ctx.textAlign = 'center'
        ctx.fillText(String(hh), xx, B + 6)
      }
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(L, T, plotW, plotH)
    ctx.clip()

    /* ---- 曲线 + 下方填充 ---- */
    ctx.beginPath()
    ctx.moveTo(x(series[0].t), y(series[0].h))
    for (let i = 1; i < series.length; i++) {
      ctx.lineTo(x(series[i].t), y(series[i].h))
    }
    ctx.strokeStyle = COLOR.tide
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.lineTo(x(series[series.length - 1].t), B)
    ctx.lineTo(x(series[0].t), B)
    ctx.closePath()
    ctx.fillStyle = COLOR.tideFill
    ctx.fill()

    ctx.restore()

    /* ---- 涨退潮极值 ---- */
    const extremes = (opts.extremes || []).filter((e) => e.ms >= t0 && e.ms <= t1)
    ctx.font = '10px -apple-system, "PingFang SC", sans-serif'
    for (let i = 0; i < extremes.length; i++) {
      const e = extremes[i]
      const xx = x(e.ms)
      const yy = y(e.h)
      const v = opts.heightUnit === 'ft' ? e.h * 3.28084 : e.h
      const isHigh = e.type === 'high'

      ctx.beginPath()
      ctx.arc(xx, yy, 3, 0, Math.PI * 2)
      if (isHigh) {
        ctx.fillStyle = COLOR.extremeHigh
        ctx.fill()
      } else {
        ctx.fillStyle = '#071a20'
        ctx.fill()
        ctx.strokeStyle = COLOR.extremeLow
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      const label = fmt.hhmm(e.ms, opts.station || opts.offsetHours)
      const val = v.toFixed(2)
      ctx.fillStyle = COLOR.label
      ctx.textAlign = 'center'
      ctx.fillText(val, xx, isHigh ? yy - 14 : yy + 8)
      ctx.fillText(label, xx, isHigh ? yy - 2 : yy + 20)
    }

    /* ---- 此刻 ---- */
    if (opts.nowMs && opts.nowMs >= t0 && opts.nowMs <= t1) {
      const xx = x(opts.nowMs)
      ctx.strokeStyle = COLOR.beacon
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(xx, T)
      ctx.lineTo(xx, B)
      ctx.stroke()
      ctx.setLineDash([])

      const nowH = heightAt(series, opts.nowMs)
      const yy = y(nowH)
      ctx.beginPath()
      ctx.arc(xx, yy, 4, 0, Math.PI * 2)
      ctx.fillStyle = COLOR.beacon
      ctx.fill()
      ctx.strokeStyle = '#071a20'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    /* ---- 触摸游标 ---- */
    if (opts.cursor && opts.cursor.ms >= t0 && opts.cursor.ms <= t1) {
      const xx = x(opts.cursor.ms)
      ctx.strokeStyle = 'rgba(232,241,239,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(xx, T)
      ctx.lineTo(xx, B)
      ctx.stroke()

      const hh = heightAt(series, opts.cursor.ms)
      const yy = y(hh)
      ctx.beginPath()
      ctx.arc(xx, yy, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = '#e8f1ef'
      ctx.fill()

      if (opts.readout) {
        drawReadout(ctx, xx, T + 6, opts.readout, opts.heightUnit)
      }
    }
  }

  function drawReadout(ctx, cx, top, readout, heightUnit) {
    const line1 = readout.time
    const line2 = readout.height + (heightUnit === 'ft' ? ' ft' : ' m') + ' · ' + readout.state
    ctx.font = '11px -apple-system, "PingFang SC", sans-serif'

    const w = 128
    const h = 36
    let bx = cx - w / 2
    if (bx < 4) bx = 4

    ctx.fillStyle = 'rgba(7,26,32,0.92)'
    ctx.strokeStyle = 'rgba(232,241,239,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    roundRect(ctx, bx, top, w, h, 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#e8f1ef'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(line1, bx + w / 2, top + 6)
    ctx.fillStyle = '#4fc3b0'
    ctx.fillText(line2, bx + w / 2, top + 20)
    ctx.textBaseline = 'middle'
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function heightAt(series, ms) {
    if (!series.length) return 0
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

  /* ---------------- 月相 ---------------- */

  function drawMoon(ctx, x, y, r, phase, opts) {
    opts = opts || {}
    const waxing = phase < 0.5
    const frac = (1 - Math.cos(2 * Math.PI * phase)) / 2

    const lit = opts.lit || '#e8f1ef'
    const dark = opts.dark || 'rgba(232,241,239,0.10)'
    const border = opts.border || 'rgba(232,241,239,0.25)'

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = dark
    ctx.fill()
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.stroke()

    if (frac <= 0.004) return
    if (frac >= 0.996) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = lit
      ctx.fill()
      return
    }

    const e = r * (2 * frac - 1)
    const halfPi = Math.PI / 2

    ctx.beginPath()

    if (waxing) {
      ctx.arc(x, y, r, -halfPi, halfPi, false)
      terminatorArc(ctx, x, y, r, Math.abs(e), halfPi, -halfPi, false)
    } else {
      ctx.arc(x, y, r, -halfPi, halfPi, true)
      terminatorArc(ctx, x, y, r, Math.abs(e), halfPi, -halfPi, true)
    }

    ctx.closePath()
    ctx.fillStyle = lit
    ctx.fill()
  }

  function terminatorArc(ctx, x, y, r, rx, startA, endA, anticlockwise) {
    if (rx < 0.02 * r) {
      ctx.lineTo(x, y - r * (startA > 0 ? 1 : -1))
      return
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(rx / r, 1)
    ctx.arc(0, 0, r, startA, endA, anticlockwise)
    ctx.restore()
  }

  GT.draw = {
    drawTideChart: drawTideChart,
    niceStep: niceStep,
    drawMoon: drawMoon
  }
})(window.GT = window.GT || {})
