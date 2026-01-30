/**
 * 地震详情面板组件
 */

import { 
  formatDateTime, 
  formatDepth, 
  formatCoordinates, 
  formatMagnitude,
  getMagnitudeClass,
  getDepthClass,
  formatPlace
} from '../utils/formatter.js';
import { calculateEnergy, calculateIntensity, getIntensityInfo } from '../utils/calculator.js';
import { getIcon } from './Navigation.js';

/**
 * 渲染详情面板
 * @param {Object} eq - 地震数据
 * @returns {string} HTML
 */
export function renderDetailPanel(eq = null) {
  if (!eq) {
    return renderEmptyPanel();
  }

  const magInfo = getMagnitudeClass(eq.mag);
  const depthInfo = getDepthClass(eq.depth);
  const energy = calculateEnergy(eq.mag);
  const intensity = calculateIntensity(eq.mag, 0);
  const intensityInfo = getIntensityInfo(intensity);

  return `
    <div class="detail-panel open" id="detail-panel">
      <div class="detail-panel-header">
        <button class="btn btn-icon btn-ghost detail-close-btn" id="detail-close">
          ${getIcon('close')}
        </button>
        <h3 class="detail-title">地震详情</h3>
        <button class="btn btn-icon btn-ghost" id="detail-share" title="分享">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
      
      <div class="detail-panel-body">
        <!-- 震级信息 -->
        <div class="detail-mag-section">
          <div class="detail-mag-value" style="color: ${magInfo.color}">
            ${formatMagnitude(eq.mag)}
          </div>
          <div class="detail-mag-label">震级 (${magInfo.label})</div>
          <div class="detail-mag-desc">${magInfo.description}</div>
        </div>
        
        <!-- 位置信息 -->
        <div class="detail-info-section">
          <div class="detail-info-item">
            <span class="detail-info-icon">${getIcon('location')}</span>
            <div class="detail-info-content">
              <span class="detail-info-label">震中位置</span>
              <span class="detail-info-value">${eq.place}</span>
            </div>
          </div>
          
          <div class="detail-info-item">
            <span class="detail-info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <div class="detail-info-content">
              <span class="detail-info-label">坐标</span>
              <span class="detail-info-value">${formatCoordinates(eq.latitude, eq.longitude)}</span>
            </div>
          </div>
          
          <div class="detail-info-item">
            <span class="detail-info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L12 22M12 22L18 16M12 22L6 16"/>
              </svg>
            </span>
            <div class="detail-info-content">
              <span class="detail-info-label">深度</span>
              <span class="detail-info-value">
                ${formatDepth(eq.depth)}
                <span class="badge badge-${depthInfo.class === 'depth-shallow' ? 'success' : depthInfo.class === 'depth-deep' ? 'danger' : 'warning'}">
                  ${depthInfo.label}
                </span>
              </span>
            </div>
          </div>
          
          <div class="detail-info-item">
            <span class="detail-info-icon">${getIcon('clock')}</span>
            <div class="detail-info-content">
              <span class="detail-info-label">发震时刻</span>
              <span class="detail-info-value">${formatDateTime(eq.time, 'full')}</span>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- 烈度评估 -->
        <div class="detail-section">
          <h4 class="detail-section-title">震中烈度预估</h4>
          <div class="intensity-card" style="border-left-color: ${intensityInfo.color}">
            <div class="intensity-level" style="color: ${intensityInfo.color}">
              ${intensityInfo.label}度
            </div>
            <div class="intensity-name">${intensityInfo.name}</div>
            <div class="intensity-desc">${intensityInfo.description}</div>
          </div>
        </div>
        
        <!-- 能量释放 -->
        <div class="detail-section">
          <h4 class="detail-section-title">能量释放</h4>
          <div class="energy-display">
            <div class="energy-value">${energy.displayValue}</div>
            <div class="energy-unit">${energy.displayUnit}</div>
          </div>
          <div class="energy-compare">
            约相当于 ${Math.round(energy.tonsTNT / 20000)} 颗广岛原子弹
          </div>
        </div>
        
        <!-- 标签 -->
        <div class="detail-tags">
          ${eq.isSignificant ? '<span class="badge badge-danger">显著地震</span>' : ''}
          ${eq.hasTsunami ? '<span class="badge badge-warning">可能引发海啸</span>' : ''}
          ${eq.isChina ? '<span class="badge badge-primary">国内地震</span>' : ''}
          ${eq.alert ? `<span class="badge badge-${eq.alert === 'red' ? 'danger' : eq.alert === 'orange' ? 'warning' : 'info'}">警报级别: ${eq.alert}</span>` : ''}
        </div>
        
        <!-- 外部链接 -->
        <div class="detail-actions">
          <a href="${eq.url || '#'}" target="_blank" class="btn btn-primary btn-full-mobile">
            查看 USGS 详情
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染空面板
 * @returns {string} HTML
 */
export function renderEmptyPanel() {
  return `
    <div class="detail-panel" id="detail-panel">
      <div class="detail-empty">
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="empty-title">选择一个地震事件</div>
          <div class="empty-desc">点击地图上的标记或列表中的项目查看详情</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染预警面板
 * @param {Object} warning - 预警数据
 * @returns {string} HTML
 */
export function renderWarningPanel(warning) {
  const intensityInfo = getIntensityInfo(warning.intensity);
  
  return `
    <div class="warning-panel alert-flash" id="warning-panel">
      <div class="warning-header">
        <div class="warning-icon pulse-glow">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="warning-title">
          <h3>地震预警</h3>
          <span class="warning-status">${warning.status === 'warning' ? '预警中' : '已解除'}</span>
        </div>
        <button class="btn btn-icon btn-ghost" id="warning-close">
          ${getIcon('close')}
        </button>
      </div>
      
      <div class="warning-body">
        <div class="warning-location">
          <div class="warning-location-name">${warning.location}</div>
          <div class="warning-coords">
            ${warning.latitude.toFixed(2)}°N, ${warning.longitude.toFixed(2)}°E
          </div>
        </div>
        
        <div class="warning-params">
          <div class="warning-param">
            <span class="param-label">预估震级</span>
            <span class="param-value mag">M ${warning.magnitude}</span>
          </div>
          <div class="warning-param">
            <span class="param-label">震源深度</span>
            <span class="param-value">${warning.depth} km</span>
          </div>
          <div class="warning-param">
            <span class="param-label">预估烈度</span>
            <span class="param-value intensity" style="color: ${intensityInfo.color}">
              ${intensityInfo.label}度
            </span>
          </div>
        </div>
        
        <div class="warning-countdown">
          <div class="countdown-label">预计到达时间</div>
          <div class="countdown-value">
            <span class="countdown-number">${warning.estimatedArrival}</span>
            <span class="countdown-unit">秒</span>
          </div>
        </div>
        
        <div class="warning-tips">
          <h4>避险建议</h4>
          <ul>
            <li>远离窗户、玻璃等易碎物品</li>
            <li>在室外请远离建筑物、电线杆</li>
            <li>保持冷静，听从官方指引</li>
            <li>准备好应急包</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

/**
 * 详情面板类
 */
export class DetailPanel {
  constructor() {
    this.currentData = null;
    this.isOpen = false;
    this.onCloseCallback = null;
  }

  /**
   * 显示详情
   */
  show(eq) {
    this.currentData = eq;
    this.isOpen = true;
    
    const container = document.getElementById('detail-panel-container');
    if (container) {
      container.innerHTML = renderDetailPanel(eq);
      this.bindEvents();
    }
  }

  /**
   * 关闭详情
   */
  close() {
    this.isOpen = false;
    this.currentData = null;
    
    const panel = document.getElementById('detail-panel');
    if (panel) {
      panel.classList.remove('open');
      
      // 等待动画完成后清空
      setTimeout(() => {
        const container = document.getElementById('detail-panel-container');
        if (container && !this.isOpen) {
          container.innerHTML = renderEmptyPanel();
        }
      }, 300);
    }
    
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    document.getElementById('detail-close')?.addEventListener('click', () => {
      this.close();
    });

    // 点击遮罩关闭
    document.getElementById('detail-panel')?.addEventListener('click', (e) => {
      if (e.target.id === 'detail-panel') {
        this.close();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * 设置关闭回调
   */
  onClose(callback) {
    this.onCloseCallback = callback;
  }
}

export default {
  renderDetailPanel,
  renderEmptyPanel,
  renderWarningPanel,
  DetailPanel
};
