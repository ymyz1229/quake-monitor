/**
 * 地震数据服务
 * 封装数据获取、解析和缓存逻辑
 */

import { fetchWithRetry, sequentialRequests } from '../utils/fetchWithRetry.js';
import cache from '../utils/cache.js';

// API 配置
const API_CONFIG = {
  wolfx: {
    direct: 'https://api.wolfx.jp/cenc_eqlist.json',
    proxy: '/api/wolfx'
  },
  usgs: {
    direct: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    proxy: '/api/usgs'
  },
  worldBorders: 'https://raw.githubusercontent.com/georgique/world-geojson/master/countries/all.json',
  chinaBorder: 'https://geojson.cn/api/data/china.json',
  chinaProvinces: 'https://geojson.cn/api/data/china-provinces.json'
};

// 国内关键词列表
const DOMESTIC_KEYWORDS = [
  '北京', '天津', '上海', '重庆',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃',
  '青海', '台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆',
  '香港', '澳门', '西沙', '南沙', '中沙', '黄岩岛'
];

/**
 * 获取地震数据（带缓存和备用源）
 * @param {Object} options - 选项
 * @returns {Promise<Array>}
 */
export async function fetchEarthquakeData(options = {}) {
  const { useCache = true, forceRefresh = false } = options;
  const cacheKey = 'earthquake_data';
  
  // 检查缓存
  if (useCache && !forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache] 使用缓存的地震数据');
      return cached;
    }
  }
  
  // 构建请求源列表（按优先级）
  const requests = [
    {
      url: API_CONFIG.wolfx.direct,
      options: {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; QuakeMonitor/1.0)'
        }
      }
    },
    {
      url: API_CONFIG.wolfx.proxy,
      options: {
        headers: { 'Accept': 'application/json' }
      }
    }
  ];
  
  try {
    const data = await sequentialRequests(requests, {
      maxRetries: 2,
      retryDelay: 1000,
      timeout: 10000
    });
    
    const parsed = parseWolfxData(data);
    
    // 缓存数据
    cache.set(cacheKey, parsed, 2 * 60 * 1000); // 缓存2分钟
    
    return parsed;
  } catch (error) {
    console.error('[EarthquakeService] 获取数据失败:', error);
    throw error;
  }
}

/**
 * 解析 Wolfx 数据格式
 * @param {Object} data - 原始数据
 * @returns {Array}
 */
function parseWolfxData(data) {
  const earthquakes = [];
  
  Object.keys(data).forEach(key => {
    if (key.startsWith('No')) {
      const item = data[key];
      const timeStr = item.time || item.ReportTime;
      const timestamp = new Date(timeStr).getTime();
      
      earthquakes.push({
        id: item.EventID || key,
        mag: parseFloat(item.magnitude) || 0,
        place: item.location || item.placeName || '未知地点',
        time: timestamp,
        timeStr: timeStr,
        depth: parseFloat(item.depth) || 0,
        latitude: parseFloat(item.latitude) || 0,
        longitude: parseFloat(item.longitude) || 0,
        intensity: item.intensity,
        type: item.type,
        source: 'cenc'
      });
    }
  });
  
  return earthquakes.sort((a, b) => b.time - a.time);
}

/**
 * 获取边界数据（带缓存）
 * @param {string} type - 边界类型：world | china | provinces
 * @returns {Promise<Object>}
 */
export async function fetchBorderData(type) {
  const cacheKey = `border_${type}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  let url;
  switch (type) {
    case 'world':
      url = API_CONFIG.worldBorders;
      break;
    case 'china':
      url = API_CONFIG.chinaBorder;
      break;
    case 'provinces':
      url = API_CONFIG.chinaProvinces;
      break;
    default:
      throw new Error(`未知的边界类型: ${type}`);
  }
  
  try {
    const response = await fetchWithRetry(url, {}, {
      maxRetries: 2,
      timeout: 15000
    });
    
    const data = await response.json();
    
    // 边界数据缓存较长时间（1小时）
    cache.set(cacheKey, data, 60 * 60 * 1000);
    
    return data;
  } catch (error) {
    console.warn(`[EarthquakeService] 加载${type}边界数据失败:`, error);
    return null;
  }
}

/**
 * 判断是否为国内地震
 * @param {string} place - 地点名称
 * @returns {boolean}
 */
export function isDomestic(place) {
  if (!place) return false;
  return DOMESTIC_KEYWORDS.some(keyword => place.includes(keyword));
}

/**
 * 提取省份名称
 * @param {string} place - 地点名称
 * @returns {string}
 */
export function extractProvince(place) {
  if (!place) return '未知';
  
  const patterns = [
    /^(北京|天津|上海|重庆)/,
    /^(河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾)/,
    /^(内蒙古|广西|西藏|宁夏|新疆)/,
    /^(香港|澳门)/
  ];
  
  for (const pattern of patterns) {
    const match = place.match(pattern);
    if (match) return match[1];
  }
  
  return '国内';
}

/**
 * 根据震级获取颜色
 * @param {number} mag - 震级
 * @returns {string}
 */
export function getMagColor(mag) {
  const m = mag || 0;
  if (m < 2.5) return '#00d9a5';
  if (m < 3.5) return '#00a8e8';
  if (m < 4.5) return '#5ac8fa';
  if (m < 5.5) return '#ffcc00';
  if (m < 6.5) return '#ff9500';
  if (m < 7.0) return '#ff6b35';
  return '#ff2d55';
}

/**
 * 根据震级获取标签
 * @param {number} mag - 震级
 * @returns {string}
 */
export function getMagLabel(mag) {
  const m = mag || 0;
  if (m < 2.5) return '微震';
  if (m < 3.5) return '小震';
  if (m < 4.5) return '轻震';
  if (m < 5.5) return '中震';
  if (m < 6.5) return '强震';
  if (m < 7.0) return '大震';
  return '巨震';
}

/**
 * 根据震级获取描述
 * @param {number} mag - 震级
 * @returns {string}
 */
export function getMagDesc(mag) {
  const m = mag || 0;
  if (m < 2.5) return '通常无感，仪器可记录';
  if (m < 3.5) return '少数敏感者可能察觉';
  if (m < 4.5) return '室内大多数人可感觉';
  if (m < 5.5) return '普遍有感，物品摇晃';
  if (m < 6.5) return '可能造成轻微破坏';
  if (m < 7.0) return '可能造成严重破坏';
  return '毁灭性破坏';
}

/**
 * 格式化时间显示
 * @param {number} timestamp - 时间戳
 * @returns {string}
 */
export function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}分钟前`;
  }
  
  const date = new Date(timestamp);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * 计算统计数据
 * @param {Array} earthquakes - 地震数据数组
 * @returns {Object}
 */
export function calculateStats(earthquakes) {
  if (!earthquakes || earthquakes.length === 0) {
    return {
      total: 0,
      maxMag: 0,
      avgMag: 0,
      avgDepth: 0
    };
  }
  
  const total = earthquakes.length;
  const maxMag = Math.max(...earthquakes.map(e => e.mag || 0));
  const avgMag = earthquakes.reduce((a, b) => a + (b.mag || 0), 0) / total;
  const avgDepth = earthquakes.reduce((a, b) => a + (b.depth || 0), 0) / total;
  
  return {
    total,
    maxMag,
    avgMag,
    avgDepth
  };
}

/**
 * 筛选地震数据
 * @param {Array} earthquakes - 地震数据数组
 * @param {Object} filters - 筛选条件
 * @returns {Array}
 */
export function filterEarthquakes(earthquakes, filters = {}) {
  const {
    minMag = 0,
    maxMag = 10,
    startDate = null,
    endDate = null,
    domesticOnly = false,
    overseasOnly = false
  } = filters;
  
  return earthquakes.filter(eq => {
    // 震级筛选
    if (eq.mag < minMag || eq.mag > maxMag) return false;
    
    // 日期筛选
    if (startDate && eq.time < new Date(startDate).getTime()) return false;
    if (endDate && eq.time > new Date(endDate + 'T23:59:59').getTime()) return false;
    
    // 国内/海外筛选
    const isDom = isDomestic(eq.place);
    if (domesticOnly && !isDom) return false;
    if (overseasOnly && isDom) return false;
    
    return true;
  });
}

/**
 * 排序地震数据
 * @param {Array} earthquakes - 地震数据数组
 * @param {string} sortBy - 排序方式：time-desc | time-asc | mag-desc | mag-asc
 * @returns {Array}
 */
export function sortEarthquakes(earthquakes, sortBy = 'time-desc') {
  const sorted = [...earthquakes];
  
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'time-desc':
        return b.time - a.time;
      case 'time-asc':
        return a.time - b.time;
      case 'mag-desc':
        return b.mag - a.mag;
      case 'mag-asc':
        return a.mag - b.mag;
      default:
        return b.time - a.time;
    }
  });
  
  return sorted;
}

export default {
  fetchEarthquakeData,
  fetchBorderData,
  isDomestic,
  extractProvince,
  getMagColor,
  getMagLabel,
  getMagDesc,
  formatTime,
  calculateStats,
  filterEarthquakes,
  sortEarthquakes
};