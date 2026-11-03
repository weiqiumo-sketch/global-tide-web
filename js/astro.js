/**
 * 天文计算 —— 完全离线，不依赖任何网络
 *
 * 实现依据：Jean Meeus《Astronomical Algorithms》
 *   · 太阳位置    第 25 章（低精度公式，误差 < 0.01°）
 *   · 月球位置    第 47 章（截断级数，经度误差 < 0.05°）
 *   · 月相/照亮   第 48 章
 *   · 中天/出没   用高度角采样 + 二分求解
 *
 * 月出月落误差约 1–2 分钟，用于鱼情时段计算完全够用。
 * 本文件为浏览器版：挂载到全局 GT 命名空间。
 */
(function (GT) {
  'use strict'

  const RAD = Math.PI / 180
  const DEG = 180 / Math.PI
  const J2000 = 2451545.0
  const SYNODIC_MONTH = 29.530588853

  function norm360(d) {
    const x = d % 360
    return x < 0 ? x + 360 : x
  }

  function sind(x) {
    return Math.sin(x * RAD)
  }

  function cosd(x) {
    return Math.cos(x * RAD)
  }

  function jdFromMs(ms) {
    return ms / 86400000 + 2440587.5
  }

  function msFromJd(jd) {
    return (jd - 2440587.5) * 86400000
  }

  /* ------------------------------------------------------------------ */
  /* 月球位置：截断的 ELP 级数                                            */
  /* 每行 [D, M, M', F, Σl(1e-6 度), Σr(1e-3 km), Σb(1e-6 度)]           */
  /* ------------------------------------------------------------------ */

  const MOON_TERMS = [
    [0, 0, 1, 0, 6288774, -20905355, 0],
    [2, 0, -1, 0, 1274027, -3699111, 0],
    [2, 0, 0, 0, 658314, -2955968, 0],
    [0, 0, 2, 0, 213618, -569925, 0],
    [0, 1, 0, 0, -185116, 48888, 0],
    [0, 0, 0, 2, -114332, -3149, 0],
    [2, 0, -2, 0, 58793, 246158, 0],
    [2, -1, -1, 0, 57066, -152138, 0],
    [2, 0, 1, 0, 53322, -170733, 0],
    [2, 0, 0, -2, 45758, -204586, 0],
    [0, 1, -1, 0, -40923, -129620, 0],
    [1, 0, 0, 0, -34720, 108743, 0],
    [0, 1, 1, 0, -30383, 104755, 0],
    [2, 0, 0, 2, 15327, 10321, 0],
    [0, 0, 1, -2, -12528, 0, 0],
    [0, 0, 1, 2, 10980, 79661, 0],
    [4, 0, -1, 0, 10675, -34782, 0],
    [0, 0, 3, 0, 10034, -23210, 0],
    [4, 0, -2, 0, 8548, -21636, 0],
    [2, 1, -1, 0, -7888, 24208, 0],
    [2, 1, 0, 0, -6766, 30824, 0],
    [1, 0, -1, 0, -5163, -8379, 0],
    [1, 1, 0, 0, 4987, -16675, 0],
    [2, -1, 0, 0, 4036, -12831, 0],
    [2, 0, 2, 0, 3994, -10445, 0],
    [4, 0, 0, 0, 3861, -11650, 0],
    [2, 0, -3, 0, 3665, 14403, 0],
    [0, 1, -2, 0, -2689, -7003, 0],
    [2, 0, -1, 2, -2602, 0, 0],
    [2, -1, -2, 0, 2390, 10056, 0],
    [1, 0, 1, 0, -2348, 6322, 0],
    [2, -2, 0, 0, 2236, -9884, 0],
    [0, 1, 2, 0, -2120, 5751, 0],
    [0, 2, 0, 0, -2069, 0, 0],
    [2, -2, -1, 0, 2048, -4950, 0],
    [2, 0, 1, -2, -1773, 4130, 0],
    [2, 0, 0, -4, -1595, 0, 0],
    [4, -1, -1, 0, 1215, -3958, 0],
    [0, 0, 2, 2, -1110, 0, 0],
    [3, 0, -1, 0, -892, 3258, 0],
    [2, 1, 1, 0, -810, 2616, 0],
    [4, -1, -2, 0, 759, -1897, 0],
    [0, 2, -1, 0, -713, -2117, 0],
    [2, 2, -1, 0, -700, 2354, 0],
    [2, 1, -2, 0, 691, 0, 0],
    [2, -1, 0, -2, 596, 0, 0],
    [4, 0, 1, 0, 549, -1423, 0],
    [0, 0, 4, 0, 537, -1117, 0],
    [4, -1, 0, 0, 520, -1571, 0],
    [1, 0, -2, 0, -487, -1739, 0],
    [2, 1, 0, -2, -399, 0, 0],
    [0, 0, 2, -2, -381, -4421, 0],
    [1, 1, 1, 0, 351, 0, 0],
    [3, 0, -2, 0, -340, 0, 0],
    [4, 0, -3, 0, 330, 0, 0],
    [2, -1, 2, 0, 327, 0, 0],
    [0, 2, 1, 0, -323, 1165, 0],
    [1, 1, -1, 0, 299, 0, 0],
    [2, 0, 3, 0, 294, 0, 0],
    [2, 0, -1, -2, 0, 8752, 0],

    [0, 0, 0, 1, 0, 0, 5128122],
    [0, 0, 1, 1, 0, 0, 280602],
    [0, 0, 1, -1, 0, 0, 277693],
    [2, 0, 0, -1, 0, 0, 173237],
    [2, 0, -1, 1, 0, 0, 55413],
    [2, 0, -1, -1, 0, 0, 46271],
    [2, 0, 0, 1, 0, 0, 32573],
    [0, 0, 2, 1, 0, 0, 17198],
    [2, 0, 1, -1, 0, 0, 9266],
    [0, 0, 2, -1, 0, 0, 8822],
    [2, -1, 0, -1, 0, 0, 8216],
    [2, 0, -2, -1, 0, 0, 4324],
    [2, 0, 1, 1, 0, 0, 4200],
    [2, 1, 0, -1, 0, 0, -3359],
    [2, -1, -1, 1, 0, 0, 2463],
    [2, -1, 0, 1, 0, 0, 2211],
    [2, -1, -1, -1, 0, 0, 2065],
    [0, 1, -1, -1, 0, 0, -1870],
    [4, 0, -1, -1, 0, 0, 1828],
    [0, 1, 0, 1, 0, 0, -1794],
    [0, 0, 0, 3, 0, 0, -1749],
    [0, 1, -1, 1, 0, 0, -1565],
    [1, 0, 0, 1, 0, 0, -1491],
    [0, 1, 1, 1, 0, 0, -1475],
    [0, 1, 1, -1, 0, 0, -1410],
    [0, 1, 0, -1, 0, 0, -1344],
    [1, 0, 0, -1, 0, 0, -1335],
    [0, 0, 3, 1, 0, 0, 1107],
    [4, 0, 0, -1, 0, 0, 1021],
    [4, 0, -1, 1, 0, 0, 833],
    [0, 0, 1, -3, 0, 0, 777],
    [4, 0, -2, 1, 0, 0, 671],
    [2, 0, 0, -3, 0, 0, 607],
    [2, 0, 2, -1, 0, 0, 596],
    [2, -1, 1, -1, 0, 0, 491],
    [2, 0, -2, 1, 0, 0, -451],
    [0, 0, 3, -1, 0, 0, 439],
    [2, 0, 2, 1, 0, 0, 422],
    [2, 0, -3, -1, 0, 0, 421],
    [2, 1, -1, 1, 0, 0, -366],
    [2, 1, 0, 1, 0, 0, -351],
    [4, 0, 0, 1, 0, 0, 331],
    [2, -1, 1, 1, 0, 0, 315],
    [2, -2, 0, -1, 0, 0, 302],
    [0, 0, 1, 3, 0, 0, -283],
    [2, 1, 1, -1, 0, 0, -229],
    [1, 1, 0, -1, 0, 0, 223],
    [1, 1, 0, 1, 0, 0, 223],
    [0, 1, -2, -1, 0, 0, -220],
    [2, 1, -1, -1, 0, 0, -220],
    [1, 0, 1, 1, 0, 0, -185],
    [2, -1, -2, -1, 0, 0, 181],
    [0, 1, 2, 1, 0, 0, -177],
    [4, 0, -2, -1, 0, 0, 176],
    [4, -1, -1, -1, 0, 0, 166],
    [1, 0, 1, -1, 0, 0, -164],
    [4, 0, 1, -1, 0, 0, 132],
    [1, 0, -1, -1, 0, 0, -119],
    [4, -1, 0, -1, 0, 0, 115],
    [2, -2, 0, 1, 0, 0, 107]
  ]

  function meanElements(T) {
    const T2 = T * T
    const T3 = T2 * T
    return {
      Lp: norm360(
        218.3164477 +
          481267.88123421 * T -
          0.0015786 * T2 +
          T3 / 538841
      ),
      D: norm360(
        297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868
      ),
      M: norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000),
      Mp: norm360(
        134.9633964 +
          477198.8675055 * T +
          0.0087414 * T2 +
          T3 / 69699
      ),
      F: norm360(
        93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000
      ),
      E: 1 - 0.002516 * T - 0.0000074 * T2
    }
  }

  function moonEcliptic(jd) {
    const T = (jd - J2000) / 36525
    const e = meanElements(T)
    const A1 = norm360(119.75 + 131.849 * T)
    const A2 = norm360(53.09 + 479264.290 * T)
    const A3 = norm360(313.45 + 481266.484 * T)

    let sl = 0
    let sr = 0
    let sb = 0

    for (let i = 0; i < MOON_TERMS.length; i++) {
      const t = MOON_TERMS[i]
      const arg = t[0] * e.D + t[1] * e.M + t[2] * e.Mp + t[3] * e.F
      const eFactor = t[1] === 0 ? 1 : Math.abs(t[1]) === 1 ? e.E : e.E * e.E
      sl += t[4] * eFactor * sind(arg)
      sr += t[5] * eFactor * cosd(arg)
      sb += t[6] * eFactor * sind(arg)
    }

    sl += 3958 * sind(A1) + 1962 * sind(e.Lp - e.F) + 318 * sind(A2)
    sb +=
      -2235 * sind(e.Lp) +
      382 * sind(A3) +
      175 * sind(A1 - e.F) +
      175 * sind(A1 + e.F) +
      127 * sind(e.Lp - e.Mp) -
      115 * sind(e.Lp + e.Mp)

    return {
      lon: norm360(e.Lp + sl / 1000000),
      lat: sb / 1000000,
      distance: 385000.56 + sr / 1000
    }
  }

  function sunEcliptic(jd) {
    const T = (jd - J2000) / 36525
    const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T)
    const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M) +
      (0.019993 - 0.000101 * T) * sind(2 * M) +
      0.000289 * sind(3 * M)
    const trueLong = L0 + C
    const omega = 125.04 - 1934.136 * T
    return {
      lon: norm360(trueLong - 0.00569 - 0.00478 * sind(omega)),
      lat: 0,
      distance: 1.000001018 * (1 - 0.016708634) / (1 + 0.016708634 * cosd(M + C))
    }
  }

  function obliquity(jd) {
    const T = (jd - J2000) / 36525
    return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T
  }

  function eclipticToEquatorial(lon, lat, eps) {
    const sl = sind(lon)
    const cl = cosd(lon)
    const sb = sind(lat)
    const cb = cosd(lat)
    const se = sind(eps)
    const ce = cosd(eps)
    const ra = Math.atan2(sl * ce - (sb / cb) * se, cl) * DEG
    const dec = Math.asin(sb * ce + cb * se * sl) * DEG
    return { ra: norm360(ra), dec }
  }

  function moonEquatorial(jd) {
    const m = moonEcliptic(jd)
    const eq = eclipticToEquatorial(m.lon, m.lat, obliquity(jd))
    return {
      ra: eq.ra,
      dec: eq.dec,
      lon: m.lon,
      lat: m.lat,
      distance: m.distance
    }
  }

  function sunEquatorial(jd) {
    const s = sunEcliptic(jd)
    const eq = eclipticToEquatorial(s.lon, 0, obliquity(jd))
    return { ra: eq.ra, dec: eq.dec, lon: s.lon }
  }

  function gmst(jd) {
    const T = (jd - J2000) / 36525
    return norm360(
      280.46061837 +
        360.98564736629 * (jd - J2000) +
        0.000387933 * T * T -
        (T * T * T) / 38710000
    )
  }

  function altitude(jd, lat, lon, ra, dec) {
    const lst = gmst(jd) + lon
    const H = norm360(lst - ra)
    return (
      Math.asin(
        sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H)
      ) * DEG
    )
  }

  function hourAngle(jd, lon, ra) {
    return norm360(gmst(jd) + lon - ra)
  }

  function findCrossings(t0, t1, altFn, target, risingOnly) {
    const STEP = 10 * 60 * 1000
    const out = []
    let prevT = t0
    let prevA = altFn(t0) - target
    for (let t = t0 + STEP; t <= t1; t += STEP) {
      const a = altFn(t) - target
      if (prevA === 0) {
        out.push({ ms: prevT, rising: true })
      } else if ((prevA < 0 && a >= 0) || (prevA > 0 && a <= 0)) {
        let lo = prevT
        let hi = t
        let loV = prevA
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2
          const mv = altFn(mid) - target
          if ((loV < 0 && mv < 0) || (loV > 0 && mv > 0)) {
            lo = mid
            loV = mv
          } else {
            hi = mid
          }
          if (hi - lo < 2000) break
        }
        const rising = prevA < 0
        if (!risingOnly || rising) {
          out.push({ ms: (lo + hi) / 2, rising: rising })
        }
      }
      prevT = t
      prevA = a
    }
    return out
  }

  function findHourAngleCrossing(t0, t1, haFn, target) {
    const STEP = 10 * 60 * 1000
    const norm = (v) => {
      let x = v - target
      while (x > 180) x -= 360
      while (x < -180) x += 360
      return x
    }
    let prevT = t0
    let prevV = norm(haFn(t0))
    for (let t = t0 + STEP; t <= t1; t += STEP) {
      const v = norm(haFn(t))
      if (prevV !== 0 && prevV < 0 && v >= 0) {
        let lo = prevT
        let hi = t
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2
          if (norm(haFn(mid)) < 0) lo = mid
          else hi = mid
          if (hi - lo < 2000) break
        }
        return (lo + hi) / 2
      }
      prevT = t
      prevV = v
    }
    return null
  }

  function localDayRange(ms, tzOffset) {
    const shift = tzOffset * 3600000
    const local = ms + shift
    const dayStartLocal = Math.floor(local / 86400000) * 86400000
    const t0 = dayStartLocal - shift
    return { t0: t0, t1: t0 + 86400000 }
  }

  function sunInfo(ms, lat, lon, tzOffset, dayRange) {
    const range = dayRange || localDayRange(ms, tzOffset)
    const altFn = (t) => {
      const jd = jdFromMs(t)
      const s = sunEquatorial(jd)
      return altitude(jd, lat, lon, s.ra, s.dec)
    }
    const events = findCrossings(range.t0, range.t1, altFn, -0.833, false)
    let rise = null
    let set = null
    events.forEach((e) => {
      if (e.rising && rise === null) rise = e.ms
      if (!e.rising && set === null) set = e.ms
    })
    const noon = findHourAngleCrossing(
      range.t0,
      range.t1,
      (t) => hourAngle(jdFromMs(t), lon, sunEquatorial(jdFromMs(t)).ra),
      0
    )
    return {
      rise: rise,
      set: set,
      noon: noon,
      dec: sunEquatorial(jdFromMs(noon || ms)).dec
    }
  }

  function moonInfo(ms, lat, lon, tzOffset, dayRange) {
    const range = dayRange || localDayRange(ms, tzOffset)
    const jd = jdFromMs(ms)

    const eq = moonEquatorial(jd)
    const sun = sunEquatorial(jd)

    const elongLon = norm360(eq.lon - sun.lon)
    const phase = elongLon / 360

    const cosSep =
      sind(eq.dec) * sind(sun.dec) +
      cosd(eq.dec) * cosd(sun.dec) * cosd(eq.ra - sun.ra)
    const sep = Math.acos(Math.max(-1, Math.min(1, cosSep))) * DEG
    const fraction = (1 - cosd(sep)) / 2

    const parallax =
      Math.asin(6378.14 / eq.distance) * DEG
    const h0 = 0.7275 * parallax - 0.5667

    const altFn = (t) => {
      const j = jdFromMs(t)
      const m = moonEquatorial(j)
      return altitude(j, lat, lon, m.ra, m.dec)
    }
    const haFn = (t) => hourAngle(jdFromMs(t), lon, moonEquatorial(jdFromMs(t)).ra)

    const events = findCrossings(range.t0, range.t1, altFn, h0, false)
    let rise = null
    let set = null
    events.forEach((e) => {
      if (e.rising && rise === null) rise = e.ms
      if (!e.rising && set === null) set = e.ms
    })

    const transit = findHourAngleCrossing(range.t0, range.t1, haFn, 0)
    const underfoot = findHourAngleCrossing(range.t0, range.t1, haFn, 180)

    return {
      phase: phase,
      fraction: fraction,
      age: phase * SYNODIC_MONTH,
      waxing: phase < 0.5,
      rise: rise,
      set: set,
      transit: transit,
      underfoot: underfoot,
      distance: eq.distance
    }
  }

  const PHASE_NAMES = [
    '新月',
    '娥眉月',
    '上弦月',
    '盈凸月',
    '满月',
    '亏凸月',
    '下弦月',
    '残月'
  ]

  function moonPhaseName(phase) {
    const idx = Math.round(norm360(phase * 360) / 45) % 8
    return PHASE_NAMES[idx]
  }

  function moonPhaseIndex(phase) {
    return Math.round(norm360(phase * 360) / 45) % 8
  }

  GT.astro = {
    jdFromMs: jdFromMs,
    msFromJd: msFromJd,
    moonInfo: moonInfo,
    sunInfo: sunInfo,
    moonEquatorial: moonEquatorial,
    sunEquatorial: sunEquatorial,
    gmst: gmst,
    altitude: altitude,
    hourAngle: hourAngle,
    norm360: norm360,
    moonPhaseName: moonPhaseName,
    moonPhaseIndex: moonPhaseIndex,
    localDayRange: localDayRange,
    SYNODIC_MONTH: SYNODIC_MONTH
  }
})(window.GT = window.GT || {})
