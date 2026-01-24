/**
 * Logger
 * 로깅 시스템
 * 
 * 참조: RisuStudio_Specification.md Section 8.7
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 'charx' | 'risum' | 'risup' | 'cbs' | 'regex' | 'trigger' | 'validation' | 'app' | 'file';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
}

type LogListener = (entry: LogEntry) => void;

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: Set<LogListener> = new Set();
  private enabled = true;

  log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 리스너 알림
    this.listeners.forEach(fn => fn(entry));

    // 개발 모드 또는 WARN/ERROR는 콘솔 출력
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV || level === 'WARN' || level === 'ERROR') {
      const method = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
      console[method](`[${category}]`, message, data ?? '');
    }
  }

  debug(category: LogCategory, msg: string, data?: unknown): void {
    this.log('DEBUG', category, msg, data);
  }

  info(category: LogCategory, msg: string, data?: unknown): void {
    this.log('INFO', category, msg, data);
  }

  warn(category: LogCategory, msg: string, data?: unknown): void {
    this.log('WARN', category, msg, data);
  }

  error(category: LogCategory, msg: string, data?: unknown): void {
    this.log('ERROR', category, msg, data);
  }

  subscribe(fn: LogListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getByCategory(category: LogCategory, count = 50): LogEntry[] {
    return this.logs.filter(l => l.category === category).slice(-count);
  }

  getByLevel(level: LogLevel, count = 50): LogEntry[] {
    return this.logs.filter(l => l.level === level).slice(-count);
  }

  getRecent(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  exportForAI(options?: { categories?: LogCategory[]; levels?: LogLevel[] }): string {
    let filtered = this.logs;

    if (options?.categories) {
      filtered = filtered.filter(l => options.categories!.includes(l.category));
    }
    if (options?.levels) {
      filtered = filtered.filter(l => options.levels!.includes(l.level));
    }

    return filtered
      .map(l => {
        const time = new Date(l.timestamp).toISOString().slice(11, 19);
        const data = l.data ? ` | ${JSON.stringify(l.data)}` : '';
        return `[${time}] ${l.level} [${l.category}] ${l.message}${data}`;
      })
      .join('\n');
  }

  clear(): void {
    this.logs = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const logger = new Logger();
