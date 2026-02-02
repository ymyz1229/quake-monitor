/**
 * 节流和防抖工具函数
 */

/**
 * 防抖函数 - 延迟执行，如果在延迟期间再次调用则重新计时
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function}
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

/**
 * 节流函数 - 限制函数在指定时间内只执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 带尾部执行的节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function}
 */
export function throttleWithTrailing(func, limit = 300) {
  let inThrottle;
  let lastArgs;
  let lastThis;
  
  return function executedFunction(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = lastThis = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastThis = context;
    }
  };
}

/**
 * 请求动画帧节流 - 适用于高频事件如滚动、鼠标移动
 * @param {Function} func - 要执行的函数
 * @returns {Function}
 */
export function rafThrottle(func) {
  let ticking = false;
  
  return function executedFunction(...args) {
    const context = this;
    
    if (!ticking) {
      requestAnimationFrame(() => {
        func.apply(context, args);
        ticking = false;
      });
      ticking = true;
    }
  };
}

/**
 * 异步防抖 - 适用于异步函数
 * @param {Function} func - 异步函数
 * @param {number} wait - 延迟时间
 * @returns {Function}
 */
export function asyncDebounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    return new Promise((resolve, reject) => {
      clearTimeout(timeout);
      
      timeout = setTimeout(async () => {
        try {
          const result = await func.apply(context, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
}

export default {
  debounce,
  throttle,
  throttleWithTrailing,
  rafThrottle,
  asyncDebounce
};
