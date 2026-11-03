/**
 * 鱼种与钓组教程数据。
 * 内容用于一般性海钓入门，实际作钓须遵守当地渔业法规和保护要求。
 */
(function (GT) {
  'use strict'

  const SPECIES = [
    {
      id: 'seabass',
      name: '海鲈鱼',
      alias: '花鲈、七星鲈',
      group: '河口',
      mark: '鲈',
      summary: '掠食性强，常在流口、桥墩和河口追逐小鱼。',
      habitat: '河口、防波堤外沿、桥墩、礁石边缘和有流水的港湾。',
      season: '春末至秋季较活跃，清晨、黄昏及涨落潮转流前后更容易遇到。',
      depth: '常见于水面至 10 米，随水温和饵鱼活动层变化。',
      bait: '活虾、沙蚕、小鱼；路亚可用米诺、软虫和振动饵。',
      rigIds: ['float', 'lure'],
      tip: '先找流线和饵鱼，不要只在静水区反复抛投。'
    },
    {
      id: 'black-bream',
      name: '黑鲷',
      alias: '黑格、乌颊',
      group: '礁岸',
      mark: '鲷',
      summary: '警惕性高，喜欢贴礁、贴结构觅食。',
      habitat: '岩礁、防波堤、消波块、码头桩基和沙泥交界处。',
      season: '春秋两季较稳定，夜间和清晨也能靠岸觅食。',
      depth: '底层至中下层，通常离结构不远。',
      bait: '虾仁、南极虾、沙蚕、小蟹；可搭配轻诱饵聚鱼。',
      rigIds: ['float', 'bottom'],
      tip: '子线不要太粗，先让饵自然下沉，再轻带线感知鱼口。'
    },
    {
      id: 'yellowfin-bream',
      name: '黄鳍鲷',
      alias: '黄脚立、黄鲷',
      group: '内湾',
      mark: '黄',
      summary: '耐盐度变化，常见于内湾和红树林边缘。',
      habitat: '内湾、河口、红树林外缘、养殖区外围和码头阴影处。',
      season: '全年可见，水温回升后的春夏季摄食更积极。',
      depth: '底层与中下层，涨潮时常进入浅滩。',
      bait: '虾、沙蚕、小蟹和贝肉。',
      rigIds: ['float', 'bottom'],
      tip: '小钩细线、轻铅，避免在浅水区制造过大声响。'
    },
    {
      id: 'grouper',
      name: '石斑鱼',
      alias: '过鱼、石斑',
      group: '礁岸',
      mark: '斑',
      summary: '典型的洞穴伏击鱼，中鱼后第一时间钻礁。',
      habitat: '礁石洞穴、沉船、桥墩根部和人工鱼礁。',
      season: '水温较高的季节活跃，夜钓和晨昏更常见。',
      depth: '底层，水深依礁区结构差异较大。',
      bait: '活虾、整只小鱿鱼、鱼块和蟹肉。',
      rigIds: ['bottom', 'boat'],
      tip: '必须放足刹车、及时抬离结构；先确认当地最小尺寸和禁捕要求。'
    },
    {
      id: 'spanish-mackerel',
      name: '鲅鱼',
      alias: '蓝点马鲛、马鲛',
      group: '近海',
      mark: '鲅',
      summary: '高速洄游，常在港外流线和饵鱼群附近追食。',
      habitat: '港外流线、岬角、沙丁鱼群附近和近海开阔水域。',
      season: '晚春至秋季，海面出现追饵炸水时机会更大。',
      depth: '中上层至水面。',
      bait: '小鱼、鱿鱼条；路亚可用铁板、铅笔和米诺。',
      rigIds: ['lure', 'boat'],
      tip: '前导线要能应对牙齿；抛投前检查线结和挂环。'
    },
    {
      id: 'silver-pomfret',
      name: '银鲳',
      alias: '白鲳、鲳鱼',
      group: '近海',
      mark: '鲳',
      summary: '群游鱼，嘴小，吃口轻，常在沙泥底近中层活动。',
      habitat: '沙泥底海湾、河口外缘、码头外流线和近岸缓流区。',
      season: '春季至秋季，潮流平缓时较容易靠边。',
      depth: '中下层，常离底一段距离。',
      bait: '虾肉、鱿鱼条和小鱼块。',
      rigIds: ['float', 'bottom'],
      tip: '用小钩挂软饵，等连续轻点后再果断刺鱼。'
    },
    {
      id: 'mullet',
      name: '鲻鱼',
      alias: '乌头、海乌',
      group: '内湾',
      mark: '鲻',
      summary: '常见于港口和河口水层，吸食细碎饵料。',
      habitat: '港湾、河口、码头、内湾和淡水影响明显的咸淡水区。',
      season: '全年可见，春秋群聚明显。',
      depth: '表层至中层。',
      bait: '面包饵、面团、虾肉碎和轻质诱饵。',
      rigIds: ['float'],
      tip: '先少量多次打窝，浮漂出现连续下沉时再提竿。'
    },
    {
      id: 'sillago',
      name: '沙尖鱼',
      alias: '多鳞鱚、沙锥',
      group: '沙滩',
      mark: '沙',
      summary: '小型底栖鱼，喜欢沙滩近岸的细流。',
      habitat: '沙滩、缓坡沙底、河口外侧和浪花带。',
      season: '水温回升后的春夏秋均可，涨潮近岸阶段较好。',
      depth: '浅水底层。',
      bait: '沙蚕、虾肉条和小块贝肉。',
      rigIds: ['bottom'],
      tip: '使用轻坠和较长前导，减少大浪造成的假信号。'
    },
    {
      id: 'conger-eel',
      name: '海鳗',
      alias: '鳗鱼、星鳗',
      group: '礁岸',
      mark: '鳗',
      summary: '夜行性底栖鱼，嗅觉敏锐，常在缝隙附近伏击。',
      habitat: '礁石缝隙、码头底部、沉船和夜间灯光照到的岸边。',
      season: '夜钓更常见，暖季活性更高。',
      depth: '底层。',
      bait: '鱼块、鱿鱼、虾和沙蚕。',
      rigIds: ['bottom'],
      tip: '牙齿锋利，必须使用防咬前导并配备长嘴钳和控鱼工具。'
    },
    {
      id: 'yellow-croaker',
      name: '大黄鱼',
      alias: '黄花鱼、黄鱼',
      group: '近海',
      mark: '黄',
      summary: '近海底层洄游鱼，对水温、潮流和饵鱼群较敏感。',
      habitat: '近海沙泥底、湾口和潮流变化明显的底层区域。',
      season: '秋冬与初春是常见作钓季，具体受海区资源状况影响。',
      depth: '中下层至底层。',
      bait: '虾、小鱼和鱿鱼条。',
      rigIds: ['boat', 'bottom'],
      tip: '优先选择正规船钓并确认当地捕捞许可、尺寸和数量限制。'
    }
  ]

  const RIGS = [
    {
      id: 'float',
      name: '浮游矶钓组',
      level: '入门',
      target: '黑鲷、黄鳍鲷、鲻鱼、银鲳、海鲈',
      parts: ['竿梢', '主线', '棉线结/挡豆', '阿波浮漂', '水中', '八字环', '氟碳子线', '咬铅', '鱼钩'],
      steps: [
        '主线穿过棉线结和挡豆，设定目标水深。',
        '穿入阿波浮漂，再连接水中或转环。',
        '连接氟碳子线，根据流速分段夹咬铅。',
        '子线末端绑钩，挂饵后先试钓棚，再调整到鱼口层。'
      ],
      note: '风浪较大时增加浮漂号数并减少外露线；避免咬铅集中在一点。'
    },
    {
      id: 'bottom',
      name: '单钩底钓组',
      level: '入门',
      target: '沙尖、黑鲷、石斑、海鳗、银鲳',
      parts: ['主线', '快速别针', '活动铅坠', '缓冲挡豆', '八字环', '子线', '鱼钩'],
      steps: [
        '主线下端依次装入挡豆、活动铅坠和挡豆。',
        '连接八字环或快速别针，确保铅坠可有限滑动。',
        '接上 30–80 厘米子线并根据目标鱼调整粗细。',
        '绑钩挂饵，先探底确认结构高度，再收紧余线。'
      ],
      note: '礁区采用可脱落铅坠更安全；中鱼后先提高竿梢，避免鱼钻缝。'
    },
    {
      id: 'lure',
      name: '路亚前导钓组',
      level: '进阶',
      target: '海鲈、鲅鱼和沿岸掠食鱼',
      parts: ['PE 主线', 'FG/PR 结', '氟碳前导', '连接环', '快速别针', '路亚饵'],
      steps: [
        'PE 主线与氟碳前导用 FG 结连接，收紧后剪净线头。',
        '前导末端绑连接环，建议前导长度为竿长的 1–1.5 倍。',
        '路亚挂快速别针，检查别针弹性与线结。',
        '先近投检查泳姿，再搜索流线、结构边缘和追饵区。'
      ],
      note: '不要用别针直接连接主线；每次挂底脱困后都应检查前导线。'
    },
    {
      id: 'boat',
      name: '船钓天平底组',
      level: '进阶',
      target: '石斑、大黄鱼和近海底层鱼',
      parts: ['船竿主线', '转环', '天秤', '铅坠', '释放绳', '子线', '鱼钩'],
      steps: [
        '主线连接转环，转环下方挂天秤和适配流速的铅坠。',
        '天秤外端接释放绳，保留一定缓冲距离。',
        '释放绳末端连接子线与鱼钩，挂饵后缓慢放线。',
        '触底后收紧虚 line，通过小幅提放感知底部结构。'
      ],
      note: '船钓必须听从船长安排；铅坠过大和挂底抛甩都有伤人风险。'
    }
  ]

  const LINE = '#dbe8e5'
  const ACCENT = '#4fc3b0'
  const GOLD = '#f0b429'
  const DARK = '#0c242b'

  function fishHook(x, y, scale) {
    const s = scale || 1
    return `<path d="M ${x} ${y} v ${18 * s} c 0 ${12 * s} ${17 * s} ${15 * s} ${18 * s} 2" fill="none" stroke="${LINE}" stroke-width="${2.4 * s}" stroke-linecap="round"/><path d="M ${x + 8 * s} ${y + 27 * s} l ${-8 * s} ${-3 * s} ${3 * s} ${9 * s}" fill="none" stroke="${LINE}" stroke-width="${1.8 * s}" stroke-linecap="round"/>`
  }

  function rigDiagram(id) {
    const common = `role="img" aria-label="${id} 钓组结构示意图"`
    if (id === 'float') {
      return `<svg ${common} viewBox="0 0 180 280"><path d="M18 12 H162" stroke="#54707a" stroke-width="3"/><path d="M90 18 V42" stroke="${LINE}" stroke-width="2"/><circle cx="90" cy="62" r="20" fill="${GOLD}" stroke="${DARK}" stroke-width="3"/><path d="M90 42 V84" stroke="${LINE}" stroke-width="2"/><path d="M73 104 H107" stroke="${ACCENT}" stroke-width="4"/><circle cx="90" cy="128" r="7" fill="${DARK}" stroke="${LINE}" stroke-width="2"/><path d="M90 135 V186" stroke="${LINE}" stroke-width="1.6"/><circle cx="84" cy="154" r="4" fill="${GOLD}"/><circle cx="96" cy="172" r="4" fill="${GOLD}"/>${fishHook(90, 206, 1.2)}</svg>`
    }
    if (id === 'bottom') {
      return `<svg ${common} viewBox="0 0 180 280"><path d="M18 12 H162" stroke="#54707a" stroke-width="3"/><path d="M90 18 V72" stroke="${LINE}" stroke-width="2"/><rect x="76" y="72" width="28" height="12" rx="5" fill="${DARK}" stroke="${ACCENT}" stroke-width="2"/><path d="M90 84 V106" stroke="${LINE}" stroke-width="2"/><path d="M72 106 H108" stroke="${ACCENT}" stroke-width="3"/><path d="M72 106 L62 148 L82 148 Z" fill="${GOLD}" stroke="${DARK}" stroke-width="2"/><path d="M90 106 V202" stroke="${LINE}" stroke-width="2"/>${fishHook(90, 202, 1.25)}</svg>`
    }
    if (id === 'lure') {
      return `<svg ${common} viewBox="0 0 180 280"><path d="M18 12 H162" stroke="#54707a" stroke-width="3"/><path d="M90 18 C80 58 100 84 88 112" fill="none" stroke="${LINE}" stroke-width="2"/><circle cx="88" cy="119" r="7" fill="none" stroke="${ACCENT}" stroke-width="3"/><path d="M88 126 V174" stroke="${LINE}" stroke-width="1.7"/><circle cx="88" cy="184" r="8" fill="none" stroke="${LINE}" stroke-width="2"/><path d="M88 192 V216" stroke="${LINE}" stroke-width="2"/><path d="M88 216 C55 222 62 258 90 250 C120 258 124 222 88 216 Z" fill="${ACCENT}" stroke="${LINE}" stroke-width="2"/><circle cx="75" cy="231" r="3" fill="${DARK}"/><circle cx="102" cy="230" r="3" fill="${DARK}"/>${fishHook(88, 248, 0.58)}</svg>`
    }
    return `<svg ${common} viewBox="0 0 180 280"><path d="M18 12 H162" stroke="#54707a" stroke-width="3"/><path d="M90 18 V65" stroke="${LINE}" stroke-width="2"/><rect x="76" y="65" width="28" height="12" rx="5" fill="${DARK}" stroke="${ACCENT}" stroke-width="2"/><path d="M90 77 V102" stroke="${LINE}" stroke-width="2"/><path d="M90 102 H128 L146 172" fill="none" stroke="${ACCENT}" stroke-width="4"/><path d="M128 102 V142" stroke="${LINE}" stroke-width="2"/><path d="M119 142 H137 L128 178 Z" fill="${GOLD}" stroke="${DARK}" stroke-width="2"/><path d="M146 172 V202" stroke="${LINE}" stroke-width="2"/><path d="M128 102 V218" stroke="${LINE}" stroke-width="2"/>${fishHook(128, 218, 1.1)}</svg>`
  }

  GT.guide = {
    species: SPECIES,
    rigs: RIGS,
    rigDiagram: rigDiagram
  }
})(window.GT = window.GT || {})
