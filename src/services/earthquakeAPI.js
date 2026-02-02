/**
 * 地震数据API服务
 * 数据源：USGS Earthquake API
 */

const API_BASE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';

// API端点配置
const ENDPOINTS = {
  hour: `${API_BASE}/all_hour.geojson`,
  day: `${API_BASE}/all_day.geojson`,
  week: `${API_BASE}/all_week.geojson`,
  month: `${API_BASE}/all_month.geojson`,
  significantHour: `${API_BASE}/significant_hour.geojson`,
  significantDay: `${API_BASE}/significant_day.geojson`,
  significantWeek: `${API_BASE}/significant_week.geojson`,
  significantMonth: `${API_BASE}/significant_month.geojson`,
};

/**
 * 获取地震数据
 * @param {string} period - 时间周期: 'hour' | 'day' | 'week' | 'month'
 * @param {boolean} significant - 是否只获取显著地震
 * @returns {Promise<Object>}
 */
export async function fetchEarthquakes(period = 'day', significant = false) {
  const key = significant ? `significant${period.charAt(0).toUpperCase() + period.slice(1)}` : period;
  const url = ENDPOINTS[key];
  
  if (!url) {
    throw new Error(`Invalid period: ${period}`);
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return processEarthquakeData(data);
  } catch (error) {
    console.error('Failed to fetch earthquake data:', error);
    throw error;
  }
}

/**
 * 自定义查询地震数据
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export async function queryEarthquakes(params = {}) {
  const {
    startTime,
    endTime,
    minMagnitude = 0,
    maxMagnitude = 10,
    minLatitude = -90,
    maxLatitude = 90,
    minLongitude = -180,
    maxLongitude = 180,
    limit = 100
  } = params;
  
  const queryParams = new URLSearchParams({
    format: 'geojson',
    minmagnitude: minMagnitude.toString(),
    maxmagnitude: maxMagnitude.toString(),
    minlatitude: minLatitude.toString(),
    maxlatitude: maxLatitude.toString(),
    minlongitude: minLongitude.toString(),
    maxlongitude: maxLongitude.toString(),
    limit: limit.toString(),
    orderby: 'time'
  });
  
  if (startTime) {
    queryParams.append('starttime', startTime);
  }
  if (endTime) {
    queryParams.append('endtime', endTime);
  }
  
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return processEarthquakeData(data);
  } catch (error) {
    console.error('Failed to query earthquake data:', error);
    throw error;
  }
}

/**
 * 获取中国区域地震数据
 * @param {string} period - 时间周期
 * @returns {Promise<Object>}
 */
export async function fetchChinaEarthquakes(period = 'week') {
  // 中国大致经纬度范围
  return queryEarthquakes({
    minLatitude: 18,
    maxLatitude: 54,
    minLongitude: 73,
    maxLongitude: 135,
    limit: 200
  });
}

/**
 * 获取最新地震
 * @param {number} count - 数量
 * @returns {Promise<Object>}
 */
export async function fetchLatestEarthquakes(count = 10) {
  const data = await queryEarthquakes({
    limit: count,
    minMagnitude: 2.5
  });
  
  return data;
}

/**
 * 获取特定地震详情
 * @param {string} eventId - 事件ID
 * @returns {Promise<Object>}
 */
export async function fetchEarthquakeDetail(eventId) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${eventId}&format=geojson`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return processEarthquakeFeature(data.features[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch earthquake detail:', error);
    throw error;
  }
}

/**
 * 处理地震数据
 * @param {Object} data - 原始API响应
 * @returns {Object}
 */
function processEarthquakeData(data) {
  if (!data || !data.features) {
    return {
      earthquakes: [],
      metadata: {},
      count: 0
    };
  }
  
  const earthquakes = data.features.map(processEarthquakeFeature);
  
  return {
    earthquakes,
    metadata: data.metadata || {},
    count: earthquakes.length,
    bbox: data.bbox || null
  };
}

/**
 * 处理单个地震特征
 * @param {Object} feature - GeoJSON feature
 * @returns {Object}
 */
function processEarthquakeFeature(feature) {
  const { properties, geometry, id } = feature;
  const [longitude, latitude, depth] = geometry.coordinates;
  
  return {
    id,
    type: properties.type || 'earthquake',
    title: properties.title || '',
    place: properties.place || '',
    mag: properties.mag,
    magnitude: properties.mag, // 别名
    time: properties.time,
    updated: properties.updated,
    timezone: properties.tz,
    url: properties.url,
    detail: properties.detail,
    felt: properties.felt,
    cdi: properties.cdi,
    mmi: properties.mmi,
    alert: properties.alert,
    status: properties.status,
    tsunami: properties.tsunami,
    sig: properties.sig,
    net: properties.net,
    code: properties.code,
    ids: properties.ids,
    sources: properties.sources,
    types: properties.types,
    nst: properties.nst,
    dmin: properties.dmin,
    rms: properties.rms,
    gap: properties.gap,
    magType: properties.magType,
    type: properties.type,
    // 几何数据
    longitude,
    latitude,
    depth,
    coordinates: geometry.coordinates,
    // 计算属性
    isSignificant: properties.mag >= 5.0,
    hasTsunami: properties.tsunami === 1,
    isChina: isInChinaRegion(latitude, longitude)
  };
}

/**
 * 判断是否在中国区域
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {boolean}
 */
function isInChinaRegion(lat, lng) {
  // 简化的中国边界判断
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}

/**
 * 模拟预警数据（用于演示）
 * @returns {Object}
 */
export function generateMockWarning() {
  const locations = [
    { name: '四川汶川', lat: 31.0, lng: 103.4 },
    { name: '云南大理', lat: 25.6, lng: 100.2 },
    { name: '台湾花莲', lat: 23.9, lng: 121.6 },
    { name: '新疆喀什', lat: 39.5, lng: 76.0 },
    { name: '甘肃兰州', lat: 36.0, lng: 103.8 }
  ];
  
  const location = locations[Math.floor(Math.random() * locations.length)];
  const magnitude = (Math.random() * 3 + 4.5).toFixed(1);
  const depth = Math.floor(Math.random() * 20 + 5);
  
  return {
    id: `warning-${Date.now()}`,
    location: location.name,
    latitude: location.lat,
    longitude: location.lng,
    magnitude: parseFloat(magnitude),
    depth,
    time: Date.now(),
    estimatedArrival: 15 + Math.floor(Math.random() * 20),
    intensity: Math.floor(Math.random() * 3 + 5),
    status: 'warning'
  };
}

/**
 * 获取模拟历史数据
 * @param {number} days - 天数
 * @returns {Array}
 */
export function generateMockHistory(days = 7) {
  const data = [];
  const now = Date.now();
  
  for (let i = 0; i < days; i++) {
    const dayStart = now - (i * 24 * 60 * 60 * 1000);
    const count = Math.floor(Math.random() * 50 + 100);
    
    data.push({
      date: new Date(dayStart).toISOString().split('T')[0],
      count,
      maxMagnitude: (Math.random() * 3 + 3).toFixed(1)
    });
  }
  
  return data.reverse();
}

// 缓存管理
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 1分钟

/**
 * 带缓存的获取函数
 * @param {string} key - 缓存键
 * @param {Function} fetcher - 获取函数
 * @returns {Promise<any>}
 */
export async function fetchWithCache(key, fetcher) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * 清除缓存
 */
export function clearCache() {
  cache.clear();
}

/**
 * 轮询更新数据
 * @param {Function} callback - 数据更新回调
 * @param {number} interval - 轮询间隔（毫秒）
 * @returns {Function} 停止轮询函数
 */
export function startPolling(callback, interval = 60000) {
  let isRunning = true;
  
  const poll = async () => {
    if (!isRunning) return;
    
    try {
      const data = await fetchEarthquakes('hour');
      callback(null, data);
    } catch (error) {
      callback(error, null);
    }
    
    if (isRunning) {
      setTimeout(poll, interval);
    }
  };
  
  poll();
  
  return () => {
    isRunning = false;
  };
}
