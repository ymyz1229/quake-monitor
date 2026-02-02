/**
 * 地震列表组件
 */

import { formatDateTime, formatDepth, formatMagnitude, getMagnitudeClass, formatPlace } from '../utils/formatter.js';
import { getIcon } from './Navigation.js';

/**
 * 渲染地震列表容器
 * @returns {string} HTML
 */
export function renderQuakeListContainer() {
  return `
    <div class="quake-list-container">
      <div class="quake-list-header">
        <h3 class="quake-list-title">地震事件列表</h3>
        <div class="quake-list-actions">
          <button class="btn btn-icon btn-ghost tooltip" id="list-filter-btn">
            ${getIcon('filter')}
            <span class="tooltip-content">筛选</span>
          </button>
          <button class="btn btn-icon btn-ghost tooltip" id="list-sort-btn">
            ${getIcon('clock')}
            <span class="tooltip-content">排序</span>
          </button>
        </div>
      </div>
      <div class="quake-list-filters" id="quake-filters" style="display: none;">
        <div class="filter-row">
          <span class="filter-label">震级:</span>
          <div class="segment-control" id="mag-filter">
            <div class="segment-item active" data-value="all">全部</div>
            <div class="segment-item" data-value="4">4.0+</div>
            <div class="segment-item" data-value="5">5.0+</div>
            <div class="segment-item" data-value="6">6.0+</div>
          </div>
        </div>
        <div class="filter-row">
          <span class="filter-label">时间:</span>
          <div class="segment-control" id="time-filter">
            <div class="segment-item active" data-value="24h">24小时</div>
            <div class="segment-item" data-value="7d">7天</div>
            <div class="segment-item" data-value="30d">30天</div>
          </div>
        </div>
      </div>
      <div class="quake-list-content" id="quake-list">
        <div class="loading-state">
          <div class="loading-spinner-double"></div>
          <p>正在加载地震数据...</p>
        </div>
      </div>
      <div class="quake-list-footer">
        <span id="quake-list-count">共 0 条记录</span>
        <button class="btn btn-sm btn-ghost" id="load-more-btn">加载更多</button>
      </div>
    </div>
  `;
}

/**
 * 渲染单个地震列表项
 * @param {Object} eq - 地震数据
 * @param {boolean} isActive - 是否选中
 * @returns {string} HTML
 */
export function renderQuakeListItem(eq, isActive = false) {
  const magInfo = getMagnitudeClass(eq.mag);
  const timeStr = formatDateTime(eq.time, 'relative');
  const timeFull = formatDateTime(eq.time, 'full');
  const depthStr = formatDepth(eq.depth);
  const placeStr = formatPlace(eq.place);
  const isChina = eq.isChina || false;

  return `
    <div class="quake-list-item ${isActive ? 'active' : ''}" data-id="${eq.id}" data-mag="${eq.mag}">
      <div class="quake-item-mag">
        <span class="mag-badge ${magInfo.class}">${formatMagnitude(eq.mag)}</span>
      </div>
      <div class="quake-item-info">
        <div class="quake-item-location">
          ${isChina ? '<span class="location-tag">国内</span>' : ''}
          ${placeStr}
        </div>
        <div class="quake-item-meta">
          <span class="quake-item-depth">${getIcon('location')} ${depthStr}</span>
          <span class="quake-item-time-full" title="${timeFull}">${timeStr}</span>
          <span class="quake-item-time-short">${timeStr}</span>
        </div>
      </div>
      <div class="quake-item-arrow">
        ${getIcon('arrowRight')}
      </div>
    </div>
  `;
}

/**
 * 渲染空状态
 * @param {string} message - 空状态消息
 * @returns {string} HTML
 */
export function renderEmptyState(message = '暂无地震数据') {
  return `
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <div class="empty-title">${message}</div>
      <div class="empty-desc">请稍后刷新或调整筛选条件</div>
    </div>
  `;
}

/**
 * 渲染加载状态
 * @returns {string} HTML
 */
export function renderLoadingState() {
  return `
    <div class="loading-state">
      <div class="loading-spinner-double"></div>
      <p>正在加载地震数据...</p>
    </div>
  `;
}

/**
 * 地震列表类
 */
export class QuakeList {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.earthquakes = [];
    this.filteredEarthquakes = [];
    this.selectedId = null;
    this.onSelectCallback = null;
    this.onFilterCallback = null;
    this.currentFilter = { mag: 'all', time: '24h' };
    this.pageSize = 20;
    this.currentPage = 1;
  }

  /**
   * 初始化
   */
  init() {
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 筛选按钮
    document.getElementById('list-filter-btn')?.addEventListener('click', () => {
      const filters = document.getElementById('quake-filters');
      if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
      }
    });

    // 震级筛选
    document.getElementById('mag-filter')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('segment-item')) {
        const value = e.target.dataset.value;
        this.currentFilter.mag = value;
        
        // 更新UI
        document.querySelectorAll('#mag-filter .segment-item').forEach(item => {
          item.classList.remove('active');
        });
        e.target.classList.add('active');
        
        this.applyFilter();
      }
    });

    // 时间筛选
    document.getElementById('time-filter')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('segment-item')) {
        const value = e.target.dataset.value;
        this.currentFilter.time = value;
        
        // 更新UI
        document.querySelectorAll('#time-filter .segment-item').forEach(item => {
          item.classList.remove('active');
        });
        e.target.classList.add('active');
        
        if (this.onFilterCallback) {
          this.onFilterCallback(this.currentFilter);
        }
      }
    });

    // 列表项点击
    this.container?.addEventListener('click', (e) => {
      const item = e.target.closest('.quake-list-item');
      if (item) {
        const id = item.dataset.id;
        this.selectItem(id);
      }
    });

    // 加载更多
    document.getElementById('load-more-btn')?.addEventListener('click', () => {
      this.loadMore();
    });
  }

  /**
   * 设置数据
   */
  setData(earthquakes) {
    this.earthquakes = earthquakes;
    this.applyFilter();
  }

  /**
   * 应用筛选
   */
  applyFilter() {
    let filtered = [...this.earthquakes];

    // 震级筛选
    if (this.currentFilter.mag !== 'all') {
      const minMag = parseFloat(this.currentFilter.mag);
      filtered = filtered.filter(eq => eq.mag >= minMag);
    }

    // 时间筛选 (已经由外部API处理，这里只做显示)
    
    this.filteredEarthquakes = filtered;
    this.currentPage = 1;
    this.render();
  }

  /**
   * 渲染列表
   */
  render() {
    if (!this.container) return;

    const displayData = this.filteredEarthquakes.slice(0, this.currentPage * this.pageSize);
    
    if (displayData.length === 0) {
      this.container.innerHTML = renderEmptyState();
    } else {
      this.container.innerHTML = displayData.map(eq => 
        renderQuakeListItem(eq, eq.id === this.selectedId)
      ).join('');
    }

    // 更新计数
    const countEl = document.getElementById('quake-list-count');
    if (countEl) {
      countEl.textContent = `共 ${this.filteredEarthquakes.length} 条记录`;
    }

    // 显示/隐藏加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = 
        this.filteredEarthquakes.length > this.currentPage * this.pageSize ? 'inline-flex' : 'none';
    }
  }

  /**
   * 加载更多
   */
  loadMore() {
    this.currentPage++;
    this.render();
  }

  /**
   * 选中项
   */
  selectItem(id) {
    this.selectedId = id;
    
    // 更新UI
    this.container?.querySelectorAll('.quake-list-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === id);
    });

    // 回调
    const eq = this.earthquakes.find(e => e.id === id);
    if (eq && this.onSelectCallback) {
      this.onSelectCallback(eq);
    }
  }

  /**
   * 设置选中回调
   */
  onSelect(callback) {
    this.onSelectCallback = callback;
  }

  /**
   * 设置筛选回调
   */
  onFilter(callback) {
    this.onFilterCallback = callback;
  }

  /**
   * 滚动到指定项
   */
  scrollToItem(id) {
    const item = this.container?.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 显示加载状态
   */
  showLoading() {
    if (this.container) {
      this.container.innerHTML = renderLoadingState();
    }
  }
}

/**
 * 渲染地震卡片（用于详情页）
 * @param {Object} eq - 地震数据
 * @returns {string} HTML
 */
export function renderQuakeCard(eq) {
  const magInfo = getMagnitudeClass(eq.mag);
  
  return `
    <div class="quake-card">
      <div class="quake-card-header">
        <span class="mag-badge ${magInfo.class}">${formatMagnitude(eq.mag)}</span>
        <span class="quake-card-type">${magInfo.label}</span>
      </div>
      <div class="quake-card-body">
        <div class="quake-card-location">${eq.place}</div>
        <div class="quake-card-time">${formatDateTime(eq.time)}</div>
        <div class="quake-card-details">
          <span class="detail-item">深度: ${formatDepth(eq.depth)}</span>
          <span class="detail-item">经度: ${eq.longitude.toFixed(2)}°</span>
          <span class="detail-item">纬度: ${eq.latitude.toFixed(2)}°</span>
        </div>
      </div>
    </div>
  `;
}

export default {
  renderQuakeListContainer,
  renderQuakeListItem,
  renderEmptyState,
  renderLoadingState,
  QuakeList,
  renderQuakeCard
};
