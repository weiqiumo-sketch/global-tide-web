/**
 * 全球潮汐 · 网页版 应用控制器
 *
 * 单页应用：潮汐 / 天气 / 鱼情 / 设置 四个视图 + 站点搜索。
 * 依赖 GT 命名空间下所有模块（astro/tide/fishing/util/draw/stations/store/data）。
 */
(function (GT) {
  'use strict'

  const $ = (sel) => document.querySelector(sel)
  const VERSION = 'v1.0.0'

  /* ------------------------------------------------------------------ */
  /* 应用状态                                                            */
  /* ------------------------------------------------------------------ */

  const state = {
    station: null,
    settings: GT.store.getSettings(),
    model: null,
    modelSource: 'estimate',
    modelDatum: '',
    dayMs: Date.now(),
    day: null,
    cursor: null,
    weather: null,
    marine: null,
    envStationId: null,
    envPromise: null,
    activeType: 'all',
    searchQuery: '',
    searchTimer: null,
    upgradeStationId: null
  }

  /* ------------------------------------------------------------------ */
  /* 工具                                                                */
  /* ------------------------------------------------------------------ */

  function stateText(state) {
    return state === 'rising' ? '涨潮中' : state === 'falling' ? '退潮中' : state === 'slack' ? '平潮' : ''
  }

  /** 同步获取可用的潮汐模型（缓存 → 估算），用于首屏即时渲染 */
  function syncModel() {
    const st = state.station
    const cached = GT.store.getHarmonics(st.id)
    if (cached && cached.constituents && cached.constituents.length) {
      state.model = { z0: cached.z0, constituents: cached.constituents }
      state.modelSource = cached.provider === 'noaa' ? 'noaa' : 'cache'
      state.modelDatum = cached.datum || ''
    } else {
      state.model = GT.data.estimateModel(st)
      state.modelSource = 'estimate'
      state.modelDatum = ''
    }
    return state.model
  }

  /** 后台升级：美国站点拉取 NOAA 权威调和常数 */
  function maybeUpgrade() {
    const st = state.station
    if (!st.noaa) return
    if (GT.store.getHarmonics(st.id)) return
    if (state.upgradeStationId === st.id) return
    state.upgradeStationId = st.id
    GT.data.getModel(st).then((res) => {
      state.upgradeStationId = null
      if (state.station && state.station.id === st.id && res.source === 'noaa') {
        state.model = res.model
        state.modelSource = 'noaa'
        state.modelDatum = res.datum || 'MLLW'
        renderTide()
        renderFishing()
      }
    })
  }

  /* ------------------------------------------------------------------ */
  /* 站点选择                                                            */
  /* ------------------------------------------------------------------ */

  function selectStation(station) {
    state.station = station
    state.dayMs = Date.now()
    state.cursor = null
    state.model = null
    state.weather = null
    state.marine = null
    state.envStationId = null
    state.envPromise = null
    state.upgradeStationId = null
    GT.store.setStation(station)
    updateHeaders()
    renderTide()
    renderFishing()
    if (isViewActive('weather')) renderWeather()
  }

  function updateHeaders() {
    const st = state.station
    if (!st) return
    $('#tide-loc-name').textContent = st.name
    $('#tide-loc-sub').textContent = st.country + ' · ' + st.lat + '°, ' + st.lon + '°'
    $('#wx-loc-name').textContent = st.name
    $('#wx-loc-sub').textContent = st.country
    $('#fish-loc-name').textContent = st.name
    $('#fish-loc-sub').textContent = st.country
    $('#fish-loc-2').textContent = st.name
  }

  /* ------------------------------------------------------------------ */
  /* 潮汐页                                                              */
  /* ------------------------------------------------------------------ */

  function renderTide() {
    const st = state.station
    if (!st) return
    const settings = state.settings
    const model = syncModel()
    const day = GT.data.buildDay(st, model, state.dayMs)
    state.day = day
    const isToday = day.dayStart <= Date.now() && Date.now() < day.dayEnd
    const now = Date.now()
    const hUnit = settings.height === 'ft' ? 'ft' : 'm'

    $('#tide-date-text').textContent =
      GT.format.md(day.dayStart, st) + ' · ' + GT.format.weekday(day.dayStart, st)
    const src = GT.data.SOURCE_LABEL[state.modelSource] || state.modelSource
    const srcEl = $('#tide-source')
    srcEl.textContent = src
    srcEl.classList.toggle('is-estimate', state.modelSource === 'estimate')
    $('#tide-datum').textContent = state.modelDatum || ''
    $('#tide-unit-note').textContent = (settings.height === 'ft' ? '英尺' : '米') + ' · 拖动查潮高'
    $('#tide-now-unit').textContent = hUnit

    const nowStrip = $('#tide-now-strip')
    const notodayStrip = $('#tide-notoday-strip')
    if (isToday) {
      nowStrip.hidden = false
      notodayStrip.hidden = true
      const cur = GT.data.current(day, now)
      $('#tide-now-height').textContent = GT.units.fmtHeight(cur.height, settings, 2)
      $('#tide-now-state').textContent = stateText(cur.state)
      if (cur.next) {
        $('#tide-next-type').textContent = cur.next.type === 'high' ? '满潮' : '干潮'
        $('#tide-next-time').textContent = GT.format.hhmm(cur.next.ms, st)
        $('#tide-next-rel').textContent = GT.format.relTime(cur.next.ms, now)
        $('#tide-next-height').textContent =
          GT.units.fmtHeight(cur.next.h, settings, 2) + ' ' + hUnit
      } else {
        $('#tide-next-type').textContent = ''
        $('#tide-next-time').textContent = '--:--'
        $('#tide-next-rel').textContent = ''
        $('#tide-next-height').textContent = '--'
      }
    } else {
      nowStrip.hidden = true
      notodayStrip.hidden = false
    }

    // 涨退潮时刻表
    const events = GT.data.dayEvents(day)
    const eventsCard = $('#tide-events-card')
    if (events.length) {
      eventsCard.hidden = false
      $('#tide-events').innerHTML = events.map((e) => {
        const dot = e.type === 'high' ? 'ev-dot is-high' : 'ev-dot is-low'
        const delta = e.delta !== undefined
          ? '<span class="ev-delta">' + (e.delta >= 0 ? '+' : '') +
            GT.units.fmtHeight(e.delta, settings, 2) + '</span>'
          : ''
        return (
          '<div class="row">' +
          '<div class="row-left"><span class="' + dot + '"></span>' +
          '<span class="ev-label">' + e.label + '</span></div>' +
          '<div class="row-mid">' + GT.format.hhmm(e.ms, st) + '</div>' +
          '<div class="row-right"><span class="ev-height">' +
          GT.units.fmtHeight(e.h, settings, 2) + '</span>' +
          '<span class="ev-unit">' + hUnit + '</span>' + delta + '</div>' +
          '</div>'
        )
      }).join('')
    } else {
      eventsCard.hidden = true
    }

    // 日期条
    renderDayStrip(day.dayStart, st)
    $('#tide-datepicker').value = GT.format.parts(day.dayStart, st).dayKey

    drawTide()
    maybeUpgrade()
  }

  function renderDayStrip(dayStart, station) {
    const container = $('#tide-days')
    const selectedKey = GT.format.parts(dayStart, station).dayKey
    container.innerHTML = ''
    for (let i = -1; i <= 5; i++) {
      const ms = GT.tz.addLocalDays(station, dayStart, i)
      const p = GT.format.parts(ms, station)
      const label = GT.format.dayLabel(ms, station, Date.now())
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'day-cell' + (p.dayKey === selectedKey ? ' is-on' : '')
      btn.dataset.ms = String(ms)
      btn.innerHTML =
        '<div class="day-wd">' + GT.format.weekdayShort(p.weekday) + '</div>' +
        '<div class="day-d">' + p.date + '</div>' +
        '<div class="day-tag">' + label + '</div>'
      container.appendChild(btn)
    }
  }

  function loadDay(ms) {
    state.dayMs = ms
    state.cursor = null
    renderTide()
  }

  function drawTide() {
    const day = state.day
    if (!day) return
    const st = state.station
    const canvas = $('#tide-canvas')
    const wrap = $('#tide-chart-wrap')
    const dpr = window.devicePixelRatio || 1
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    if (!w || !h) return
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const settings = state.settings
    const isToday = day.dayStart <= Date.now() && Date.now() < day.dayEnd

    let readout = null
    if (state.cursor) {
      const hh = GT.tide.heightAt(day.series, state.cursor.ms)
      const st = GT.tide.stateAt(day.series, state.cursor.ms)
      if (hh !== null && hh !== undefined) {
        const val = settings.height === 'ft' ? hh * 3.28084 : hh
        readout = {
          time: GT.format.hhmm(state.cursor.ms, st),
          height: val.toFixed(2),
          state: stateText(st)
        }
      }
    }

    GT.draw.drawTideChart(ctx, {
      W: w,
      H: h,
      series: day.series,
      extremes: day.extremes,
      viewStart: day.dayStart,
      viewEnd: day.dayEnd,
      offsetHours: day.offset,
      station: st,
      heightUnit: settings.height,
      nowMs: isToday ? Date.now() : 0,
      cursor: state.cursor,
      readout: readout
    })
  }

  /* ---------- 潮汐曲线拖动查潮高 ---------- */

  function setupTidePointer() {
    const canvas = $('#tide-canvas')
    let dragging = false

    const cursorFromEvent = (e) => {
      const day = state.day
      if (!day) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const w = rect.width || 1
      const span = day.dayEnd - day.dayStart
      let ms = day.dayStart + (x / w) * span
      ms = Math.max(day.dayStart, Math.min(day.dayEnd - 1, ms))
      state.cursor = { ms: ms }
      drawTide()
    }

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId)
      cursorFromEvent(e)
    })
    canvas.addEventListener('pointermove', (e) => {
      if (dragging) cursorFromEvent(e)
    })
    const end = () => { dragging = false }
    canvas.addEventListener('pointerup', end)
    canvas.addEventListener('pointercancel', end)
  }

  /* ------------------------------------------------------------------ */
  /* 天气 / 海洋                                                         */
  /* ------------------------------------------------------------------ */

  function ensureWeather() {
    const st = state.station
    if (!st) return Promise.resolve({ weather: null, marine: null })
    if (state.envStationId === st.id && state.envPromise) return state.envPromise
    state.envStationId = st.id
    state.envPromise = (async () => {
      const [w, m] = await Promise.all([
        GT.data.fetchWeather(st, 16),
        GT.data.fetchMarine(st, 7)
      ])
      if (state.station && state.station.id === st.id) {
        state.weather = w
        state.marine = m
      }
      return { weather: state.weather, marine: state.marine }
    })()
    return state.envPromise
  }

  async function renderWeather() {
    const st0 = state.station ? state.station.id : null
    paintWeatherLoading()
    const env = await ensureWeather()
    if (!st0 || state.station.id !== st0) return
    paintWeatherFrame(env.weather, env.marine)
  }

  function paintWeatherLoading() {
    $('#wx-current').innerHTML = '<div class="loading"><div class="skel skel-line"></div><div class="skel skel-chart"></div></div>'
    $('#wx-updated').textContent = ''
    $('#wx-empty').hidden = true
    $('#wx-sea-card').hidden = true
    $('#wx-hourly-card').hidden = true
    $('#wx-marine-card').hidden = true
    $('#wx-daily-card').hidden = true
  }

  function paintWeatherFrame(weather, marine) {
    const settings = state.settings
    const st = state.station
    const now = Date.now()
    const tempUnit = settings.temp === 'f' ? '°F' : '°C'
    const speedUnit = GT.units.labels(settings).speed

    // 更新时间
    $('#wx-updated').textContent = weather ? '更新于 ' + GT.format.hhmm(now, st) : ''

    // 当前天气
    const curBox = $('#wx-current')
    const emptyBox = $('#wx-empty')
    if (weather) {
      const row = GT.data.nearestRow(weather, now)
      emptyBox.hidden = true
      if (row) {
        const windSpeed = GT.units.fmtSpeed(row.windSpeed, settings)
        const hum = row.humidity != null ? Math.round(row.humidity) : '--'
        const pres = row.pressure != null ? Math.round(row.pressure) : '--'
        const prec = row.precip != null ? row.precip.toFixed(1) : '--'
        curBox.innerHTML =
          '<div class="cur-main">' +
          '<div class="cur-temp"><span class="num">' + GT.units.fmtTemp(row.temp, settings) + '</span>' +
          '<span class="cur-unit">' + tempUnit + '</span></div>' +
          '<div class="cur-desc">' + GT.wmo.text(row.code) + ' · 体感 ' +
          GT.units.fmtTemp(row.feels, settings) + tempUnit + '</div></div>' +
          '<div class="cur-grid">' +
          '<div class="cur-cell"><div class="cur-k">风</div><div class="cur-v num">' + windSpeed + ' ' + speedUnit + ' ' + GT.units.windDir(row.windDir) + '</div></div>' +
          '<div class="cur-cell"><div class="cur-k">湿度</div><div class="cur-v num">' + hum + '%</div></div>' +
          '<div class="cur-cell"><div class="cur-k">气压</div><div class="cur-v num">' + pres + ' hPa</div></div>' +
          '<div class="cur-cell"><div class="cur-k">降水</div><div class="cur-v num">' + prec + ' mm</div></div>' +
          '</div>'
      } else {
        curBox.innerHTML = ''
      }
    } else {
      curBox.innerHTML = ''
      emptyBox.hidden = false
    }

    // 出海适宜度
    const seaCard = $('#wx-sea-card')
    const wRow = weather ? GT.data.nearestRow(weather, now) : null
    const mRow = marine ? GT.data.nearestRow(marine, now) : null
    const windKmh = wRow ? wRow.windSpeed : null
    const waveM = mRow ? mRow.wave : null
    const precip = wRow ? wRow.precip : null
    if (windKmh !== null || waveM !== null || precip !== null) {
      const level = GT.units.seaCondition(windKmh, waveM, precip)
      seaCard.hidden = false
      $('#wx-sea-level').textContent = GT.units.SEA_TEXT[level]
      $('#wx-sea-level').className = 'sea-level level-' + level
      $('#wx-sea-fill').className = 'sea-fill level-' + level
      $('#wx-sea-fill').style.width = (level * 25) + '%'
    } else {
      seaCard.hidden = true
    }

    // 逐小时
    const hourCard = $('#wx-hourly-card')
    if (weather) {
      const startIdx = Math.round((now - weather.base) / weather.step)
      const cells = []
      for (let i = 0; i < 24; i++) {
        const r = weather.rows[startIdx + i]
        if (!r) break
        const kind = GT.wmo.kind(r.code)
        cells.push(
          '<div class="hour-cell">' +
          '<div class="hour-t">' + GT.format.hhmm(r.t, st) + '</div>' +
          '<div class="hour-wx">' + GT.wmo.glyph(kind) + '</div>' +
          '<div class="hour-temp num">' + GT.units.fmtTemp(r.temp, settings) + '°</div>' +
          '<div class="hour-wind num">' + GT.units.fmtSpeed(r.windSpeed, settings) + '</div>' +
          '</div>'
        )
      }
      if (cells.length) {
        hourCard.hidden = false
        $('#wx-hourly').innerHTML = cells.join('')
      } else {
        hourCard.hidden = true
      }
    } else {
      hourCard.hidden = true
    }

    // 海洋
    const marCard = $('#wx-marine-card')
    if (marine && mRow) {
      const row = mRow
      const val = (v, d) => (v != null ? v.toFixed(d) : '--')
      marCard.hidden = false
      $('#wx-marine').innerHTML =
        '<div class="row"><div class="row-k">浪高</div><div class="row-v"><span class="num">' + val(row.wave, 1) + '</span><span class="u">m</span></div></div>' +
        '<div class="row"><div class="row-k">浪向</div><div class="row-v">' + GT.units.windDir(row.waveDir) + '</div></div>' +
        '<div class="row"><div class="row-k">浪周期</div><div class="row-v"><span class="num">' + val(row.wavePeriod, 1) + '</span><span class="u">s</span></div></div>' +
        '<div class="row"><div class="row-k">涌浪高</div><div class="row-v"><span class="num">' + val(row.swell, 1) + '</span><span class="u">m · ' + GT.units.windDir(row.swellDir) + '</span></div></div>' +
        '<div class="row"><div class="row-k">海表水温</div><div class="row-v"><span class="num">' + (row.sst != null ? GT.units.fmtTemp(row.sst, settings) : '--') + '</span><span class="u">' + tempUnit + '</span></div></div>' +
        '<div class="row"><div class="row-k">洋流流速</div><div class="row-v"><span class="num">' + val(row.currVel, 1) + '</span><span class="u">km/h · ' + GT.units.windDir(row.currDir) + '</span></div></div>'
    } else {
      marCard.hidden = true
    }

    // 16 天预报
    const dailyCard = $('#wx-daily-card')
    if (weather && weather.daily && weather.daily.length) {
      dailyCard.hidden = false
      $('#wx-daily').innerHTML = weather.daily.map((d) => {
        const prec = d.precip != null ? ' · ' + d.precip.toFixed(1) + 'mm' : ''
        return (
          '<div class="row daily-row">' +
          '<div class="daily-date"><div class="daily-wd">' + GT.format.weekdayKey(d.dayKey) + '</div>' +
          '<div class="daily-d">' + GT.format.monthDayKey(d.dayKey) + '</div></div>' +
          '<div class="daily-wx">' + GT.wmo.text(d.code) + prec + '</div>' +
          '<div class="daily-temp"><span class="tmax num">' + GT.units.fmtTemp(d.tmax, settings) + '°</span>' +
          '<span class="tmin num">' + GT.units.fmtTemp(d.tmin, settings) + '°</span></div>' +
          '<div class="daily-wind num">' + GT.units.fmtSpeed(d.windmax, settings) + '</div>' +
          '</div>'
        )
      }).join('')
    } else {
      dailyCard.hidden = true
    }
  }

  /* ------------------------------------------------------------------ */
  /* 鱼情页                                                              */
  /* ------------------------------------------------------------------ */

  function analyseOne(st, model, weather, marine, dayMs) {
    const offset = GT.tz.offsetFor(st, dayMs)
    const day = GT.data.buildDay(st, model, dayMs)
    const noon = day.dayStart + (day.dayEnd - day.dayStart) / 2
    const range = { t0: day.dayStart, t1: day.dayEnd }
    const moon = GT.astro.moonInfo(noon, st.lat, st.lon, offset, range)
    const sun = GT.astro.sunInfo(noon, st.lat, st.lon, offset, range)
    const a = GT.fishing.analyseDay({
      dayStart: day.dayStart,
      dayEnd: day.dayEnd,
      series: day.series,
      dayEnd: day.dayEnd,
      moon: moon,
      sun: sun,
      weather: weather,
      marine: marine
    })
    return {
      dayStart: day.dayStart,
      offset: offset,
      peak: a.peak,
      levelText: a.level.text,
      levelKey: a.level.key,
      hourly: a.hourly,
      best: a.best,
      factors: a.factors,
      highlights: a.highlights,
      cautions: a.cautions,
      moon: moon
    }
  }

  async function renderFishing() {
    const st = state.station
    if (!st) return
    const st0 = st.id
    paintFishing(state.weather, state.marine)
    const env = await ensureWeather()
    if (!state.station || state.station.id !== st0) return
    paintFishing(env.weather, env.marine)
  }

  function paintFishing(weather, marine) {
    const st = state.station
    if (!st) return
    const now = Date.now()
    const model = syncModel()
    const today = analyseOne(st, model, weather, marine, now)

    // 评分头部
    $('#fish-score').textContent = today.peak
    const lv = $('#fish-level')
    lv.textContent = today.levelText
    lv.className = 'score-level level-' + today.levelKey

    // 最佳时段
    const bestCard = $('#fish-best-card')
    if (today.best.length) {
      bestCard.hidden = false
      $('#fish-best').innerHTML = today.best.map((s) =>
        '<div class="best-item">' +
        '<div class="best-time num">' + GT.format.hhmm(s.start, st) + ' — ' + GT.format.hhmm(s.end, st) + '</div>' +
        '<div class="best-score num">' + s.score + '</div>' +
        '<div class="best-level">' + GT.fishing.levelOf(s.score).text + '</div>' +
        '</div>'
      ).join('')
    } else {
      bestCard.hidden = true
    }

    // 24 小时活跃度
    const nowIdx = Math.floor((now - today.dayStart) / 3600000)
    $('#fish-bars').innerHTML = today.hourly.map((h, i) => {
      const isBest = today.best.length > 0 &&
        h.hour * 3600000 + today.dayStart >= today.best[0].start &&
        h.hour * 3600000 + today.dayStart < today.best[0].end
      const cls = 'bar' + (isBest ? ' is-best' : '') + (i === nowIdx ? ' is-now' : '')
      const hourParts = GT.format.parts(today.dayStart + i * 3600000, st)
      const label = i % 3 === 0 ? GT.format.pad2(hourParts.hour) : ''
      return (
        '<div class="bar-col">' +
        '<div class="bar-track"><div class="' + cls + '" style="height:' + Math.max(6, Math.round(h.score)) + '%"></div></div>' +
        (label ? '<div class="bar-label">' + label + '</div>' : '<div class="bar-label is-empty">·</div>') +
        '</div>'
      )
    }).join('')

    // 月相
    const moon = today.moon
    const springVal = Math.abs(Math.cos(moon.phase * 2 * Math.PI))
    const spring = springVal > 0.75 ? '大潮' : springVal > 0.4 ? '中潮' : '小潮'
    $('#fish-moon').innerHTML =
      '<div class="moon-name">' + GT.astro.moonPhaseName(moon.phase) +
      ' <span class="moon-spring">' + spring + '</span></div>' +
      '<div class="moon-line">月龄 ' + moon.age.toFixed(1) + ' 天 · ' + (moon.waxing ? '盈' : '亏') + ' · 照亮 ' + Math.round(moon.fraction * 100) + '%</div>' +
      '<div class="moon-line">月出 ' + GT.format.hhmm(moon.rise, st) + ' · 月落 ' + GT.format.hhmm(moon.set, st) + '</div>' +
      '<div class="moon-line">月中天 ' + GT.format.hhmm(moon.transit, st) + '</div>'
    drawMoonCanvas(moon)

    // 因子
    const factorsCard = $('#fish-factors-card')
    if (today.factors.length) {
      factorsCard.hidden = false
      $('#fish-factors').innerHTML = today.factors.map((f) =>
        '<div class="factor">' +
        '<div class="factor-head"><span class="factor-label">' + f.label + '</span>' +
        '<span class="factor-score num">' + f.score + '</span></div>' +
        '<div class="factor-track"><div class="factor-fill" style="width:' + f.score + '%"></div></div>' +
        '<div class="factor-note">' + f.note + '</div>' +
        '</div>'
      ).join('')
    } else {
      factorsCard.hidden = true
    }

    // 结论
    const conclCard = $('#fish-concl-card')
    if (today.highlights.length || today.cautions.length) {
      conclCard.hidden = false
      $('#fish-concl').innerHTML =
        today.highlights.map((s) => '<div class="concl">· ' + s + '</div>').join('') +
        today.cautions.map((s) => '<div class="concl is-caution">· ' + s + '</div>').join('')
    } else {
      conclCard.hidden = true
    }

    // 7 天日历
    const cells = []
    for (let i = 0; i < 7; i++) {
      const dms = GT.tz.addLocalDays(st, today.dayStart, i)
      const a = analyseOne(st, model, weather, marine, dms)
      const p = GT.format.parts(dms, st)
      cells.push(
        '<div class="cal-cell">' +
        '<div class="cal-wd">' + GT.format.weekdayShort(p.weekday) + '</div>' +
        '<div class="cal-d">' + p.date + '</div>' +
        '<div class="cal-peak num level-' + a.levelKey + '">' + a.peak + '</div>' +
        '<div class="cal-bars">' + a.hourly.map((h) => '<div class="cal-bar" style="height:' + Math.max(6, Math.round(h.score)) + '%"></div>').join('') + '</div>' +
        '</div>'
      )
    }
    $('#fish-cal').innerHTML = cells.join('')
  }

  function drawMoonCanvas(moon) {
    const canvas = $('#moon-canvas')
    const size = 150
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    GT.draw.drawMoon(ctx, size / 2, size / 2, 54, moon.phase, {})
  }

  /* ------------------------------------------------------------------ */
  /* 设置页                                                              */
  /* ------------------------------------------------------------------ */

  const UNIT_OPTIONS = {
    height: [
      { key: 'm', label: '米 (m)' },
      { key: 'ft', label: '英尺 (ft)' }
    ],
    speed: [
      { key: 'kmh', label: '公里/时' },
      { key: 'ms', label: '米/秒' },
      { key: 'kn', label: '节 (kn)' },
      { key: 'bft', label: '蒲福风级' }
    ],
    temp: [
      { key: 'c', label: '摄氏度 °C' },
      { key: 'f', label: '华氏度 °F' }
    ]
  }

  const UNIT_LABELS = { height: '潮位高度', speed: '风速', temp: '温度' }

  function renderSettings() {
    $('#app-version').textContent = VERSION
    const groups = Object.keys(UNIT_OPTIONS)
    $('#settings-units').innerHTML = groups.map((g) => {
      const opts = UNIT_OPTIONS[g].map((o) => {
        const on = state.settings[g] === o.key ? ' is-on' : ''
        return '<button type="button" class="unit-opt' + on + '" data-group="' + g + '" data-key="' + o.key + '">' + o.label + '</button>'
      }).join('')
      return '<div class="unit-row"><div class="unit-label">' + UNIT_LABELS[g] + '</div><div class="unit-opts">' + opts + '</div></div>'
    }).join('')
  }

  function onSetUnit(group, key) {
    state.settings = GT.store.setSettings({ [group]: key })
    renderSettings()
    renderTide()
    renderWeather()
  }

  /* ------------------------------------------------------------------ */
  /* 搜索                                                                */
  /* ------------------------------------------------------------------ */

  const SEARCH_TYPES = [
    { key: 'all', label: '全部' },
    { key: 'port', label: '港口' },
    { key: 'tide', label: '验潮站' },
    { key: 'island', label: '岛屿' },
    { key: 'dive', label: '潜水点' },
    { key: 'wreck', label: '沉船点' },
    { key: 'surf', label: '冲浪点' }
  ]

  function openSearch() {
    state.activeType = 'all'
    state.searchQuery = ''
    $('#search').hidden = false
    $('#search-input').value = ''
    renderSearchTypes()
    renderSearchRecent()
    runSearch('')
    setTimeout(() => $('#search-input').focus(), 60)
  }

  function closeSearch() {
    $('#search').hidden = true
  }

  function renderSearchTypes() {
    $('#search-types').innerHTML = SEARCH_TYPES.map((t) => {
      const on = state.activeType === t.key ? ' is-on' : ''
      return '<button type="button" class="type-chip' + on + '" data-type="' + t.key + '">' + t.label + '</button>'
    }).join('')
  }

  function renderSearchRecent() {
    const recent = GT.store.getRecent()
    const wrap = $('#search-recent-wrap')
    if (recent && recent.length) {
      wrap.hidden = false
      $('#search-recent').innerHTML = recent.map((r) =>
        '<button type="button" class="result-item" data-id="' + r.id + '">' +
        '<span class="result-main"><span class="result-name">' + r.name + '</span></span>' +
        '</button>'
      ).join('')
    } else {
      wrap.hidden = true
    }
  }

  function runSearch(q) {
    let list = GT.stations.search(q)
    if (state.activeType !== 'all') {
      list = list.filter((s) => s.type === state.activeType)
    }
    $('#search-result-title').textContent = q ? '搜索结果' : (state.activeType === 'all' ? '全部站点' : SEARCH_TYPES.find((t) => t.key === state.activeType).label)
    if (list.length) {
      $('#search-results').innerHTML = list.map((s) =>
        '<button type="button" class="result-item" data-id="' + s.id + '">' +
        '<span class="result-main">' +
        '<span class="result-name">' + s.name + '</span>' +
        '<span class="result-sub">' + s.nameEn + ' · ' + s.country + '</span>' +
        '</span>' +
        '<span class="result-type">' + GT.stations.TYPE_LABEL[s.type] + '</span>' +
        '</button>'
      ).join('')
    } else {
      $('#search-results').innerHTML = '<div class="result-none">未找到匹配站点</div>'
    }
  }

  function pickStation(id) {
    const station = GT.stations.get(id)
    if (!station) return
    closeSearch()
    selectStation(station)
    switchTab('tide')
  }

  /* ---------- 定位 ---------- */

  function locate() {
    if (!navigator.geolocation) {
      window.alert('当前浏览器不支持定位')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const near = GT.stations.near(pos.coords.latitude, pos.coords.longitude, 1)
        if (near.length) {
          pickStation(near[0].station.id)
        } else {
          window.alert('未找到附近站点')
        }
      },
      () => window.alert('定位失败，请检查浏览器定位权限'),
      { timeout: 10000 }
    )
  }

  /* ------------------------------------------------------------------ */
  /* 视图切换                                                            */
  /* ------------------------------------------------------------------ */

  function isViewActive(name) {
    return $('#view-' + name).classList.contains('is-active')
  }

  function switchTab(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-active'))
    $('#view-' + name).classList.add('is-active')
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name))
    if (name === 'tide') renderTide()
    if (name === 'weather') renderWeather()
    if (name === 'fishing') renderFishing()
    if (name === 'settings') renderSettings()
    window.scrollTo(0, 0)
  }

  /* ------------------------------------------------------------------ */
  /* 事件绑定                                                            */
  /* ------------------------------------------------------------------ */

  function setupEvents() {
    // tab
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => switchTab(t.dataset.tab))
    })

    // 首页链接
    document.querySelectorAll('[data-go]').forEach((el) => {
      el.addEventListener('click', () => switchTab(el.dataset.go))
    })

    // 搜索
    $('#tide-search').addEventListener('click', openSearch)
    $('#search-close').addEventListener('click', closeSearch)
    $('#search-input').addEventListener('input', (e) => {
      state.searchQuery = e.target.value
      clearTimeout(state.searchTimer)
      state.searchTimer = setTimeout(() => runSearch(state.searchQuery), 180)
    })
    $('#search-types').addEventListener('click', (e) => {
      const chip = e.target.closest('.type-chip')
      if (!chip) return
      state.activeType = chip.dataset.type
      renderSearchTypes()
      runSearch(state.searchQuery)
    })
    $('#search-results').addEventListener('click', (e) => {
      const item = e.target.closest('.result-item')
      if (item) pickStation(item.dataset.id)
    })
    $('#search-recent').addEventListener('click', (e) => {
      const item = e.target.closest('.result-item')
      if (item) pickStation(item.dataset.id)
    })

    // 日期
    $('#tide-days').addEventListener('click', (e) => {
      const cell = e.target.closest('.day-cell')
      if (cell) loadDay(Number(cell.dataset.ms))
    })
    $('#tide-back-today').addEventListener('click', () => loadDay(Date.now()))
    $('#tide-datepicker').addEventListener('change', (e) => {
      const val = e.target.value
      if (!val) return
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val)
      if (!m) return
      const ms = GT.tz.msForLocalDate(state.station, +m[1], +m[2] - 1, +m[3])
      loadDay(ms)
    })

    // 设置
    $('#settings-units').addEventListener('click', (e) => {
      const opt = e.target.closest('.unit-opt')
      if (opt) onSetUnit(opt.dataset.group, opt.dataset.key)
    })

    // 潮汐曲线拖动
    setupTidePointer()

    // 响应式重绘
    let resizeTimer = null
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => { if (state.day) drawTide() }, 150)
    })

    // 定位按钮
    const locateBtn = document.createElement('button')
    locateBtn.type = 'button'
    locateBtn.className = 'search-close'
    locateBtn.textContent = '定位'
    locateBtn.addEventListener('click', locate)
    $('#search-head').appendChild(locateBtn)
  }

  /* ------------------------------------------------------------------ */
  /* 启动                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    state.settings = GT.store.getSettings()
    setupEvents()
    renderSettings()

    const saved = GT.store.getStation()
    let station = saved ? GT.stations.get(saved.id) : null
    if (!station) station = GT.stations.get('qingdao')
    selectStation(station)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})(window.GT = window.GT || {})
