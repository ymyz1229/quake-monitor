/**
 * 数据缓存管理器
 * 提供本地存储和内存缓存功能
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 默认5分钟
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    const item = {
      value,
      timestamp: Date.now(),
      ttl
    };
    
    this.memoryCache.set(key, item);
    
    // 同时存储到 localStorage（持久化）
    try {
      localStorage.setItem(`quake_cache_${key}`, JSON.stringify(item));
    } catch (e) {
      // localStorage 可能不可用或已满
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值或 null
   */
  get(key) {
    // 先检查内存缓存
    let item = this.memoryCache.get(key);
    
    // 内存中没有，尝试从 localStorage 恢复
    if (!item) {
      try {
        const stored = localStorage.getItem(`quake_cache_${key}`);
        if (stored) {
          item = JSON.parse(stored);
          this.memoryCache.set(key, item);
        }
      } catch (e) {
        return null;
      }
    }
    
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`quake_cache_${key}`);
    } catch (e) {}
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.memoryCache.clear();
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('quake_cache_'))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {}
  }

  /**
   * 检查缓存是否存在且有效
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * 获取缓存剩余时间
   * @param {string} key - 缓存键
   * @returns {number} 剩余毫秒数，-1 表示不存在
   */
  getRemainingTime(key) {
    const item = this.memoryCache.get(key);
    if (!item) return -1;
    
    const remaining = item.ttl - (Date.now() - item.timestamp);
    return remaining > 0 ? remaining : -1;
  }
}

// 导出单例
export const cache = new CacheManager();
export default cache;
