/**
 * 数据统计组件
 * 包含统计卡片、图表和分布分析
 */

import { formatNumber, formatDateTime, formatMagnitude } from '../utils/formatter.js';
import { 
  calculateMagnitudeDistribution, 
  calculateDepthDistribution,
  calculateTimeDistribution,
  calculateRegionDistribution,
  calculateStats
} from '../utils/calculator.js';
import { getIcon } from './Navigation.js';

/**
 * 渲染统计卡片
 * @returns {string} HTML
 */
export function renderStatsCards() {
  return `
    <div class="stats-grid">
      <div class="stat-card animate-fade-in-up">
        <div class="stat-label">总地震次数</div>
        <div class="stat-value" id="stat-total">--</div>
        <div class="stat-change">
          <span id="stat-total-trend">统计周期内</span>
        </div>
      </div>
      <div class="stat-card animate-fade-in-up delay-100">
        <div class="stat-label">最大震级</div>
        <div class="stat-value" id="stat-max-mag">--</div>
        <div class="stat-change" id="stat-max-location">--</div>
      </div>
      <div class="stat-card animate-fade-in-up delay-200">
        <div class="stat-label">平均震级</div>
        <div class="stat-value" id="stat-avg-mag">--</div>
        <div class="stat-change">震级平均值</div>
      </div>
      <div class="stat-card animate-fade-in-up delay-300">
        <div class="stat-label">平均深度</div>
        <div class="stat-value" id="stat-avg-depth">--</div>
        <div class="stat-change">公里</div>
      </div>
    </div>
  `;
}

/**
 * 渲染图表容器
 * @returns {string} HTML
 */
export function renderChartsContainer() {
  return `
    <div class="panel-grid">
      <div class="card panel-half animate-fade-in-up">
        <div class="card-header">
          <h4 class="card-title">震级分布</h4>
          <button class="btn btn-icon btn-ghost" id="chart-mag-info">
            ${getIcon('info')}
          </button>
        </div>
        <div class="card-body">
          <div class="chart-container" id="chart-magnitude">
            <div class="chart-placeholder">加载中...</div>
          </div>
        </div>
      </div>
      
      <div class="card panel-half animate-fade-in-up delay-100">
        <div class="card-header">
          <h4 class="card-title">深度分布</h4>
          <button class="btn btn-icon btn-ghost" id="chart-depth-info">
            ${getIcon('info')}
          </button>
        </div>
        <div class="card-body">
          <div class="chart-container" id="chart-depth">
            <div class="chart-placeholder">加载中...</div>
          </div>
        </div>
      </div>
      
      <div class="card panel-wide animate-fade-in-up delay-200">
        <div class="card-header">
          <h4 class="card-title">时间趋势</h4>
          <div class="segment-control" id="trend-period">
            <div class="segment-item active" data-value="day">按日</div>
            <div class="segment-item" data-value="hour">按时</div>
          </div>
        </div>
        <div class="card-body">
          <div class="chart-container" id="chart-trend">
            <div class="chart-placeholder">加载中...</div>
          </div>
        </div>
      </div>
      
      <div class="card panel-half animate-fade-in-up delay-300">
        <div class="card-header">
          <h4 class="card-title">活跃区域 TOP10</h4>
        </div>
        <div class="card-body">
          <div class="region-list" id="region-list">
            <div class="chart-placeholder">加载中...</div>
          </div>
        </div>
      </div>
      
      <div class="card panel-half animate-fade-in-up delay-400">
        <div class="card-header">
          <h4 class="card-title">数据概览</h4>
        </div>
        <div class="card-body">
          <div class="data-overview" id="data-overview">
            <div class="overview-item">
              <span class="overview-label">浅源地震 (&lt;70km)</span>
              <div class="overview-bar">
                <div class="overview-fill" style="width: 0%; background: #00d9a5;"></div>
              </div>
              <span class="overview-value" id="overview-shallow">0%</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">中源地震 (70-300km)</span>
              <div class="overview-bar">
                <div class="overview-fill" style="width: 0%; background: #ffcc00;"></div>
              </div>
              <span class="overview-value" id="overview-intermediate">0%</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">深源地震 (&gt;300km)</span>
              <div class="overview-bar">
                <div class="overview-fill" style="width: 0%; background: #ff2d55;"></div>
              </div>
              <span class="overview-value" id="overview-deep">0%</span>
            </div>
            <div class="divider"></div>
            <div class="overview-item">
              <span class="overview-label">有感地震 (≥4.0)</span>
              <div class="overview-bar">
                <div class="overview-fill" style="width: 0%; background: #ff9500;"></div>
              </div>
              <span class="overview-value" id="overview-felt">0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染条形图
 * @param {Array} data - 数据 [{label, value, color}]
 * @param {string} containerId - 容器ID
 */
export function renderBarChart(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data || data.length === 0) return;

  const maxValue = Math.max(...data.map(d => d.value));
  
  const barsHtml = data.map((item, index) => {
    const percentage = maxValue > 0 ? (item.value / maxValue * 100) : 0;
    const displayValue = item.value;
    
    return `
      <div class="bar-item" style="animation-delay: ${index * 50}ms">
        <div class="bar-label">${item.label}</div>
        <div class="bar-track">
          <div class="bar-fill" 
               style="width: ${percentage}%; background: ${item.color || 'var(--accent-ocean)'}"
               data-value="${displayValue}">
          </div>
        </div>
        <div class="bar-value">${displayValue}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="bar-chart">${barsHtml}</div>`;
}

/**
 * 渲染折线图
 * @param {Array} data - 数据 [{date, value}]
 * @param {string} containerId - 容器ID
 */
export function renderLineChart(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data || data.length === 0) {
    if (container) container.innerHTML = '<div class="chart-placeholder">暂无数据</div>';
    return;
  }

  const maxValue = Math.max(...data.map(d => d.count));
  const width = container.clientWidth || 600;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 生成路径点
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.count / (maxValue || 1)) * chartHeight;
    return { x, y, value: d.count, date: d.date };
  });

  // 生成SVG路径
  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  // 生成区域路径
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  // X轴标签（只显示部分）
  const labelStep = Math.ceil(data.length / 6);
  const labels = data.filter((_, i) => i % labelStep === 0).map(d => {
    const date = new Date(d.date);
    return {
      x: padding.left + (data.indexOf(d) / (data.length - 1 || 1)) * chartWidth,
      text: `${date.getMonth() + 1}/${date.getDate()}`
    };
  });

  const svgHtml = `
    <svg class="line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:var(--accent-ocean);stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:var(--accent-ocean);stop-opacity:0" />
        </linearGradient>
      </defs>
      
      <!-- 网格线 -->
      ${[0, 1, 2, 3, 4].map(i => {
        const y = padding.top + (chartHeight / 4) * i;
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.05)" />`;
      }).join('')}
      
      <!-- 区域填充 -->
      <path d="${areaD}" fill="url(#lineGradient)" />
      
      <!-- 折线 -->
      <path d="${pathD}" fill="none" stroke="var(--accent-ocean)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- 数据点 -->
      ${points.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--accent-ocean)" 
                class="chart-point" data-value="${p.value}" data-date="${p.date}" 
                style="opacity: ${i % 3 === 0 ? 1 : 0};" />
      `).join('')}
      
      <!-- X轴标签 -->
      ${labels.map(l => `
        <text x="${l.x}" y="${height - 8}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10">
          ${l.text}
        </text>
      `).join('')}
      
      <!-- Y轴标签 -->
      ${[0, 2, 4].map(i => {
        const value = Math.round((maxValue / 4) * (4 - i));
        const y = padding.top + (chartHeight / 4) * i;
        return `<text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="10">${value}</text>`;
      }).join('')}
    </svg>
  `;

  container.innerHTML = svgHtml;
}

/**
 * 渲染区域列表
 * @param {Array} data - 区域数据 [{region, count}]
 * @param {string} containerId - 容器ID
 */
export function renderRegionList(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data || data.length === 0) {
    if (container) container.innerHTML = '<div class="chart-placeholder">暂无数据</div>';
    return;
  }

  const maxCount = Math.max(...data.map(d => d.count));

  const itemsHtml = data.map((item, index) => {
    const percentage = (item.count / maxCount * 100).toFixed(0);
    
    return `
      <div class="region-item" style="animation-delay: ${index * 50}ms">
        <span class="region-rank">${index + 1}</span>
        <span class="region-name" title="${item.region}">${item.region}</span>
        <div class="region-bar">
          <div class="region-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="region-count">${item.count}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = itemsHtml;
}

/**
 * 更新统计卡片
 * @param {Array} earthquakes - 地震数据
 */
export function updateStatsCards(earthquakes) {
  const stats = calculateStats(earthquakes);
  
  // 总次数
  const totalEl = document.getElementById('stat-total');
  if (totalEl) {
    animateNumber(totalEl, stats.total);
  }
  
  // 最大震级
  const maxMagEl = document.getElementById('stat-max-mag');
  if (maxMagEl) {
    maxMagEl.textContent = formatMagnitude(stats.maxMagnitude);
    maxMagEl.style.color = stats.maxMagnitude >= 6 ? 'var(--danger)' : 
                           stats.maxMagnitude >= 5 ? 'var(--warning)' : 'var(--text-primary)';
  }
  
  // 最大震级位置
  const maxLocationEl = document.getElementById('stat-max-location');
  if (maxLocationEl && stats.strongest) {
    maxLocationEl.textContent = stats.strongest.place || '未知地点';
  }
  
  // 平均震级
  const avgMagEl = document.getElementById('stat-avg-mag');
  if (avgMagEl) {
    avgMagEl.textContent = stats.avgMagnitude.toFixed(1);
  }
  
  // 平均深度
  const avgDepthEl = document.getElementById('stat-avg-depth');
  if (avgDepthEl) {
    avgDepthEl.textContent = Math.round(stats.avgDepth);
  }
}

/**
 * 更新所有图表
 * @param {Array} earthquakes - 地震数据
 */
export function updateCharts(earthquakes) {
  if (!earthquakes || earthquakes.length === 0) return;

  // 震级分布
  const magDistribution = calculateMagnitudeDistribution(earthquakes);
  const magColors = ['#00d9a5', '#00a8e8', '#5ac8fa', '#ffcc00', '#ff9500', '#ff6b35', '#ff2d55'];
  const magChartData = magDistribution.map((d, i) => ({
    label: d.label,
    value: d.count,
    color: magColors[i] || 'var(--accent-ocean)'
  }));
  renderBarChart(magChartData, 'chart-magnitude');

  // 深度分布
  const depthDistribution = calculateDepthDistribution(earthquakes);
  const depthColors = ['#00d9a5', '#00a8e8', '#5ac8fa', '#ffcc00', '#ff9500', '#ff2d55'];
  const depthChartData = depthDistribution.map((d, i) => ({
    label: d.label,
    value: d.count,
    color: depthColors[i] || 'var(--accent-ocean)'
  }));
  renderBarChart(depthChartData, 'chart-depth');

  // 时间趋势
  const timeDistribution = calculateTimeDistribution(earthquakes);
  renderLineChart(timeDistribution, 'chart-trend');

  // 区域分布
  const regionDistribution = calculateRegionDistribution(earthquakes);
  renderRegionList(regionDistribution, 'region-list');

  // 数据概览
  updateOverview(earthquakes);
}

/**
 * 更新数据概览
 */
function updateOverview(earthquakes) {
  const total = earthquakes.length;
  if (total === 0) return;

  const shallow = earthquakes.filter(e => e.depth < 70).length;
  const intermediate = earthquakes.filter(e => e.depth >= 70 && e.depth < 300).length;
  const deep = earthquakes.filter(e => e.depth >= 300).length;
  const felt = earthquakes.filter(e => e.mag >= 4).length;

  // 更新百分比和进度条
  const shallowEl = document.getElementById('overview-shallow');
  const shallowFill = shallowEl?.previousElementSibling?.querySelector('.overview-fill');
  if (shallowEl) shallowEl.textContent = `${Math.round(shallow / total * 100)}%`;
  if (shallowFill) shallowFill.style.width = `${shallow / total * 100}%`;

  const interEl = document.getElementById('overview-intermediate');
  const interFill = interEl?.previousElementSibling?.querySelector('.overview-fill');
  if (interEl) interEl.textContent = `${Math.round(intermediate / total * 100)}%`;
  if (interFill) interFill.style.width = `${intermediate / total * 100}%`;

  const deepEl = document.getElementById('overview-deep');
  const deepFill = deepEl?.previousElementSibling?.querySelector('.overview-fill');
  if (deepEl) deepEl.textContent = `${Math.round(deep / total * 100)}%`;
  if (deepFill) deepFill.style.width = `${deep / total * 100}%`;

  const feltEl = document.getElementById('overview-felt');
  const feltFill = feltEl?.previousElementSibling?.querySelector('.overview-fill');
  if (feltEl) feltEl.textContent = `${Math.round(felt / total * 100)}%`;
  if (feltFill) feltFill.style.width = `${felt / total * 100}%`;
}

/**
 * 数字滚动动画
 */
function animateNumber(element, target, duration = 800) {
  const start = parseInt(element.textContent) || 0;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    
    const current = Math.round(start + (target - start) * easeProgress);
    element.textContent = formatNumber(current);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
}

/**
 * 统计数据类
 */
export class DataStats {
  constructor() {
    this.earthquakes = [];
  }

  /**
   * 更新数据
   */
  updateData(earthquakes) {
    this.earthquakes = earthquakes;
    updateStatsCards(earthquakes);
    updateCharts(earthquakes);
  }

  /**
   * 初始化事件
   */
  initEvents() {
    // 趋势图周期切换
    document.getElementById('trend-period')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('segment-item')) {
        document.querySelectorAll('#trend-period .segment-item').forEach(item => {
          item.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // 重新渲染趋势图
        const timeDistribution = calculateTimeDistribution(this.earthquakes);
        renderLineChart(timeDistribution, 'chart-trend');
      }
    });
  }
}

export default {
  renderStatsCards,
  renderChartsContainer,
  renderBarChart,
  renderLineChart,
  renderRegionList,
  updateStatsCards,
  updateCharts,
  DataStats
};
