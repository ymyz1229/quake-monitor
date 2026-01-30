/**
 * 地震地图可视化组件
 * 使用Leaflet + 自定义动画实现
 */

/**
 * 获取震级信息
 */
function getMagnitudeInfo(mag) {
  const magnitude = mag || 0;
  
  if (magnitude < 2.5) {
    return { label: '微震', color: '#00d9a5', class: 'mag-micro' };
  }
  if (magnitude < 3.5) {
    return { label: '小震', color: '#00a8e8', class: 'mag-minor' };
  }
  if (magnitude < 4.5) {
    return { label: '轻震', color: '#5ac8fa', class: 'mag-light' };
  }
  if (magnitude < 5.5) {
    return { label: '中震', color: '#ffcc00', class: 'mag-moderate' };
  }
  if (magnitude < 6.5) {
    return { label: '强震', color: '#ff9500', class: 'mag-strong' };
  }
  if (magnitude < 7.0) {
    return { label: '大震', color: '#ff6b35', class: 'mag-major' };
  }
  return { label: '巨震', color: '#ff2d55', class: 'mag-great' };
}

/**
 * 地图可视化类
 */
export class EarthquakeMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      center: [35.0, 105.0],
      zoom: 4,
      minZoom: 2,
      maxZoom: 13,
      onMouseMove: null,
      ...options
    };
    this.map = null;
    this.markers = [];
    this.earthquakes = [];
    this.selectedId = null;
    this.onSelectCallback = null;
    this.tileLayer = null;
    this.currentLayer = 'dark';
    this.layerNames = {
      dark: '深色',
      light: '浅色',
      satellite: '卫星',
      terrain: '地形'
    };
  }

  /**
   * 初始化地图
   */
  async init() {
    if (!this.container) {
      console.error('Map container not found');
      return;
    }

    // 等待Leaflet
    await this.waitForLeaflet();

    // 创建地图
    this.map = L.map(this.container, {
      center: this.options.center,
      zoom: this.options.zoom,
      minZoom: this.options.minZoom,
      maxZoom: this.options.maxZoom,
      zoomControl: false,
      attributionControl: true
    });

    // 添加底图
    this.addTileLayer('dark');

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 等待Leaflet加载
   */
  waitForLeaflet() {
    return new Promise((resolve) => {
      if (window.L) {
        resolve();
        return;
      }
      const check = setInterval(() => {
        if (window.L) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 10000);
    });
  }

  /**
   * 添加瓦片图层
   */
  addTileLayer(type) {
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }

    const layers = {
      dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
          attribution: '&copy; OSM & CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }
      },
      light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        options: {
          attribution: '&copy; OSM & CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 18
        }
      },
      terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: {
          attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM',
          maxZoom: 17
        }
      }
    };

    const layer = layers[type] || layers.dark;
    this.tileLayer = L.tileLayer(layer.url, layer.options);
    this.tileLayer.addTo(this.map);
    this.currentLayer = type;
    
    // 更新按钮文字
    const layerBtn = document.getElementById('layer-toggle-text');
    if (layerBtn) {
      layerBtn.textContent = this.layerNames[type];
    }
  }

  /**
   * 切换图层
   */
  toggleLayer() {
    const layers = ['dark', 'light', 'satellite', 'terrain'];
    const currentIndex = layers.indexOf(this.currentLayer);
    const nextLayer = layers[(currentIndex + 1) % layers.length];
    this.addTileLayer(nextLayer);
  }

  /**
   * 绑定地图事件
   */
  bindEvents() {
    // 鼠标移动显示经纬度
    this.map.on('mousemove', (e) => {
      const { lat, lng } = e.latlng;
      const latStr = lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`;
      const lngStr = lng >= 0 ? `${lng.toFixed(4)}°E` : `${Math.abs(lng).toFixed(4)}°W`;
      
      const coordsEl = document.getElementById('mouse-coords');
      if (coordsEl) {
        coordsEl.innerHTML = `<span>${latStr}</span>, <span>${lngStr}</span>`;
      }
      
      if (this.options.onMouseMove) {
        this.options.onMouseMove(lat, lng);
      }
    });

    // 鼠标离开地图
    this.map.on('mouseout', () => {
      const coordsEl = document.getElementById('mouse-coords');
      if (coordsEl) {
        coordsEl.textContent = '--°, --°';
      }
    });
  }

  /**
   * 渲染地震数据
   */
  renderEarthquakes(earthquakes) {
    this.clearMarkers();
    this.earthquakes = earthquakes || [];

    if (this.earthquakes.length === 0) {
      this.updateStats();
      return;
    }

    // 按震级排序，大的先渲染（在底层）
    const sorted = [...this.earthquakes].sort((a, b) => (b.mag || 0) - (a.mag || 0));

    sorted.forEach(eq => {
      const marker = this.createMarker(eq);
      if (marker) {
        this.markers.push({
          id: eq.id,
          marker,
          data: eq
        });
      }
    });

    this.updateStats();
    
    if (this.selectedId) {
      this.highlightMarker(this.selectedId);
    }
  }

  /**
   * 创建地震标记
   */
  createMarker(eq) {
    const latitude = eq.latitude;
    const longitude = eq.longitude;
    const mag = eq.mag || 0;
    const time = eq.time;
    
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    const magInfo = getMagnitudeInfo(mag);
    const size = this.getMarkerSize(mag);
    const color = magInfo.color;
    
    // 计算时间因子（越新的地震动画越快）
    const hoursAgo = (Date.now() - time) / (1000 * 60 * 60);
    const timeFactor = Math.max(0.3, Math.min(1, 1 - hoursAgo / 24));
    
    // 创建自定义图标
    const icon = L.divIcon({
      className: 'earthquake-marker',
      html: this.createMarkerHTML(eq, size, color, timeFactor),
      iconSize: [size * 3, size * 3],
      iconAnchor: [size * 1.5, size * 1.5]
    });

    const marker = L.marker([latitude, longitude], { icon, zIndexOffset: Math.floor(mag * 100) });
    marker.addTo(this.map);

    marker.on('click', () => this.selectEarthquake(eq.id));
    
    marker.on('mouseover', () => this.showTooltip(eq));
    marker.on('mouseout', () => this.hideTooltip());

    return marker;
  }

  /**
   * 创建标记HTML
   */
  createMarkerHTML(eq, size, color, timeFactor) {
    const mag = eq.mag || 0;
    const ringCount = mag >= 5 ? 3 : mag >= 4 ? 2 : 1;
    const animDuration = (3 - timeFactor * 2).toFixed(1);
    
    let ringsHtml = '';
    for (let i = 0; i < ringCount; i++) {
      const delay = (i * 0.8).toFixed(1);
      ringsHtml += `
        <div class="quake-ripple" 
             style="--ripple-color: ${color}; 
                    --anim-duration: ${animDuration}s; 
                    --anim-delay: ${delay}s;">
        </div>
      `;
    }

    return `
      <div class="quake-marker-wrapper" data-id="${eq.id}" data-mag="${mag}">
        ${ringsHtml}
        <div class="quake-marker-core" 
             style="--marker-color: ${color}; 
                    --marker-size: ${size}px;">
          <span class="quake-marker-mag">${mag.toFixed(1)}</span>
        </div>
      </div>
    `;
  }

  /**
   * 获取标记大小
   */
  getMarkerSize(mag) {
    const magnitude = mag || 0;
    if (magnitude < 2.5) return 14;
    if (magnitude < 3.5) return 18;
    if (magnitude < 4.5) return 24;
    if (magnitude < 5.5) return 32;
    if (magnitude < 6.5) return 42;
    return 54;
  }

  /**
   * 显示工具提示
   */
  showTooltip(eq) {
    this.hideTooltip();
    
    const magInfo = getMagnitudeInfo(eq.mag);
    const hoursAgo = ((Date.now() - eq.time) / (1000 * 60 * 60)).toFixed(1);
    
    const tooltip = document.createElement('div');
    tooltip.className = 'map-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-mag" style="color: ${magInfo.color}">M ${(eq.mag || 0).toFixed(1)}</span>
        <span class="tooltip-badge" style="background: ${magInfo.color}20; color: ${magInfo.color}">${magInfo.label}</span>
      </div>
      <div class="tooltip-place">${eq.place || '未知地点'}</div>
      <div class="tooltip-meta">
        <span>深度 ${(eq.depth || 0).toFixed(0)}km</span>
        <span>${hoursAgo}小时前</span>
      </div>
    `;

    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;

    // 定位
    setTimeout(() => {
      const markerEl = document.querySelector(`.quake-marker-wrapper[data-id="${eq.id}"]`);
      if (markerEl) {
        const rect = markerEl.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 8}px`;
      }
    }, 10);
  }

  /**
   * 隐藏工具提示
   */
  hideTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }

  /**
   * 选择地震
   */
  selectEarthquake(id) {
    this.selectedId = id;
    this.highlightMarker(id);
    
    const eq = this.earthquakes.find(e => e.id === id);
    if (eq && this.onSelectCallback) {
      this.onSelectCallback(eq);
    }
  }

  /**
   * 高亮标记
   */
  highlightMarker(id) {
    document.querySelectorAll('.quake-marker-wrapper').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }

  /**
   * 清除所有标记
   */
  clearMarkers() {
    this.markers.forEach(({ marker }) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
    this.hideTooltip();
  }

  /**
   * 更新统计
   */
  updateStats() {
    const countEl = document.getElementById('map-visible-count') || document.getElementById('map-count');
    const maxMagEl = document.getElementById('map-max-mag');

    if (countEl) countEl.textContent = this.earthquakes.length;
    
    if (maxMagEl && this.earthquakes.length > 0) {
      const maxMag = Math.max(...this.earthquakes.map(e => e.mag || 0));
      maxMagEl.textContent = maxMag.toFixed(1);
      maxMagEl.style.color = maxMag >= 6 ? '#ff2d55' : maxMag >= 5 ? '#ff9500' : '#fff';
    }
  }

  /**
   * 飞到指定位置
   */
  flyTo(lat, lng, zoom = 8) {
    this.map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }

  /**
   * 设置选择回调
   */
  onSelect(callback) {
    this.onSelectCallback = callback;
  }

  /**
   * 销毁
   */
  destroy() {
    this.clearMarkers();
    if (this.map) {
      this.map.remove();
    }
  }
}

/**
 * 初始化地图
 */
export async function initMap(containerId, options) {
  const map = new EarthquakeMap(containerId, options);
  await map.init();
  return map;
}

export default { EarthquakeMap, initMap };
