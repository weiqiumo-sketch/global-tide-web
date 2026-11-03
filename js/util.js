/**
 * 工具集：格式化 / 单位 / WMO 天气代码 / 时区
 * 浏览器版：挂载到全局 GT 命名空间（无外部依赖）。
 */
(function (GT) {
  'use strict'

  /* ================================================================
   * 格式化（按站点当地时刻输出）
   * ================================================================ */

  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n
  }

  function offsetAt(ms, offsetOrStation) {
    if (offsetOrStation && typeof offsetOrStation === 'object') {
      return offsetFor(offsetOrStation, ms)
    }
    return offsetOrStation || 0
  }

  function parts(ms, offsetHours) {
    const d = new Date(ms + offsetAt(ms, offsetHours) * 3600000)
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      date: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      weekday: d.getUTCDay(),
      dayKey:
        d.getUTCFullYear() +
        '-' +
        pad2(d.getUTCMonth() + 1) +
        '-' +
        pad2(d.getUTCDate())
    }
  }

  function calendarParts(dayKey) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey || '')
    if (!m) return null
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      date: d.getUTCDate(),
      weekday: d.getUTCDay(),
      dayKey: dayKey
    }
  }

  function hhmm(ms, offsetHours) {
    if (ms === null || ms === undefined) return '--:--'
    const p = parts(ms, offsetHours)
    return pad2(p.hour) + ':' + pad2(p.minute)
  }

  function md(ms, offsetHours) {
    const p = parts(ms, offsetHours)
    return p.month + 1 + '月' + p.date + '日'
  }

  function monthDay(ms, offsetHours) {
    const p = parts(ms, offsetHours)
    return p.month + 1 + '/' + p.date
  }

  function monthDayKey(dayKey) {
    const p = calendarParts(dayKey)
    return p ? p.month + 1 + '/' + p.date : '--/--'
  }

  function weekday(ms, offsetHours) {
    return WEEKDAYS[parts(ms, offsetHours).weekday]
  }

  function weekdayKey(dayKey) {
    const p = calendarParts(dayKey)
    return p ? WEEKDAYS[p.weekday] : '--'
  }

  function weekdayShort(dow) {
    return WEEKDAYS[dow]
  }

  function monthName(month) {
    return MONTHS[month]
  }

  function dayLabel(ms, offsetHours, nowMs) {
    if (nowMs === undefined) nowMs = Date.now()
    const a = parts(ms, offsetHours)
    const b = parts(nowMs, offsetHours)
    const diff = Math.round(
      (Date.UTC(a.year, a.month, a.date) - Date.UTC(b.year, b.month, b.date)) /
        86400000
    )
    if (diff === 0) return '今天'
    if (diff === 1) return '明天'
    if (diff === 2) return '后天'
    if (diff === -1) return '昨天'
    return a.month + 1 + '月' + a.date + '日'
  }

  function round(n, digits) {
    const f = Math.pow(10, digits === undefined ? 1 : digits)
    return Math.round(n * f) / f
  }

  function fixed(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return '--'
    return n.toFixed(digits === undefined ? 1 : digits)
  }

  function duration(ms) {
    if (!ms || ms < 0) return '--'
    const total = Math.round(ms / 60000)
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h === 0) return m + ' 分'
    return h + ' 小时 ' + (m ? m + ' 分' : '')
  }

  function relTime(ms, nowMs) {
    const diff = ms - nowMs
    const total = Math.round(Math.abs(diff) / 60000)
    const h = Math.floor(total / 60)
    const m = total % 60
    const text = h > 0 ? h + ' 小时' + (m ? ' ' + m + ' 分' : '') : m + ' 分'
    return diff >= 0 ? text + '后' : text + '前'
  }

  GT.format = {
    pad2: pad2,
    parts: parts,
    calendarParts: calendarParts,
    hhmm: hhmm,
    md: md,
    monthDay: monthDay,
    monthDayKey: monthDayKey,
    weekday: weekday,
    weekdayKey: weekdayKey,
    weekdayShort: weekdayShort,
    monthName: monthName,
    dayLabel: dayLabel,
    round: round,
    fixed: fixed,
    duration: duration,
    relTime: relTime,
    WEEKDAYS: WEEKDAYS
  }

  /* ================================================================
   * 单位换算与展示（内部统一：米 / km/h / 摄氏度 / hPa）
   * ================================================================ */

  const DEFAULTS = {
    height: 'm',
    speed: 'kmh',
    temp: 'c'
  }

  const WIND_DIRS = [
    '北', '北东北', '东北', '东东北',
    '东', '东东南', '东南', '南东南',
    '南', '南西南', '西南', '西西南',
    '西', '西西北', '西北', '北西北'
  ]

  function windDir(deg) {
    if (deg === null || deg === undefined || isNaN(deg)) return '--'
    const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16
    return WIND_DIRS[idx]
  }

  function beaufort(kmh) {
    if (kmh === null || kmh === undefined || isNaN(kmh)) return null
    const limits = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117]
    for (let i = 0; i < limits.length; i++) {
      if (kmh < limits[i]) return i
    }
    return 12
  }

  const BEAUFORT_TEXT = [
    '无风', '软风', '轻风', '微风', '和风', '清劲风',
    '强风', '疾风', '大风', '烈风', '狂风', '暴风', '飓风'
  ]

  function beaufortText(level) {
    if (level === null || level === undefined) return '--'
    return BEAUFORT_TEXT[Math.min(12, Math.max(0, level))]
  }

  function height(m, unit) {
    if (m === null || m === undefined || isNaN(m)) return null
    return unit === 'ft' ? m * 3.28084 : m
  }

  function speed(kmh, unit) {
    if (kmh === null || kmh === undefined || isNaN(kmh)) return null
    if (unit === 'ms') return kmh / 3.6
    if (unit === 'kn') return kmh / 1.852
    if (unit === 'bft') return beaufort(kmh)
    return kmh
  }

  function temp(c, unit) {
    if (c === null || c === undefined || isNaN(c)) return null
    return unit === 'f' ? (c * 9) / 5 + 32 : c
  }

  function labels(settings) {
    const s = settings || DEFAULTS
    return {
      height: s.height === 'ft' ? 'ft' : 'm',
      speed: s.speed === 'kn' ? 'kn' : s.speed === 'ms' ? 'm/s' : s.speed === 'bft' ? '级' : 'km/h',
      temp: s.temp === 'f' ? '°F' : '°C'
    }
  }

  function fmtHeight(m, settings, digits) {
    const v = height(m, (settings || DEFAULTS).height)
    if (v === null) return '--'
    return v.toFixed(digits === undefined ? 2 : digits)
  }

  function fmtSpeed(kmh, settings, digits) {
    const s = settings || DEFAULTS
    const v = speed(kmh, s.speed)
    if (v === null) return '--'
    if (s.speed === 'bft') return String(v)
    return v.toFixed(digits === undefined ? 0 : digits)
  }

  function fmtTemp(c, settings, digits) {
    const v = temp(c, (settings || DEFAULTS).temp)
    if (v === null) return '--'
    return v.toFixed(digits === undefined ? 1 : digits)
  }

  function seaCondition(windKmh, waveM, precipMm) {
    let score = 4
    if (windKmh !== null && windKmh !== undefined) {
      if (windKmh > 60) score -= 4
      else if (windKmh > 45) score -= 3
      else if (windKmh > 32) score -= 2
      else if (windKmh > 22) score -= 1
    }
    if (waveM !== null && waveM !== undefined) {
      if (waveM > 3) score -= 4
      else if (waveM > 2) score -= 3
      else if (waveM > 1.5) score -= 2
      else if (waveM > 1) score -= 1
    }
    if (precipMm !== null && precipMm !== undefined && precipMm > 2) score -= 1
    return Math.max(0, Math.min(4, score))
  }

  const SEA_TEXT = ['不宜出海', '较差', '一般', '适宜', '理想']

  GT.units = {
    DEFAULTS: DEFAULTS,
    WIND_DIRS: WIND_DIRS,
    windDir: windDir,
    beaufort: beaufort,
    beaufortText: beaufortText,
    height: height,
    speed: speed,
    temp: temp,
    labels: labels,
    fmtHeight: fmtHeight,
    fmtSpeed: fmtSpeed,
    fmtTemp: fmtTemp,
    seaCondition: seaCondition,
    SEA_TEXT: SEA_TEXT
  }

  /* ================================================================
   * WMO 天气代码 → 中文标签
   * ================================================================ */

  const WMO_MAP = {
    0: { t: '晴', kind: 'sun' },
    1: { t: '晴间多云', kind: 'sun' },
    2: { t: '多云', kind: 'cloud' },
    3: { t: '阴', kind: 'cloud' },
    45: { t: '雾', kind: 'fog' },
    48: { t: '雾凇', kind: 'fog' },
    51: { t: '毛毛雨', kind: 'rain' },
    53: { t: '毛毛雨', kind: 'rain' },
    55: { t: '浓毛雨', kind: 'rain' },
    56: { t: '冻毛毛雨', kind: 'rain' },
    57: { t: '冻毛毛雨', kind: 'rain' },
    61: { t: '小雨', kind: 'rain' },
    63: { t: '中雨', kind: 'rain' },
    65: { t: '大雨', kind: 'rain' },
    66: { t: '冻雨', kind: 'rain' },
    67: { t: '冻雨', kind: 'rain' },
    71: { t: '小雪', kind: 'snow' },
    73: { t: '中雪', kind: 'snow' },
    75: { t: '大雪', kind: 'snow' },
    77: { t: '米雪', kind: 'snow' },
    80: { t: '阵雨', kind: 'rain' },
    81: { t: '阵雨', kind: 'rain' },
    82: { t: '强阵雨', kind: 'rain' },
    85: { t: '阵雪', kind: 'snow' },
    86: { t: '强阵雪', kind: 'snow' },
    95: { t: '雷暴', kind: 'storm' },
    96: { t: '雷暴伴雹', kind: 'storm' },
    99: { t: '强雷暴伴雹', kind: 'storm' }
  }

  const WMO_GLYPH = { sun: '☀', cloud: '☁', fog: '≡', rain: '☂', snow: '❄', storm: '⚡' }

  function wmoText(code) {
    const m = WMO_MAP[code]
    return m ? m.t : '未知'
  }

  function wmoKind(code) {
    const m = WMO_MAP[code]
    return m ? m.kind : 'cloud'
  }

  function wmoGlyph(kind) {
    return WMO_GLYPH[kind] || '·'
  }

  GT.wmo = { text: wmoText, kind: wmoKind, glyph: wmoGlyph, MAP: WMO_MAP }

  /* ================================================================
   * 时区处理（站点当地时刻）
   * ================================================================ */

  function lastSunday(year, month) {
    const last = new Date(Date.UTC(year, month + 1, 0))
    return last.getUTCDate() - last.getUTCDay()
  }

  function nthSunday(year, month, n) {
    const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
    return 1 + ((7 - firstDow) % 7) + (n - 1) * 7
  }

  function isEuDst(ms) {
    const d = new Date(ms)
    const y = d.getUTCFullYear()
    const start = Date.UTC(y, 2, lastSunday(y, 2), 1)
    const end = Date.UTC(y, 9, lastSunday(y, 9), 1)
    return ms >= start && ms < end
  }

  function isUsDst(ms, stdOffset) {
    const d = new Date(ms)
    const y = d.getUTCFullYear()
    const start = Date.UTC(y, 2, nthSunday(y, 2, 2), 2 - stdOffset)
    const end = Date.UTC(y, 10, nthSunday(y, 10, 1), 1 - stdOffset)
    return ms >= start && ms < end
  }

  function isAuDst(ms, stdOffset) {
    const d = new Date(ms)
    const y = d.getUTCFullYear()
    const start = Date.UTC(y, 9, nthSunday(y, 9, 1), 2 - stdOffset)
    const end = Date.UTC(y, 3, nthSunday(y, 3, 1), 2 - stdOffset)
    return ms >= start || ms < end
  }

  function isNzDst(ms, stdOffset) {
    const d = new Date(ms)
    const y = d.getUTCFullYear()
    const start = Date.UTC(y, 8, lastSunday(y, 8), 2 - stdOffset)
    const end = Date.UTC(y, 3, nthSunday(y, 3, 1), 2 - stdOffset)
    return ms >= start || ms < end
  }

  function offsetFor(station, ms) {
    const std = station.tz || 0
    const rule = station.dst
    if (!rule) return std
    let active = false
    if (rule === 'eu') active = isEuDst(ms)
    else if (rule === 'us') active = isUsDst(ms, std)
    else if (rule === 'au') active = isAuDst(ms, std)
    else if (rule === 'nz') active = isNzDst(ms, std)
    return active ? std + 1 : std
  }

  function localDayStart(ms, offsetHours) {
    const shift = offsetHours * 3600000
    return Math.floor((ms + shift) / 86400000) * 86400000 - shift
  }

  /**
   * 将当地日历日转换为真实 UTC 时刻。
   * 用目标日期零点附近的时区反复校正，可正确处理夏令时切换日。
   */
  function msForLocalDate(station, year, month, date) {
    const target = Date.UTC(year, month, date)
    let ms = target - offsetFor(station, target) * 3600000
    for (let i = 0; i < 4; i++) {
      const next = target - offsetFor(station, ms) * 3600000
      if (next === ms) break
      ms = next
    }
    return ms
  }

  function dayStartFor(station, ms) {
    const p = parts(ms, station)
    return msForLocalDate(station, p.year, p.month, p.date)
  }

  function addLocalDays(station, dayStart, days) {
    const p = parts(dayStart, station)
    return msForLocalDate(station, p.year, p.month, p.date + days)
  }

  function offsetLabel(hours) {
    if (hours === 0) return 'UTC'
    const sign = hours > 0 ? '+' : '−'
    const abs = Math.abs(hours)
    const h = Math.floor(abs)
    const m = Math.round((abs - h) * 60)
    return 'UTC' + sign + h + (m ? ':' + (m < 10 ? '0' + m : m) : '')
  }

  GT.tz = {
    offsetFor: offsetFor,
    localDayStart: localDayStart,
    msForLocalDate: msForLocalDate,
    dayStartFor: dayStartFor,
    addLocalDays: addLocalDays,
    offsetLabel: offsetLabel
  }
})(window.GT = window.GT || {})
