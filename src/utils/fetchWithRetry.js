/**
 * 带重试机制的 fetch 封装
 * 支持指数退避、超时控制、错误处理
 */

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 带重试的 fetch
 * @param {string} url - 请求URL
 * @param {Object} options - fetch 选项
 * @param {Object} retryOptions - 重试选项
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(
  url,
  options = {},
  retryOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    timeout = 15000,
    onRetry = null
  } = retryOptions;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // 检查 HTTP 状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
      
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw new Error(
          `请求失败（已重试 ${maxRetries} 次）: ${error.message}`
        );
      }
      
      // 计算延迟时间（指数退避）
      const currentDelay = retryDelay * Math.pow(backoffMultiplier, attempt);
      
      // 调用重试回调
      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxRetries,
          delay: currentDelay,
          error: error.message
        });
      }
      
      // 等待后重试
      await delay(currentDelay);
    }
  }
  
  throw lastError;
}

/**
 * 并行请求多个 URL，返回最快成功的结果
 * @param {Array<{url: string, options: Object}>} requests - 请求配置数组
 * @param {Object} retryOptions - 重试选项
 * @returns {Promise<any>}
 */
export async function raceRequests(requests, retryOptions = {}) {
  const errors = [];
  
  // 创建所有请求的 Promise
  const promises = requests.map(async ({ url, options = {} }, index) => {
    try {
      const response = await fetchWithRetry(url, options, retryOptions);
      const data = await response.json();
      return { success: true, data, index, url };
    } catch (error) {
      return { success: false, error: error.message, index, url };
    }
  });
  
  // 使用 Promise.any 的 polyfill
  return new Promise((resolve, reject) => {
    let completedCount = 0;
    const results = [];
    
    promises.forEach((promise, index) => {
      promise.then(result => {
        completedCount++;
        results[index] = result;
        
        if (result.success) {
          resolve(result.data);
        } else if (completedCount === requests.length) {
          // 所有请求都失败了
          reject(new Error(
            `所有数据源均不可用:\n${results.map(r => `${r.url}: ${r.error}`).join('\n')}`
          ));
        }
      });
    });
  });
}

/**
 * 顺序请求多个 URL，返回第一个成功的结果
 * @param {Array<{url: string, options: Object}>} requests - 请求配置数组
 * @param {Object} retryOptions - 重试选项
 * @returns {Promise<any>}
 */
export async function sequentialRequests(requests, retryOptions = {}) {
  const errors = [];
  
  for (const { url, options = {} } of requests) {
    try {
      const response = await fetchWithRetry(url, options, retryOptions);
      return await response.json();
    } catch (error) {
      errors.push({ url, error: error.message });
      console.warn(`数据源 ${url} 失败:`, error.message);
    }
  }
  
  throw new Error(
    `所有数据源均不可用:\n${errors.map(e => `${e.url}: ${e.error}`).join('\n')}`
  );
}

/**
 * 创建可取消的请求
 * @param {string} url - 请求URL
 * @param {Object} options - fetch 选项
 * @returns {{promise: Promise, cancel: Function}}
 */
export function createCancellableFetch(url, options = {}) {
  const controller = new AbortController();
  
  const promise = fetch(url, {
    ...options,
    signal: controller.signal
  });
  
  return {
    promise,
    cancel: () => controller.abort()
  };
}

export default {
  fetchWithRetry,
  raceRequests,
  sequentialRequests,
  createCancellableFetch
};
