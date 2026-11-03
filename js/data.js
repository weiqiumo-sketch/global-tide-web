/**
 * 数据层：浏览器直连公开权威数据源（无需后端）
 *
 *   潮汐（美国站点）  NOAA CO-OPS 调和常数  https://api.tidesandcurrents.noaa.gov
 *   天气 / 风浪        Open-Meteo             https://api.open-meteo.com / marine-api.open-meteo.com
 *   潮汐（其他站点）  本地天文估算模型（GT.tide.synthesizeModel）
 *
 * 所有网络结果都会写入 localStorage 缓存，离线时可复用。
 * 依赖 GT.tide / GT.tz / GT.store。
 */
(function (GT) {
  'use strict'

  const tide = GT.tide
  const tz = GT.tz
  const store = GT.store

  const STEP_MIN = 6
  const HOURS_BEFORE = 2
  const HOURS_AFTER = 2

  const SOURCE_LABEL = {
    noaa: 'NOAA 权威',
    worldtides: 'WorldTides',
    cache: '离线缓存',
    estimate: '估算数据',
    online: '在线数据'
  }

  const TTL = { weather: 30 * 60 * 1000, marine: 2 * 3600 * 1000 }

  /* ------------------------------------------------------------------ */
  /* 通用 fetch（带超时）                                                */
  /* ------------------------------------------------------------------ */

  function fetchJson(url, timeoutMs) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = ctrl
      ? setTimeout(() => ctrl.abort(), timeoutMs || 12000)
      : null
    return fetch(url, { signal: ctrl ? ctrl.signal : undefined })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .finally(() => {
        if (timer) clearTimeout(timer)
      })
  }

  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s)
    if (!m) return null
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0)
  }

  function parseApiTime(value) {
    if (typeof value === 'number') return value * 1000
    return parseISO(value)
  }

  /* ------------------------------------------------------------------ */
  /* NOAA 调和常数（美国站点）                                           */
  /* ------------------------------------------------------------------ */

  const NOAA_MAP = [
    'M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1',
    'M4', 'MS4', '2N2', 'MU2', 'L2', 'J1', 'M1', 'S1', '2Q1'
  ]

  function noaaToModel(data) {
    const list = data.HarmonicConstituents || []
    const constituents = []
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      if (!c.name || NOAA_MAP.indexOf(c.name) === -1) continue
      if (!(c.amplitude > 0)) continue
      constituents.push({
        name: c.name,
        amplitude: c.amplitude,
        phase: c.phase_GMT
      })
    }
    if (constituents.length < 4) return null
    return { z0: 0, constituents: constituents }
  }

  async function fetchNoaa(station) {
    const url =
      'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/' +
      encodeURIComponent(station.noaa) +
      '/harcon.json?units=metric'
    const data = await fetchJson(url, 12000)
    const model = noaaToModel(data)
    if (!model) throw new Error('noaa: too few constituents')
    store.setHarmonics(station.id, { model: model, provider: 'noaa', datum: 'MLLW' })
    return model
  }

  /* ------------------------------------------------------------------ */
  /* 潮汐模型获取                                                        */
  /* ------------------------------------------------------------------ */

  /** 同步的估算模型（无任何网络请求，用于首屏即时渲染） */
  function estimateModel(station) {
    return tide.synthesizeModel({ lat: station.lat })
  }

  /**
   * 异步获取潮汐模型：缓存 → NOAA → 估算
   * @returns {Promise<{model, source, datum, fetchedAt}>}
   */
  async function getModel(station) {
    // 1. 本地缓存（离线可用）
    const cached = store.getHarmonics(station.id)
    if (cached && cached.constituents && cached.constituents.length) {
      return {
        model: { z0: cached.z0, constituents: cached.constituents },
        source: 'cache',
        datum: cached.datum || '',
        fetchedAt: cached.fetchedAt || 0
      }
    }

    // 2. NOAA（美国站点）
    if (station.noaa) {
      try {
        const model = await fetchNoaa(station)
        return { model: model, source: 'noaa', datum: 'MLLW', fetchedAt: Date.now() }
      } catch (e) {
        /* 落入估算 */
      }
    }

    // 3. 估算模型
    return { model: estimateModel(station), source: 'estimate', datum: '', fetchedAt: 0 }
  }

  /**
   * 生成某一天的潮位序列与极值
   */
  function buildDay(station, model, dayMs) {
    const dayStart = tz.dayStartFor(station, dayMs)
    const dayEnd = tz.addLocalDays(station, dayStart, 1)
    const offset = tz.offsetFor(station, dayStart)
    const start = dayStart - HOURS_BEFORE * 3600000
    const end = dayEnd + HOURS_AFTER * 3600000
    const count = Math.round((end - start) / (STEP_MIN * 60000)) + 1
    const series = tide.predictSeries({
      model: model,
      startMs: start,
      count: count,
      stepMin: STEP_MIN
    })
    const extremes = tide.findExtremes(series)
    return {
      series: series,
      extremes: extremes,
      offset: offset,
      dayStart: dayStart,
      dayEnd: dayEnd
    }
  }

  function dayEvents(day) {
    const list = day.extremes
      .filter((e) => e.ms >= day.dayStart && e.ms < day.dayEnd)
      .map((e) => ({
        ms: e.ms,
        h: e.h,
        type: e.type,
        label: e.type === 'high' ? '满潮' : '干潮'
      }))
    for (let i = 1; i < list.length; i++) {
      list[i].delta = list[i].h - list[i - 1].h
    }
    return list
  }

  function current(day, nowMs) {
    const h = tide.heightAt(day.series, nowMs)
    const state = tide.stateAt(day.series, nowMs)
    const next = tide.nearestExtreme(day.extremes, nowMs, 'next')
    const prev = tide.nearestExtreme(day.extremes, nowMs, 'prev')
    return { height: h, state: state, next: next, prev: prev }
  }

  /* ------------------------------------------------------------------ */
  /* 天气 / 海洋（Open-Meteo，免密钥，CORS 友好）                        */
  /* ------------------------------------------------------------------ */

  const WX_HOURLY =
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,' +
    'weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
  const WX_DAILY =
    'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,' +
    'precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant'

  function normalizeWeather(json, station) {
    const h = json.hourly || {}
    const d = json.daily || {}
    const n = (h.time || []).length
    const rows = []
    for (let i = 0; i < n; i++) {
      rows.push({
        t: parseApiTime(h.time[i]),
        temp: h.temperature_2m[i],
        feels: h.apparent_temperature[i],
        humidity: h.relative_humidity_2m[i],
        precip: h.precipitation[i],
        code: h.weather_code[i],
        cloud: h.cloud_cover[i],
        pressure: h.pressure_msl[i],
        windSpeed: h.wind_speed_10m[i],
        windDir: h.wind_direction_10m[i],
        gust: h.wind_gusts_10m[i]
      })
    }
    const daily = (d.time || []).map((time, i) => {
      const t = parseApiTime(time)
      return {
        dayKey: GT.format.parts(t, station).dayKey,
        t: t,
        code: d.weather_code[i],
        tmax: d.temperature_2m_max[i],
        tmin: d.temperature_2m_min[i],
        sunrise: parseApiTime(d.sunrise[i]),
        sunset: parseApiTime(d.sunset[i]),
        precip: d.precipitation_sum[i],
        windmax: d.wind_speed_10m_max[i],
        winddir: d.wind_direction_10m_dominant[i]
      }
    })
    return { base: rows.length ? rows[0].t : Date.now(), step: 3600000, rows: rows, daily: daily }
  }

  async function fetchWeather(station, days) {
    days = days || 16
    const key = 'wx.v2.' + station.lat.toFixed(2) + ',' + station.lon.toFixed(2) + '.' + days
    const cached = store.cacheGet(key, TTL.weather)
    if (cached) return cached

    try {
      const url =
        'https://api.open-meteo.com/v1/forecast' +
        '?latitude=' + station.lat + '&longitude=' + station.lon +
        '&hourly=' + WX_HOURLY +
        '&daily=' + WX_DAILY +
        '&forecast_days=' + days +
        '&wind_speed_unit=kmh&timezone=auto&timeformat=unixtime'
      const json = await fetchJson(url, 15000)
      const res = normalizeWeather(json, station)
      if (res.rows.length) {
        store.cacheSet(key, res)
        return res
      }
    } catch (e) {
      /* ignore */
    }
    return null
  }

  const MAR_HOURLY =
    'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,' +
    'sea_surface_temperature,ocean_current_velocity,ocean_current_direction'
  const MAR_DAILY = 'wave_height_max,wave_direction_dominant,wave_period_max'

  function normalizeMarine(json) {
    const h = json.hourly || {}
    const n = (h.time || []).length
    const rows = []
    for (let i = 0; i < n; i++) {
      rows.push({
        t: parseApiTime(h.time[i]),
        wave: h.wave_height[i],
        waveDir: h.wave_direction[i],
        wavePeriod: h.wave_period[i],
        swell: h.swell_wave_height[i],
        swellDir: h.swell_wave_direction[i],
        sst: h.sea_surface_temperature[i],
        currVel: h.ocean_current_velocity[i],
        currDir: h.ocean_current_direction[i]
      })
    }
    return { base: rows.length ? rows[0].t : Date.now(), step: 3600000, rows: rows, daily: null }
  }

  async function fetchMarine(station, days) {
    days = days || 7
    const key = 'mar.v2.' + station.lat.toFixed(2) + ',' + station.lon.toFixed(2) + '.' + days
    const cached = store.cacheGet(key, TTL.marine)
    if (cached) return cached

    try {
      const url =
        'https://marine-api.open-meteo.com/v1/marine' +
        '?latitude=' + station.lat + '&longitude=' + station.lon +
        '&hourly=' + MAR_HOURLY +
        '&daily=' + MAR_DAILY +
        '&forecast_days=' + days +
        '&timezone=auto&timeformat=unixtime'
      const json = await fetchJson(url, 15000)
      const res = normalizeMarine(json)
      if (res.rows.length) {
        store.cacheSet(key, res)
        return res
      }
    } catch (e) {
      /* ignore */
    }
    return null
  }

  /* ---------------- 归一化取数工具（供页面取数） ---------------- */

  function pick(env, ms, field) {
    if (!env || !env.rows || !env.rows.length) return null
    const idx = Math.round((ms - env.base) / env.step)
    if (idx < 0 || idx >= env.rows.length) return null
    const v = env.rows[idx][field]
    return v === undefined || v === null ? null : v
  }

  function nearestRow(env, ms) {
    if (!env || !env.rows || !env.rows.length) return null
    const idx = Math.round((ms - env.base) / env.step)
    if (idx < 0 || idx >= env.rows.length) return null
    return env.rows[idx]
  }

  function dailyFor(env, dayMs) {
    if (!env || !env.daily || !env.daily.length) return null
    const d = new Date(dayMs)
    const key =
      d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0')
    for (let i = 0; i < env.daily.length; i++) {
      if (env.daily[i].dayKey === key) return env.daily[i]
    }
    return null
  }

  GT.data = {
    SOURCE_LABEL: SOURCE_LABEL,
    fetchJson: fetchJson,
    parseISO: parseISO,
    fetchNoaa: fetchNoaa,
    estimateModel: estimateModel,
    getModel: getModel,
    buildDay: buildDay,
    dayEvents: dayEvents,
    current: current,
    fetchWeather: fetchWeather,
    fetchMarine: fetchMarine,
    pick: pick,
    nearestRow: nearestRow,
    dailyFor: dailyFor
  }
})(window.GT = window.GT || {})
