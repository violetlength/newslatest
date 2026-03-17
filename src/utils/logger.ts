export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
  duration?: number;
}

export class ApiLogger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 100;
  private static currentLogLevel: LogLevel = LogLevel.INFO;

  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  static shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private static addLog(level: LogLevel, source: string, message: string, data?: any, duration?: number): void {
    if (!this.shouldLog(level)) return;

    const log: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      data,
      duration,
    };

    this.logs.push(log);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 控制台输出
    const timestamp = new Date(log.timestamp).toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}] [${source}]`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
    }
  }

  static debug(source: string, message: string, data?: any): void {
    this.addLog(LogLevel.DEBUG, source, message, data);
  }

  static info(source: string, message: string, data?: any): void {
    this.addLog(LogLevel.INFO, source, message, data);
  }

  static warn(source: string, message: string, data?: any): void {
    this.addLog(LogLevel.WARN, source, message, data);
  }

  static error(source: string, message: string, data?: any): void {
    this.addLog(LogLevel.ERROR, source, message, data);
  }

  static logApiRequest(source: string, url: string, startTime: number, success: boolean, data?: any, error?: string): void {
    const duration = Date.now() - startTime;
    const message = success ? `API请求成功: ${url}` : `API请求失败: ${url}`;
    
    if (success) {
      this.info(source, message, { url, duration, dataCount: Array.isArray(data) ? data.length : 'N/A' });
    } else {
      this.error(source, message, { url, duration, error });
    }
  }

  static logDataValidation(source: string, totalItems: number, validItems: number, invalidCount: number): void {
    if (invalidCount > 0) {
      this.warn(source, `数据验证完成: ${validItems}/${totalItems} 有效，${invalidCount} 无效`, {
        total: totalItems,
        valid: validItems,
        invalid: invalidCount,
        validityRate: ((validItems / totalItems) * 100).toFixed(2) + '%'
      });
    } else {
      this.info(source, `数据验证完成: ${validItems}/${totalItems} 全部有效`, {
        total: totalItems,
        valid: validItems,
        validityRate: '100%'
      });
    }
  }

  static getLogs(level?: LogLevel): LogEntry[] {
    if (level === undefined) return [...this.logs];
    return this.logs.filter(log => log.level >= level);
  }

  static getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source === source);
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    bySource: Record<string, number>;
    avgDuration?: number;
  } {
    const stats: {
      total: number;
      byLevel: Record<LogLevel, number>;
      bySource: Record<string, number>;
      avgDuration?: number;
    } = {
      total: this.logs.length,
      byLevel: {} as Record<LogLevel, number>,
      bySource: {} as Record<string, number>,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const log of this.logs) {
      // 按级别统计
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // 按来源统计
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
      
      // 计算平均耗时
      if (log.duration !== undefined) {
        totalDuration += log.duration;
        durationCount++;
      }
    }

    if (durationCount > 0) {
      stats.avgDuration = totalDuration / durationCount;
    }

    return stats;
  }
}

// 在开发环境中启用详细日志
try {
  // 使用import.meta.env替代process.env，这是Vite推荐的方式
  const nodeEnv = import.meta.env?.MODE || import.meta.env?.NODE_ENV;
  if (nodeEnv === 'development') {
    ApiLogger.setLogLevel(LogLevel.DEBUG);
  } else {
    ApiLogger.setLogLevel(LogLevel.INFO);
  }
} catch (error) {
  // 如果无法获取环境变量，默认使用INFO级别
  ApiLogger.setLogLevel(LogLevel.INFO);
  console.warn('无法获取环境变量，使用默认日志级别');
}
