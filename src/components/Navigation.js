/**
 * 导航组件
 * 处理侧边栏和底部导航的渲染与交互
 */

// SVG图标定义
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>`,
  
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 21 18 21 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>`,
  
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <path d="M3 20h18"/>
  </svg>`,
  
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>`,
  
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  
  logo: `<svg viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
    <circle cx="20" cy="20" r="8" fill="white"/>
    <path d="M20 2 L20 10 M20 30 L20 38 M2 20 L10 20 M30 20 L38 20" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <circle cx="20" cy="20" r="14" stroke="white" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
  </svg>`,
  
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`,
  
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>`,
  
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>`,
  
  location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>`,
  
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,
  
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>`,
  
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`,
  
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
  
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>`,
  
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`,
  
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,
  
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`
};

/**
 * 导航配置
 */
const NAV_ITEMS = [
  { id: 'dashboard', label: '监测大屏', icon: 'dashboard' },
  { id: 'map', label: '地震地图', icon: 'map' },
  { id: 'stats', label: '数据统计', icon: 'chart' },
  { id: 'list', label: '地震列表', icon: 'list' },
  { id: 'warning', label: '预警信息', icon: 'alert' }
];

/**
 * 获取图标SVG
 * @param {string} name - 图标名称
 * @returns {string}
 */
export function getIcon(name) {
  return ICONS[name] || ICONS.info;
}

/**
 * 渲染侧边导航
 * @param {string} activeId - 当前活动页面ID
 * @param {Function} onNavigate - 导航回调
 * @returns {string} HTML字符串
 */
export function renderSidebar(activeId = 'dashboard', onNavigate = () => {}) {
  const navItemsHtml = NAV_ITEMS.map(item => `
    <div class="nav-item ${item.id === activeId ? 'active' : ''}" data-id="${item.id}">
      <div class="nav-item-icon">${getIcon(item.icon)}</div>
      <span class="nav-item-text">${item.label}</span>
    </div>
  `).join('');

  return `
    <nav class="nav-sidebar">
      <div class="nav-logo">
        <div class="nav-logo-icon"><img src="./assets/icons/logo.png" alt="震讯通" /></div>
        <span class="nav-logo-text"><img src="./assets/icons/name.svg" alt="震讯通" style="height: 20px; width: auto;" /></span>
      </div>
      <div class="nav-items">
        ${navItemsHtml}
      </div>
    </nav>
  `;
}

/**
 * 渲染底部导航（移动端）
 * @param {string} activeId - 当前活动页面ID
 * @returns {string} HTML字符串
 */
export function renderBottomNav(activeId = 'dashboard') {
  const navItemsHtml = NAV_ITEMS.map(item => `
    <div class="bottom-nav-item ${item.id === activeId ? 'active' : ''}" data-id="${item.id}">
      ${getIcon(item.icon)}
      <span>${item.label}</span>
    </div>
  `).join('');

  return `
    <nav class="bottom-nav">
      <div class="bottom-nav-items">
        ${navItemsHtml}
      </div>
    </nav>
  `;
}

/**
 * 渲染移动端顶部标题栏
 * @returns {string} HTML字符串
 */
export function renderTopHeader() {
  return `
    <header class="top-header">
      <div class="top-header-logo">
        <div class="top-header-logo-icon"><img src="./assets/icons/logo.png" alt="震讯通" /></div>
        <span class="top-header-logo-text"><img src="./assets/icons/name.svg" alt="震讯通" style="height: 18px; width: auto;" /></span>
      </div>
      <button class="btn btn-icon btn-ghost" id="refresh-btn">
        ${getIcon('refresh')}
      </button>
    </header>
  `;
}

/**
 * 初始化导航事件
 * @param {Function} onNavigate - 导航回调
 */
export function initNavigation(onNavigate) {
  // 侧边导航点击事件
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      onNavigate(id);
      
      // 更新活动状态
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
      
      item.classList.add('active');
      const bottomItem = document.querySelector(`.bottom-nav-item[data-id="${id}"]`);
      if (bottomItem) bottomItem.classList.add('active');
    });
  });

  // 底部导航点击事件
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      onNavigate(id);
      
      // 更新活动状态
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
      
      item.classList.add('active');
      const sidebarItem = document.querySelector(`.nav-item[data-id="${id}"]`);
      if (sidebarItem) sidebarItem.classList.add('active');
    });
  });
}

/**
 * 更新导航活动状态
 * @param {string} activeId - 当前活动页面ID
 */
export function setActiveNavItem(activeId) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === activeId);
  });
}

/**
 * 渲染分段控制器
 * @param {Array} segments - 分段选项 [{id, label}]
 * @param {string} activeId - 当前选中ID
 * @param {string} name - 控制器名称
 * @returns {string}
 */
export function renderSegmentControl(segments, activeId, name = '') {
  const segmentsHtml = segments.map(seg => `
    <div class="segment-item ${seg.id === activeId ? 'active' : ''}" data-id="${seg.id}" data-name="${name}">
      ${seg.label}
    </div>
  `).join('');

  return `<div class="segment-control" data-control="${name}">${segmentsHtml}</div>`;
}

/**
 * 初始化分段控制器事件
 * @param {Function} onChange - 变化回调 (segmentId, controlName)
 */
export function initSegmentControl(onChange) {
  document.querySelectorAll('.segment-item').forEach(item => {
    item.addEventListener('click', () => {
      const controlName = item.dataset.name;
      const segmentId = item.dataset.id;
      
      // 更新同组状态
      document.querySelectorAll(`.segment-item[data-name="${controlName}"]`).forEach(i => {
        i.classList.remove('active');
      });
      item.classList.add('active');
      
      onChange(segmentId, controlName);
    });
  });
}

export default {
  getIcon,
  renderSidebar,
  renderBottomNav,
  renderTopHeader,
  initNavigation,
  setActiveNavItem,
  renderSegmentControl,
  initSegmentControl
};
