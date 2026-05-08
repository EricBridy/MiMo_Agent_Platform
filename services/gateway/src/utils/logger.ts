/**
 * Gateway Service - 日志工具
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// 自定义日志格式
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// 创建日志实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'gateway' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    }),
    // 文件输出 - 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json())
    }),
    // 文件输出 - 所有日志
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json())
    })
  ]
});

// 请求日志中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
};

export default logger;
