/**
 * 通知和提示系统
 * 提供统一的错误、警告、成功提示
 */

// 通知容器
let notificationContainer = null;

/**
 * 初始化通知容器
 */
function initContainer() {
  if (notificationContainer) return;
  
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  notificationContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  `;
  document.body.appendChild(notificationContainer);
}

/**
 * 创建通知元素
 * @param {Object} options - 通知选项
 * @returns {HTMLElement}
 */
function createNotification({
  type = 'info',
  title = '',
  message = '',
  duration = 3000,
  closable = true
}) {
  initContainer();
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    background: ${getBackgroundColor(type)};
    color: #fff;
    padding: 14px 18px;
    border-radius: 10px;
    box-shadow: 0 4px 20px ${getShadowColor(type)};
    min-width: 280px;
    max-width: 400px;
    pointer-events: auto;
    animation: slideInRight 0.3s ease;
    border: 1px solid ${getBorderColor(type)};
    backdrop-filter: blur(10px);
  `;
  
  const icon = getIcon(type);
  
  notification.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="flex-shrink: 0; margin-top: 2px;">${icon}</div>
      <div style="flex: 1; min-width: 0;">
        ${title ? `<div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${title}</div>` : ''}
        <div style="font-size: 13px; opacity: 0.9; line-height: 1.5;">${message}</div>
      </div>
      ${closable ? `
        <button class="notification-close" style="
          flex-shrink: 0;
          background: none;
          border: none;
          color: inherit;
          opacity: 0.6;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
  
  // 关闭按钮事件
  if (closable) {
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => removeNotification(notification));
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.6');
  }
  
  // 自动关闭
  if (duration > 0) {
    setTimeout(() => removeNotification(notification), duration);
  }
  
  return notification;
}

/**
 * 移除通知
 * @param {HTMLElement} notification - 通知元素
 */
function removeNotification(notification) {
  notification.style.animation = 'slideOutRight 0.3s ease forwards';
  setTimeout(() => {
    notification.remove();
  }, 300);
}

/**
 * 获取背景颜色
 * @param {string} type - 通知类型
 * @returns {string}
 */
function getBackgroundColor(type) {
  const colors = {
    success: 'rgba(0, 217, 165, 0.95)',
    error: 'rgba(255, 45, 85, 0.95)',
    warning: 'rgba(255, 149, 0, 0.95)',
    info: 'rgba(0, 168, 232, 0.95)'
  };
  return colors[type] || colors.info;
}

/**
 * 获取阴影颜色
 * @param {string} type - 通知类型
 * @returns {string}
 */
function getShadowColor(type) {
  const colors = {
    success: 'rgba(0, 217, 165, 0.3)',
    error: 'rgba(255, 45, 85, 0.3)',
    warning: 'rgba(255, 149, 0, 0.3)',
    info: 'rgba(0, 168, 232, 0.3)'
  };
  return colors[type] || colors.info;
}

/**
 * 获取边框颜色
 * @param {string} type - 通知类型
 * @returns {string}
 */
function getBorderColor(type) {
  const colors = {
    success: 'rgba(0, 217, 165, 0.3)',
    error: 'rgba(255, 45, 85, 0.3)',
    warning: 'rgba(255, 149, 0, 0.3)',
    info: 'rgba(0, 168, 232, 0.3)'
  };
  return colors[type] || colors.info;
}

/**
 * 获取图标
 * @param {string} type - 通知类型
 * @returns {string}
 */
function getIcon(type) {
  const icons = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`
  };
  return icons[type] || icons.info;
}

/**
 * 显示通知
 * @param {Object} options - 通知选项
