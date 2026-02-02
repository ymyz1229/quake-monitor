/**
 * 地震相关计算工具
 */

/**
 * 计算两点间距离（Haversine公式）
 * @param {number} lat1 - 点1纬度
 * @param {number} lng1 - 点1经度
 * @param {number} lat2 - 点2纬度
 * @param {number} lng2 - 点2经度
 * @returns {number} 距离（公里）
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球半径（公里）
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 角度转弧度
 * @param {number} degrees - 角度
 * @returns {number} 弧度
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 计算地震烈度（简化版麦卡利烈度）
 * @param {number} magnitude - 震级
 * @param {number} distance - 距离（公里）
 * @returns {number} 烈度（1-12）
 */
export function calculateIntensity(magnitude, distance = 0) {
  // 基于震级的最大烈度
  let intensity = 1.5 * magnitude - 1;
  
  // 距离衰减
  if (distance > 0) {
    const attenuation = Math.log10(distance / 10) * 2;
    intensity -= Math.max(0, attenuation);
  }
  
  // 限制在1-12范围内
  return Math.max(1, Math.min(12, Math.round(intensity)));
}

/**
 * 获取烈度描述
 * @param {number} intensity - 烈度值（1-12）
 * @returns {Object}
 */
export function getIntensityInfo(intensity) {
  const levels = [
    { level: 1, label: 'I', name: '无感', description: '仅仪器记录', color: '#666' },
    { level: 2, label: 'II', name: '微感', description: '极少数静止者有感', color: '#888' },
    { level: 3, label: 'III', name: '轻感', description: '室内少数人有感', color: '#00d9a5' },
    { level: 4, label: 'IV', name: '有感', description: '室内多数人有感', color: '#00a8e8' },
    { level: 5, label: 'V', name: '强感', description: '室外少数人有感', color: '#5ac8fa' },
    { level: 6, label: 'VI', name: '轻震', description: '器皿作响、悬挂物摇摆', color: '#ffcc00' },
    { level: 7, label: 'VII', name: '中震', description: '房屋轻微损坏', color: '#ff9500' },
    { level: 8, label: 'VIII', name: '强震', description: '房屋严重损坏', color: '#ff6b35' },
    { level: 9, label: 'IX', name: '烈震', description: '房屋倒塌、地面开裂', color: '#ff2d55' },
    { level: 10, label: 'X', name: '大震', description: '建筑物普遍毁坏', color: '#c41e3a' },
    { level: 11, label: 'XI', name: '巨震', description: '灾难性破坏', color: '#8b0000' },
    { level: 12, label: 'XII', name: '毁灭', description: '彻底毁灭', color: '#4a0000' }
  ];
  
  const index = Math.max(0, Math.min(11, Math.round(intensity) - 1));
  return levels[index];
}

/**
 * 计算地震能量（TNT当量）
 * @param {number} magnitude - 震级
 * @returns {Object} 能量信息
 */
export function calculateEnergy(magnitude) {
  // 能量公式：log E = 4.8 + 1.5M (单位：焦耳)
  const energyJoules = Math.pow(10, 4.8 + 1.5 * magnitude);
  const energyTons = energyJoules / 4.184e9; // 转换为吨TNT
  
  let displayValue, displayUnit;
  
  if (energyTons < 1) {
    displayValue = (energyTons * 1000).toFixed(2);
    displayUnit = 'kg TNT';
  } else if (energyTons < 1000) {
    displayValue = energyTons.toFixed(2);
    displayUnit = '吨 TNT';
  } else if (energyTons < 1e6) {
    displayValue = (energyTons / 1000).toFixed(2);
    displayUnit = '千吨 TNT';
  } else if (energyTons < 1e9) {
    displayValue = (energyTons / 1e6).toFixed(2);
    displayUnit = '百万吨 TNT';
  } else {
    displayValue = (energyTons / 1e9).toFixed(2);
    displayUnit = '十亿吨 TNT';
  }
  
  return {
    joules: energyJoules,
    tonsTNT: energyTons,
    displayValue,
    displayUnit
  };
}

/**
 * 计算地震影响半径
 * @param {number} magnitude - 震级
 * @param {number} intensityThreshold - 烈度阈值
 * @returns {number} 半径（公里）
 */
export function calculateImpactRadius(magnitude, intensityThreshold = 4) {
  // 简化的影响半径计算
  const maxIntensity = 1.5 * magnitude - 1;
  const intensityDrop = maxIntensity - intensityThreshold;
  
  if (intensityDrop <= 0) return 0;
  
  return Math.pow(10, intensityDrop / 2 + 1);
}

/**
 * 估算P波和S波到达时间
 * @param {number} distance - 距离（公里）
 * @returns {Object} 到达时间（秒）
 */
export function calculateWaveArrival(distance) {
  // P波速度约 6-7 km/s
  const pWaveSpeed = 6.5;
  // S波速度约 3.5-4 km/s
  const sWaveSpeed = 3.7;
  
  return {
    pWave: distance / pWaveSpeed,
    sWave: distance / sWaveSpeed,
    timeDifference: (distance / sWaveSpeed) - (distance / pWaveSpeed)
  };
}

/**
 * 统计震级分布
 * @param {Array} earthquakes - 地震数据数组
 * @returns {Array} 分布统计
 */
export function calculateMagnitudeDistribution(earthquakes) {
  const ranges = [
    { min: 0, max: 2, label: '< 2.0', count: 0 },
    { min: 2, max: 3, label: '2.0-2.9', count: 0 },
    { min: 3, max: 4, label: '3.0-3.9', count: 0 },
    { min: 4, max: 5, label: '4.0-4.9', count: 0 },
    { min: 5, max: 6, label: '5.0-5.9', count: 0 },
    { min: 6, max: 7, label: '6.0-6.9', count: 0 },
    { min: 7, max: 10, label: '>= 7.0', count: 0 }
  ];
  
  earthquakes.forEach(eq => {
    const mag = eq.properties?.mag || eq.mag;
    if (mag !== undefined) {
      const range = ranges.find(r => mag >= r.min && mag < r.max);
      if (range) range.count++;
    }
  });
  
  return ranges;
}

/**
 * 统计深度分布
 * @param {Array} earthquakes - 地震数据数组
 * @returns {Array} 分布统计
 */
export function calculateDepthDistribution(earthquakes) {
  const ranges = [
    { min: 0, max: 10, label: '0-10km', count: 0 },
    { min: 10, max: 35, label: '10-35km', count: 0 },
    { min: 35, max: 70, label: '35-70km', count: 0 },
    { min: 70, max: 150, label: '70-150km', count: 0 },
    { min: 150, max: 300, label: '150-300km', count: 0 },
    { min: 300, max: 1000, label: '> 300km', count: 0 }
  ];
  
  earthquakes.forEach(eq => {
    const depth = eq.properties?.depth || eq.depth;
    if (depth !== undefined) {
      const range = ranges.find(r => depth >= r.min && depth < r.max);
      if (range) range.count++;
    }
  });
  
  return ranges;
}

/**
 * 统计时间分布（按天）
 * @param {Array} earthquakes - 地震数据数组
 * @returns {Array} 每日统计
 */
export function calculateTimeDistribution(earthquakes) {
  const daily = {};
  
  earthquakes.forEach(eq => {
    const time = eq.properties?.time || eq.time;
    if (time) {
      const date = new Date(time).toISOString().split('T')[0];
      daily[date] = (daily[date] || 0) + 1;
    }
  });
  
  return Object.entries(daily)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 统计区域分布
 * @param {Array} earthquakes - 地震数据数组
 * @returns {Array} 区域统计
 */
export function calculateRegionDistribution(earthquakes) {
  const regions = {};
  
  earthquakes.forEach(eq => {
    const place = eq.properties?.place || eq.place || '未知';
    // 简化地区提取
    let region = place;
    const match = place.match(/of\s+(.+)$/);
    if (match) {
      region = match[1];
    }
    
    regions[region] = (regions[region] || 0) + 1;
  });
  
  return Object.entries(regions)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * 计算统计数据
 * @param {Array} earthquakes - 地震数据数组
 * @returns {Object} 统计数据
 */
export function calculateStats(earthquakes) {
  if (!earthquakes || earthquakes.length === 0) {
    return {
      total: 0,
      avgMagnitude: 0,
      maxMagnitude: 0,
      avgDepth: 0,
      strongest: null,
      shallowest: null,
      deepest: null
    };
  }
  
  const mags = earthquakes.map(eq => eq.properties?.mag || eq.mag).filter(m => m !== undefined);
  const depths = earthquakes.map(eq => eq.properties?.depth || eq.depth).filter(d => d !== undefined);
  
  const avgMagnitude = mags.reduce((a, b) => a + b, 0) / mags.length;
  const maxMagnitude = Math.max(...mags);
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  
  const strongest = earthquakes.reduce((max, eq) => {
    const mag = eq.properties?.mag || eq.mag;
    const maxMag = max.properties?.mag || max.mag;
    return mag > maxMag ? eq : max;
  });
  
  const shallowest = earthquakes.reduce((min, eq) => {
    const depth = eq.properties?.depth || eq.depth;
    const minDepth = min.properties?.depth || min.depth;
    return depth < minDepth ? eq : min;
  });
  
  const deepest = earthquakes.reduce((max, eq) => {
    const depth = eq.properties?.depth || eq.depth;
    const maxDepth = max.properties?.depth || max.depth;
    return depth > maxDepth ? eq : max;
  });
  
  return {
    total: earthquakes.length,
    avgMagnitude,
    maxMagnitude,
    avgDepth,
    strongest,
    shallowest,
    deepest
  };
}

/**
 * 计算中国区域地震（简化判断）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {boolean}
 */
export function isInChina(lat, lng) {
  // 中国大致范围
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}

/**
 * 获取中国省份（简化版，基于坐标）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {string}
 */
export function getChinaRegion(lat, lng) {
  // 简化区域判断，返回大致区域
  if (lat > 40) {
    if (lng < 100) return '新疆/西北地区';
    if (lng < 120) return '华北地区';
    return '东北地区';
  }
  if (lat > 30) {
    if (lng < 100) return '西南地区';
    return '华中地区';
  }
  if (lng < 105) return '西南地区';
  return '华南地区';
}
