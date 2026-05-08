/**
 * 工具函数库
 */

/**
 * 生成唯一ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  const randomStr2 = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${timestamp}${randomStr}${randomStr2}` : `${timestamp}${randomStr}${randomStr2}`;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (obj instanceof Object) {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * 延迟Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay: delayMs = 1000, backoff = true, onRetry } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) break;
      
      const waitTime = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      
      if (onRetry) onRetry(attempt, lastError);
      
      await delay(waitTime);
    }
  }
  
  throw lastError!;
}

/**
 * 超时Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError || `Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * 路径处理
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.join('/'));
}

export function getBasename(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/');
  return parts[parts.length - 1];
}

export function getDirname(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/**
 * 时间格式化
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
}

/**
 * 异步队列
 */
export class AsyncQueue<T> {
  private queue: Array<() => Promise<T>> = [];
  private processing = false;
  private concurrency: number;
  
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }
  
  async add(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.allSettled(batch.map(fn => fn()));
    }
    
    this.processing = false;
  }
}

/**
 * 事件发射器
 */
export class EventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<Function>> = new Map();
  
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    
    return () => this.off(event, listener);
  }
  
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${String(event)}:`, error);
      }
    });
  }
  
  once<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    const wrappedListener = (data: T[K]) => {
      this.off(event, wrappedListener);
      listener(data);
    };
    this.on(event, wrappedListener);
  }
}

/**
 * URL解析
 */
export function parseConnectionUrl(url: string): {
  protocol: string;
  host: string;
  port: number;
  path: string;
} {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parseInt(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname
    };
  } catch {
    return {
      protocol: 'http',
      host: url.split(':')[0] || 'localhost',
      port: parseInt(url.split(':')[1]) || 3000,
      path: ''
    };
  }
}
