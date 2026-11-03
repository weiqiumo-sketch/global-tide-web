/**
 * 本地存储（浏览器 localStorage）
 * 所有缓存都做了长度与有效期约束。
 * 浏览器版：挂载到全局 GT 命名空间。
 */
(function (GT) {
  'use strict'

  const KEY = {
    settings: 'gt.settings.v1',
    station: 'gt.station.v1',
    recent: 'gt.recent.v1',
    harmonics: 'gt.harm.v1.',
    cache: 'gt.cache.v1.'
  }

  const DEFAULT_SETTINGS = {
    height: 'm',
    speed: 'kmh',
    temp: 'c',
    showEstimateTip: true
  }

  function safeGet(key, fallback) {
    try {
      const v = window.localStorage.getItem(key)
      if (v === null || v === '' || v === undefined) return fallback
      return JSON.parse(v)
    } catch (e) {
      return fallback
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      // 存储满了，清掉最旧的潮汐模型再试一次
      try {
        clearOldHarmonics(3)
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (e2) {
        /* 放弃写入，不影响主流程 */
      }
    }
  }

  function getSettings() {
    const saved = safeGet(KEY.settings, {})
    return Object.assign({}, DEFAULT_SETTINGS, saved)
  }

  function setSettings(patch) {
    const next = Object.assign(getSettings(), patch)
    safeSet(KEY.settings, next)
    return next
  }

  function getStation() {
    return safeGet(KEY.station, null)
  }

  function setStation(station) {
    safeSet(KEY.station, {
      id: station.id,
      name: station.name,
      lat: station.lat,
      lon: station.lon
    })
    pushRecent(station)
  }

  function getRecent() {
    return safeGet(KEY.recent, [])
  }

  function pushRecent(station) {
    const list = getRecent().filter((s) => s.id !== station.id)
    list.unshift({ id: station.id, name: station.name })
    safeSet(KEY.recent, list.slice(0, 8))
  }

  /* ---------------- 潮汐调和模型缓存（离线预测的核心） ---------------- */

  function harmonicsKey(stationId) {
    return KEY.harmonics + stationId
  }

  function getHarmonics(stationId) {
    return safeGet(harmonicsKey(stationId), null)
  }

  function setHarmonics(stationId, payload) {
    const slim = {
      z0: payload.model.z0,
      constituents: payload.model.constituents.map((c) => ({
        name: c.name,
        amplitude: Math.round(c.amplitude * 10000) / 10000,
        phase: Math.round(c.phase * 100) / 100
      })),
      provider: payload.provider,
      datum: payload.datum || '',
      fetchedAt: Date.now(),
      spanDays: payload.spanDays || 0
    }
    safeSet(harmonicsKey(stationId), slim)
  }

  function clearOldHarmonics(keep) {
    try {
      const keys = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && k.indexOf(KEY.harmonics) === 0) keys.push(k)
      }
      keys.slice(0, Math.max(0, keys.length - (keep || 0))).forEach((k) => {
        window.localStorage.removeItem(k)
      })
    } catch (e) {
      /* ignore */
    }
  }

  /* ---------------- 通用带 TTL 缓存 ---------------- */

  function cacheGet(name, ttl) {
    const rec = safeGet(KEY.cache + name, null)
    if (!rec || !rec.t) return null
    if (ttl && Date.now() - rec.t > ttl) return null
    return rec.v
  }

  function cacheSet(name, value) {
    safeSet(KEY.cache + name, { t: Date.now(), v: value })
  }

  function cacheAge(name) {
    const rec = safeGet(KEY.cache + name, null)
    return rec && rec.t ? Date.now() - rec.t : null
  }

  GT.store = {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    getSettings: getSettings,
    setSettings: setSettings,
    getStation: getStation,
    setStation: setStation,
    getRecent: getRecent,
    pushRecent: pushRecent,
    getHarmonics: getHarmonics,
    setHarmonics: setHarmonics,
    clearOldHarmonics: clearOldHarmonics,
    cacheGet: cacheGet,
    cacheSet: cacheSet,
    cacheAge: cacheAge
  }
})(window.GT = window.GT || {})
