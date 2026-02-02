/**
 * 地震数据格式化工具
 */

/**
 * 格式化日期时间
 * @param {string|Date} date - 日期字符串或Date对象
 * @param {string} format - 格式类型: 'full' | 'short' | 'time' | 'relative'
 * @returns {string}
 */
export function formatDateTime(date, format = 'full') {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  // 相对时间
  if (format === 'relative') {
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return formatDateTime(d, 'short');
  }
  
  // 完整格式
  if (format === 'full') {
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // 简短格式
  if (format === 'short') {
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 仅时间
  if (format === 'time') {
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toISOString();
}

/**
 * 格式化震级
 * @param {number} magnitude - 震级数值
 * @param {number} decimals - 小数位数
 * @returns {string}
 */
export function formatMagnitude(magnitude, decimals = 1) {
  if (magnitude === null || magnitude === undefined) return '--';
  return magnitude.toFixed(decimals);
}

/**
 * 格式化深度
 * @param {number} depth - 深度(公里)
 * @returns {string}
 */
export function formatDepth(depth) {
  if (depth === null || depth === undefined) return '-- km';
  return `${Math.round(depth)} km`;
}

/**
 * 格式化距离
 * @param {number} distance - 距离(公里)
 * @returns {string}
 */
export function formatDistance(distance) {
  if (distance === null || distance === undefined) return '--';
  if (distance < 1) return `${(distance * 1000).toFixed(0)} m`;
  if (distance < 1000) return `${distance.toFixed(1)} km`;
  return `${(distance / 1000).toFixed(1)} 千公里`;
}

/**
 * 格式化坐标
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {string}
 */
export function formatCoordinates(lat, lng) {
  if (lat === null || lng === null) return '--';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir} ${Math.abs(lng).toFixed(2)}°${lngDir}`;
}

/**
 * 获取震级分类
 * @param {number} magnitude - 震级
 * @returns {Object} 分类信息
 */
export function getMagnitudeClass(magnitude) {
  if (magnitude < 2.0) {
    return { 
      label: '微震', 
      class: 'mag-micro', 
      color: '#00d9a5',
      description: '通常无感，仪器可记录'
    };
  }
  if (magnitude < 3.0) {
    return { 
      label: '小震', 
      class: 'mag-minor', 
      color: '#00a8e8',
      description: '少数敏感者可能察觉'
    };
  }
  if (magnitude < 4.0) {
    return { 
      label: '轻震', 
      class: 'mag-light', 
      color: '#5ac8fa',
      description: '室内大多数人可感觉'
    };
  }
  if (magnitude < 5.0) {
    return { 
      label: '中震', 
      class: 'mag-moderate', 
      color: '#ffcc00',
      description: '普遍有感，物品摇晃'
    };
  }
  if (magnitude < 6.0) {
    return { 
      label: '强震', 
      class: 'mag-strong', 
      color: '#ff9500',
      description: '可能造成轻微破坏'
    };
  }
  if (magnitude < 7.0) {
    return { 
      label: '大震', 
      class: 'mag-major', 
      color: '#ff6b35',
      description: '可能造成严重破坏'
    };
  }
  return { 
    label: '巨震', 
    class: 'mag-great', 
    color: '#ff2d55',
    description: '毁灭性破坏'
  };
}

/**
 * 获取深度分类
 * @param {number} depth - 深度(公里)
 * @returns {Object}
 */
export function getDepthClass(depth) {
  if (depth < 70) {
    return { 
      label: '浅源', 
      class: 'depth-shallow', 
      color: '#00d9a5',
      description: '< 70km'
    };
  }
  if (depth < 300) {
    return { 
      label: '中源', 
      class: 'depth-intermediate', 
      color: '#ffcc00',
      description: '70-300km'
    };
  }
  return { 
    label: '深源', 
    class: 'depth-deep', 
    color: '#ff2d55',
    description: '> 300km'
  };
}

/**
 * 格式化地点名称
 * @param {string} place - 地点字符串
 * @returns {string}
 */
export function formatPlace(place) {
  if (!place) return '未知地点';
  // 移除 "km XX of" 前缀，只保留地点名
  return place.replace(/^\d+\s*km\s+[A-Z]+\s+of\s+/i, '');
}

/**
 * 提取地区信息
 * @param {string} place - 地点字符串
 * @returns {Object}
 */
export function parseLocation(place) {
  if (!place) return { distance: null, direction: null, region: '未知' };
  
  const match = place.match(/^(\d+)\s*km\s+([A-Z]+)\s+of\s+(.+)$/i);
  if (match) {
    return {
      distance: parseInt(match[1]),
      direction: match[2],
      region: match[3].trim()
    };
  }
  
  return {
    distance: null,
    direction: null,
    region: place
  };
}

/**
 * 格式化数字
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string}
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '--';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * 格式化持续时间
 * @param {number} milliseconds - 毫秒数
 * @returns {string}
 */
export function formatDuration(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * 截断文本
 * @param {string} text - 文本
 * @param {number} maxLength - 最大长度
 * @returns {string}
 */
export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
