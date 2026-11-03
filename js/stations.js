/**
 * 全球点位数据集
 *
 * 类型 type：
 *   port  港口        tide  验潮站（权威潮汐）
 *   island 岛屿       dive  潜水点
 *   wreck 沉船点     surf  冲浪点
 *
 * noaa：NOAA CO-OPS 验潮站编号。有此编号的站点可直接拉取官方调和常数，
 *       离线预测精度等同官方。其余站点默认走「估算模型」。
 *
 * 浏览器版：挂载到全局 GT 命名空间。
 */
(function (GT) {
  'use strict'

  const RAW = [
    /* ---------- 中国 ---------- */
    { id: 'qingdao', name: '青岛', nameEn: 'Qingdao', country: '中国', cc: 'CN', lat: 36.06, lon: 120.38, tz: 8, type: 'port' },
    { id: 'dalian', name: '大连', nameEn: 'Dalian', country: '中国', cc: 'CN', lat: 38.92, lon: 121.63, tz: 8, type: 'port' },
    { id: 'shanghai', name: '上海·吴淞口', nameEn: 'Shanghai', country: '中国', cc: 'CN', lat: 31.40, lon: 121.50, tz: 8, type: 'port' },
    { id: 'ningbo', name: '宁波·舟山', nameEn: 'Ningbo-Zhoushan', country: '中国', cc: 'CN', lat: 29.87, lon: 121.55, tz: 8, type: 'port' },
    { id: 'xiamen', name: '厦门', nameEn: 'Xiamen', country: '中国', cc: 'CN', lat: 24.48, lon: 118.08, tz: 8, type: 'tide' },
    { id: 'guangzhou', name: '广州', nameEn: 'Guangzhou', country: '中国', cc: 'CN', lat: 23.11, lon: 113.32, tz: 8, type: 'tide' },
    { id: 'shenzhen', name: '深圳', nameEn: 'Shenzhen', country: '中国', cc: 'CN', lat: 22.55, lon: 114.10, tz: 8, type: 'port' },
    { id: 'sanya', name: '三亚', nameEn: 'Sanya', country: '中国', cc: 'CN', lat: 18.25, lon: 109.51, tz: 8, type: 'port' },
    { id: 'haikou', name: '海口', nameEn: 'Haikou', country: '中国', cc: 'CN', lat: 20.04, lon: 110.34, tz: 8, type: 'port' },
    { id: 'beihai', name: '北海', nameEn: 'Beihai', country: '中国', cc: 'CN', lat: 21.48, lon: 109.12, tz: 8, type: 'port' },
    { id: 'tianjin', name: '天津', nameEn: 'Tianjin', country: '中国', cc: 'CN', lat: 39.00, lon: 117.70, tz: 8, type: 'port' },
    { id: 'weihai', name: '威海', nameEn: 'Weihai', country: '中国', cc: 'CN', lat: 37.51, lon: 122.12, tz: 8, type: 'port' },
    { id: 'wenzhou', name: '温州', nameEn: 'Wenzhou', country: '中国', cc: 'CN', lat: 28.00, lon: 120.70, tz: 8, type: 'tide' },
    { id: 'quanzhou', name: '泉州', nameEn: 'Quanzhou', country: '中国', cc: 'CN', lat: 24.88, lon: 118.68, tz: 8, type: 'port' },
    { id: 'qinhuangdao', name: '秦皇岛', nameEn: 'Qinhuangdao', country: '中国', cc: 'CN', lat: 39.93, lon: 119.60, tz: 8, type: 'tide' },
    { id: 'hongkong', name: '香港', nameEn: 'Hong Kong', country: '中国', cc: 'HK', lat: 22.30, lon: 114.17, tz: 8, type: 'tide' },
    { id: 'kaohsiung', name: '高雄', nameEn: 'Kaohsiung', country: '中国', cc: 'TW', lat: 22.62, lon: 120.28, tz: 8, type: 'port' },
    { id: 'keelung', name: '基隆', nameEn: 'Keelung', country: '中国', cc: 'TW', lat: 25.13, lon: 121.74, tz: 8, type: 'port' },

    /* ---------- 日本 · 韩国 ---------- */
    { id: 'tokyo', name: '东京', nameEn: 'Tokyo', country: '日本', cc: 'JP', lat: 35.67, lon: 139.77, tz: 9, type: 'port' },
    { id: 'yokohama', name: '横滨', nameEn: 'Yokohama', country: '日本', cc: 'JP', lat: 35.44, lon: 139.65, tz: 9, type: 'port' },
    { id: 'osaka', name: '大阪', nameEn: 'Osaka', country: '日本', cc: 'JP', lat: 34.65, lon: 135.43, tz: 9, type: 'port' },
    { id: 'kobe', name: '神户', nameEn: 'Kobe', country: '日本', cc: 'JP', lat: 34.68, lon: 135.19, tz: 9, type: 'port' },
    { id: 'nagoya', name: '名古屋', nameEn: 'Nagoya', country: '日本', cc: 'JP', lat: 35.18, lon: 136.90, tz: 9, type: 'port' },
    { id: 'naha', name: '那霸', nameEn: 'Naha', country: '日本', cc: 'JP', lat: 26.21, lon: 127.67, tz: 9, type: 'tide' },
    { id: 'busan', name: '釜山', nameEn: 'Busan', country: '韩国', cc: 'KR', lat: 35.10, lon: 129.04, tz: 9, type: 'port' },
    { id: 'incheon', name: '仁川', nameEn: 'Incheon', country: '韩国', cc: 'KR', lat: 37.46, lon: 126.62, tz: 9, type: 'tide' },
    { id: 'jeju', name: '济州', nameEn: 'Jeju', country: '韩国', cc: 'KR', lat: 33.50, lon: 126.53, tz: 9, type: 'island' },

    /* ---------- 东南亚 ---------- */
    { id: 'singapore', name: '新加坡', nameEn: 'Singapore', country: '新加坡', cc: 'SG', lat: 1.26, lon: 103.82, tz: 8, type: 'port' },
    { id: 'bangkok', name: '曼谷', nameEn: 'Bangkok', country: '泰国', cc: 'TH', lat: 13.72, lon: 100.55, tz: 7, type: 'port' },
    { id: 'phuket', name: '普吉', nameEn: 'Phuket', country: '泰国', cc: 'TH', lat: 7.88, lon: 98.39, tz: 7, type: 'island' },
    { id: 'hochiminh', name: '胡志明市', nameEn: 'Ho Chi Minh', country: '越南', cc: 'VN', lat: 10.77, lon: 106.70, tz: 7, type: 'port' },
    { id: 'danang', name: '岘港', nameEn: 'Da Nang', country: '越南', cc: 'VN', lat: 16.07, lon: 108.22, tz: 7, type: 'port' },
    { id: 'kualalumpur', name: '吉隆坡·巴生港', nameEn: 'Port Klang', country: '马来西亚', cc: 'MY', lat: 3.00, lon: 101.40, tz: 8, type: 'port' },
    { id: 'manila', name: '马尼拉', nameEn: 'Manila', country: '菲律宾', cc: 'PH', lat: 14.60, lon: 120.97, tz: 8, type: 'port' },
    { id: 'cebu', name: '宿务', nameEn: 'Cebu', country: '菲律宾', cc: 'PH', lat: 10.32, lon: 123.90, tz: 8, type: 'port' },
    { id: 'jakarta', name: '雅加达', nameEn: 'Jakarta', country: '印尼', cc: 'ID', lat: -6.11, lon: 106.85, tz: 7, type: 'port' },
    { id: 'surabaya', name: '泗水', nameEn: 'Surabaya', country: '印尼', cc: 'ID', lat: -7.25, lon: 112.75, tz: 7, type: 'port' },
    { id: 'bali', name: '巴厘·登巴萨', nameEn: 'Denpasar', country: '印尼', cc: 'ID', lat: -8.65, lon: 115.22, tz: 8, type: 'island' },
    { id: 'sipadan', name: '诗巴丹', nameEn: 'Sipadan', country: '马来西亚', cc: 'MY', lat: 4.11, lon: 118.63, tz: 8, type: 'dive' },
    { id: 'palawan', name: '巴拉望', nameEn: 'Palawan', country: '菲律宾', cc: 'PH', lat: 9.74, lon: 118.74, tz: 8, type: 'island' },
    { id: 'subicbay', name: '苏比克湾沉船', nameEn: 'Subic Bay', country: '菲律宾', cc: 'PH', lat: 14.80, lon: 120.30, tz: 8, type: 'wreck' },

    /* ---------- 南亚 · 中东 ---------- */
    { id: 'mumbai', name: '孟买', nameEn: 'Mumbai', country: '印度', cc: 'IN', lat: 18.98, lon: 72.83, tz: 5.5, type: 'port' },
    { id: 'chennai', name: '金奈', nameEn: 'Chennai', country: '印度', cc: 'IN', lat: 13.08, lon: 80.28, tz: 5.5, type: 'port' },
    { id: 'kochi', name: '科钦', nameEn: 'Kochi', country: '印度', cc: 'IN', lat: 9.97, lon: 76.24, tz: 5.5, type: 'port' },
    { id: 'colombo', name: '科伦坡', nameEn: 'Colombo', country: '斯里兰卡', cc: 'LK', lat: 6.93, lon: 79.85, tz: 5.5, type: 'port' },
    { id: 'male', name: '马尔代夫·马累', nameEn: 'Malé', country: '马尔代夫', cc: 'MV', lat: 4.17, lon: 73.51, tz: 5, type: 'island' },
    { id: 'ariatoll', name: '阿里环礁', nameEn: 'Ari Atoll', country: '马尔代夫', cc: 'MV', lat: 3.88, lon: 72.85, tz: 5, type: 'dive' },
    { id: 'chattogram', name: '吉大港', nameEn: 'Chattogram', country: '孟加拉', cc: 'BD', lat: 22.34, lon: 91.83, tz: 6, type: 'port' },
    { id: 'karachi', name: '卡拉奇', nameEn: 'Karachi', country: '巴基斯坦', cc: 'PK', lat: 24.86, lon: 67.01, tz: 5, type: 'port' },
    { id: 'dubai', name: '迪拜', nameEn: 'Dubai', country: '阿联酋', cc: 'AE', lat: 25.27, lon: 55.30, tz: 4, type: 'port' },
    { id: 'abudhabi', name: '阿布扎比', nameEn: 'Abu Dhabi', country: '阿联酋', cc: 'AE', lat: 24.45, lon: 54.38, tz: 4, type: 'port' },
    { id: 'doha', name: '多哈', nameEn: 'Doha', country: '卡塔尔', cc: 'QA', lat: 25.29, lon: 51.53, tz: 3, type: 'port' },
    { id: 'kuwait', name: '科威特城', nameEn: 'Kuwait City', country: '科威特', cc: 'KW', lat: 29.37, lon: 47.98, tz: 3, type: 'port' },
    { id: 'muscat', name: '马斯喀特', nameEn: 'Muscat', country: '阿曼', cc: 'OM', lat: 23.61, lon: 58.59, tz: 4, type: 'port' },
    { id: 'sharm', name: '沙姆沙伊赫', nameEn: 'Sharm El-Sheikh', country: '埃及', cc: 'EG', lat: 27.92, lon: 34.33, tz: 2, type: 'dive' },

    /* ---------- 非洲 ---------- */
    { id: 'capetown', name: '开普敦', nameEn: 'Cape Town', country: '南非', cc: 'ZA', lat: -33.92, lon: 18.42, tz: 2, type: 'port' },
    { id: 'durban', name: '德班', nameEn: 'Durban', country: '南非', cc: 'ZA', lat: -29.86, lon: 31.02, tz: 2, type: 'port' },
    { id: 'casablanca', name: '卡萨布兰卡', nameEn: 'Casablanca', country: '摩洛哥', cc: 'MA', lat: 33.60, lon: -7.61, tz: 1, type: 'port' },
    { id: 'daressalaam', name: '达累斯萨拉姆', nameEn: 'Dar es Salaam', country: '坦桑尼亚', cc: 'TZ', lat: -6.79, lon: 39.28, tz: 3, type: 'port' },
    { id: 'mombasa', name: '蒙巴萨', nameEn: 'Mombasa', country: '肯尼亚', cc: 'KE', lat: -4.04, lon: 39.66, tz: 3, type: 'port' },
    { id: 'victoria', name: '塞舌尔·维多利亚', nameEn: 'Victoria', country: '塞舌尔', cc: 'SC', lat: -4.62, lon: 55.45, tz: 4, type: 'island' },

    /* ---------- 欧洲 ---------- */
    { id: 'london', name: '伦敦', nameEn: 'London', country: '英国', cc: 'GB', lat: 51.50, lon: -0.12, tz: 0, dst: 'eu', type: 'tide' },
    { id: 'liverpool', name: '利物浦', nameEn: 'Liverpool', country: '英国', cc: 'GB', lat: 53.41, lon: -3.00, tz: 0, dst: 'eu', type: 'port' },
    { id: 'southampton', name: '南安普顿', nameEn: 'Southampton', country: '英国', cc: 'GB', lat: 50.90, lon: -1.40, tz: 0, dst: 'eu', type: 'port' },
    { id: 'rotterdam', name: '鹿特丹', nameEn: 'Rotterdam', country: '荷兰', cc: 'NL', lat: 51.92, lon: 4.48, tz: 1, dst: 'eu', type: 'port' },
    { id: 'amsterdam', name: '阿姆斯特丹', nameEn: 'Amsterdam', country: '荷兰', cc: 'NL', lat: 52.37, lon: 4.90, tz: 1, dst: 'eu', type: 'port' },
    { id: 'hamburg', name: '汉堡', nameEn: 'Hamburg', country: '德国', cc: 'DE', lat: 53.55, lon: 9.99, tz: 1, dst: 'eu', type: 'port' },
    { id: 'lisbon', name: '里斯本', nameEn: 'Lisbon', country: '葡萄牙', cc: 'PT', lat: 38.72, lon: -9.14, tz: 0, dst: 'eu', type: 'port' },
    { id: 'marseille', name: '马赛', nameEn: 'Marseille', country: '法国', cc: 'FR', lat: 43.30, lon: 5.37, tz: 1, dst: 'eu', type: 'port' },
    { id: 'genoa', name: '热那亚', nameEn: 'Genoa', country: '意大利', cc: 'IT', lat: 44.41, lon: 8.93, tz: 1, dst: 'eu', type: 'port' },
    { id: 'barcelona', name: '巴塞罗那', nameEn: 'Barcelona', country: '西班牙', cc: 'ES', lat: 41.38, lon: 2.18, tz: 1, dst: 'eu', type: 'port' },
    { id: 'athens', name: '雅典', nameEn: 'Athens', country: '希腊', cc: 'GR', lat: 37.98, lon: 23.73, tz: 2, dst: 'eu', type: 'port' },
    { id: 'istanbul', name: '伊斯坦布尔', nameEn: 'Istanbul', country: '土耳其', cc: 'TR', lat: 41.01, lon: 28.98, tz: 3, type: 'port' },
    { id: 'stpetersburg', name: '圣彼得堡', nameEn: 'St. Petersburg', country: '俄罗斯', cc: 'RU', lat: 59.94, lon: 30.31, tz: 3, type: 'port' },
    { id: 'helsinki', name: '赫尔辛基', nameEn: 'Helsinki', country: '芬兰', cc: 'FI', lat: 60.17, lon: 24.94, tz: 2, dst: 'eu', type: 'port' },
    { id: 'reykjavik', name: '雷克雅未克', nameEn: 'Reykjavik', country: '冰岛', cc: 'IS', lat: 64.15, lon: -21.94, tz: 0, type: 'port' },
    { id: 'biarritz', name: '比亚里茨', nameEn: 'Biarritz', country: '法国', cc: 'FR', lat: 43.48, lon: -1.56, tz: 1, dst: 'eu', type: 'surf' },
    { id: 'scapaflow', name: '斯卡帕湾沉船', nameEn: 'Scapa Flow', country: '英国', cc: 'GB', lat: 58.90, lon: -3.05, tz: 0, dst: 'eu', type: 'wreck' },

    /* ---------- 北美 ---------- */
    { id: 'newyork', name: '纽约·炮台公园', nameEn: 'New York', country: '美国', cc: 'US', lat: 40.70, lon: -74.01, tz: -5, dst: 'us', type: 'tide', noaa: '8518750' },
    { id: 'boston', name: '波士顿', nameEn: 'Boston', country: '美国', cc: 'US', lat: 42.35, lon: -71.05, tz: -5, dst: 'us', type: 'tide', noaa: '8443970' },
    { id: 'miami', name: '迈阿密', nameEn: 'Miami', country: '美国', cc: 'US', lat: 25.77, lon: -80.13, tz: -5, dst: 'us', type: 'port', noaa: '8723214' },
    { id: 'neworleans', name: '新奥尔良', nameEn: 'New Orleans', country: '美国', cc: 'US', lat: 29.95, lon: -90.07, tz: -6, dst: 'us', type: 'port' },
    { id: 'galveston', name: '加尔维斯顿', nameEn: 'Galveston', country: '美国', cc: 'US', lat: 29.31, lon: -94.79, tz: -6, dst: 'us', type: 'tide', noaa: '8771450' },
    { id: 'losangeles', name: '洛杉矶', nameEn: 'Los Angeles', country: '美国', cc: 'US', lat: 33.74, lon: -118.28, tz: -8, dst: 'us', type: 'port', noaa: '9410660' },
    { id: 'sanfrancisco', name: '旧金山', nameEn: 'San Francisco', country: '美国', cc: 'US', lat: 37.81, lon: -122.47, tz: -8, dst: 'us', type: 'tide', noaa: '9414290' },
    { id: 'sandiego', name: '圣地亚哥', nameEn: 'San Diego', country: '美国', cc: 'US', lat: 32.71, lon: -117.17, tz: -8, dst: 'us', type: 'port', noaa: '9410170' },
    { id: 'seattle', name: '西雅图', nameEn: 'Seattle', country: '美国', cc: 'US', lat: 47.60, lon: -122.34, tz: -8, dst: 'us', type: 'tide', noaa: '9447130' },
    { id: 'honolulu', name: '檀香山', nameEn: 'Honolulu', country: '美国', cc: 'US', lat: 21.31, lon: -157.87, tz: -10, type: 'tide', noaa: '1612340' },
    { id: 'anchorage', name: '安克雷奇', nameEn: 'Anchorage', country: '美国', cc: 'US', lat: 61.22, lon: -149.90, tz: -9, dst: 'us', type: 'port', noaa: '9455920' },
    { id: 'vancouver', name: '温哥华', nameEn: 'Vancouver', country: '加拿大', cc: 'CA', lat: 49.28, lon: -123.12, tz: -8, dst: 'us', type: 'port' },
    { id: 'halifax', name: '哈利法克斯', nameEn: 'Halifax', country: '加拿大', cc: 'CA', lat: 44.65, lon: -63.57, tz: -4, dst: 'us', type: 'port' },
    { id: 'northshore', name: '欧胡岛北岸', nameEn: 'North Shore', country: '美国', cc: 'US', lat: 21.66, lon: -158.05, tz: -10, type: 'surf' },
    { id: 'maui', name: '毛伊岛', nameEn: 'Maui', country: '美国', cc: 'US', lat: 20.80, lon: -156.33, tz: -10, type: 'surf' },

    /* ---------- 拉丁美洲 ---------- */
    { id: 'cancun', name: '坎昆', nameEn: 'Cancún', country: '墨西哥', cc: 'MX', lat: 21.16, lon: -86.85, tz: -5, type: 'port' },
    { id: 'rio', name: '里约热内卢', nameEn: 'Rio de Janeiro', country: '巴西', cc: 'BR', lat: -22.91, lon: -43.17, tz: -3, type: 'port' },
    { id: 'buenosaires', name: '布宜诺斯艾利斯', nameEn: 'Buenos Aires', country: '阿根廷', cc: 'AR', lat: -34.60, lon: -58.38, tz: -3, type: 'port' },
    { id: 'valparaiso', name: '瓦尔帕莱索', nameEn: 'Valparaíso', country: '智利', cc: 'CL', lat: -33.05, lon: -71.63, tz: -4, type: 'port' },
    { id: 'callao', name: '卡亚俄', nameEn: 'Callao', country: '秘鲁', cc: 'PE', lat: -12.05, lon: -77.15, tz: -5, type: 'port' },
    { id: 'panamacity', name: '巴拿马城', nameEn: 'Panama City', country: '巴拿马', cc: 'PA', lat: 8.98, lon: -79.52, tz: -5, type: 'port' },
    { id: 'bluehole', name: '伯利兹大蓝洞', nameEn: 'Great Blue Hole', country: '伯利兹', cc: 'BZ', lat: 17.32, lon: -87.53, tz: -6, type: 'dive' },
    { id: 'galapagos', name: '加拉帕戈斯', nameEn: 'Galápagos', country: '厄瓜多尔', cc: 'EC', lat: -0.74, lon: -90.30, tz: -6, type: 'dive' },

    /* ---------- 大洋洲 ---------- */
    { id: 'sydney', name: '悉尼', nameEn: 'Sydney', country: '澳大利亚', cc: 'AU', lat: -33.87, lon: 151.21, tz: 10, dst: 'au', type: 'port' },
    { id: 'melbourne', name: '墨尔本', nameEn: 'Melbourne', country: '澳大利亚', cc: 'AU', lat: -37.81, lon: 144.96, tz: 10, dst: 'au', type: 'port' },
    { id: 'brisbane', name: '布里斯班', nameEn: 'Brisbane', country: '澳大利亚', cc: 'AU', lat: -27.47, lon: 153.03, tz: 10, type: 'port' },
    { id: 'perth', name: '珀斯', nameEn: 'Perth', country: '澳大利亚', cc: 'AU', lat: -31.95, lon: 115.86, tz: 8, type: 'port' },
    { id: 'goldcoast', name: '黄金海岸', nameEn: 'Gold Coast', country: '澳大利亚', cc: 'AU', lat: -28.02, lon: 153.43, tz: 10, type: 'surf' },
    { id: 'cairns', name: '凯恩斯·大堡礁', nameEn: 'Great Barrier Reef', country: '澳大利亚', cc: 'AU', lat: -16.92, lon: 145.77, tz: 10, type: 'dive' },
    { id: 'auckland', name: '奥克兰', nameEn: 'Auckland', country: '新西兰', cc: 'NZ', lat: -36.85, lon: 174.76, tz: 12, dst: 'nz', type: 'port' },
    { id: 'suva', name: '苏瓦', nameEn: 'Suva', country: '斐济', cc: 'FJ', lat: -18.14, lon: 178.44, tz: 12, type: 'port' },
    { id: 'papeete', name: '帕皮提', nameEn: 'Papeete', country: '法属波利尼西亚', cc: 'PF', lat: -17.54, lon: -149.57, tz: -10, type: 'island' },
    { id: 'palau', name: '帕劳', nameEn: 'Palau', country: '帕劳', cc: 'PW', lat: 7.34, lon: 134.47, tz: 9, type: 'dive' },
    { id: 'chuuk', name: '楚克环礁沉船', nameEn: 'Chuuk Lagoon', country: '密克罗尼西亚', cc: 'FM', lat: 7.42, lon: 151.84, tz: 10, type: 'wreck' },
    { id: 'bikini', name: '比基尼环礁沉船', nameEn: 'Bikini Atoll', country: '马绍尔群岛', cc: 'MH', lat: 11.60, lon: 165.38, tz: 12, type: 'wreck' }
  ]

  const DST = { eu: 'eu', us: 'us', au: 'au', nz: 'nz' }

  RAW.forEach((s) => {
    s.dst = DST[s.dst] || null
  })

  const INDEX = {}
  RAW.forEach((s) => {
    INDEX[s.id] = s
  })

  const TYPE_LABEL = {
    port: '港口',
    tide: '验潮站',
    island: '岛屿',
    dive: '潜水点',
    wreck: '沉船点',
    surf: '冲浪点'
  }

  function get(id) {
    return INDEX[id] || null
  }

  function all() {
    return RAW
  }

  function byType(type) {
    return RAW.filter((s) => s.type === type)
  }

  function search(q) {
    if (!q) return RAW.slice()
    const kw = String(q).trim().toLowerCase()
    const exact = []
    const fuzzy = []
    RAW.forEach((s) => {
      const hay = (s.name + ' ' + (s.nameEn || '') + ' ' + s.country).toLowerCase()
      if (s.name.toLowerCase() === kw || (s.nameEn && s.nameEn.toLowerCase() === kw)) {
        exact.push(s)
      } else if (hay.indexOf(kw) !== -1) {
        fuzzy.push(s)
      }
    })
    return exact.concat(fuzzy)
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  function near(lat, lon, limit) {
    return RAW.map((s) => ({
      station: s,
      dist: distanceKm(lat, lon, s.lat, s.lon)
    }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit || 12)
  }

  GT.stations = {
    all: all,
    get: get,
    byType: byType,
    search: search,
    near: near,
    distanceKm: distanceKm,
    TYPE_LABEL: TYPE_LABEL,
    count: RAW.length
  }
})(window.GT = window.GT || {})
