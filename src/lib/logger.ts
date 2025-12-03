import { prisma } from './prisma';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogCategory = 'webhook' | 'telegram' | 'pickmytrade' | 'push' | 'system';

const MAX_LOGS = 1000; // Keep last 1000 logs

interface LogMetadata {
  ticker?: string;
  strategy?: string;
  action?: string;
  direction?: string;
  configName?: string;
  error?: string;
  [key: string]: any;
}

class AppLogger {
  private async cleanup() {
    try {
      // Count total logs
      const count = await prisma.appLog.count();

      if (count > MAX_LOGS) {
        // Find the ID threshold to keep only MAX_LOGS entries
        const logsToDelete = count - MAX_LOGS;
        const oldestToKeep = await prisma.appLog.findMany({
          orderBy: { createdAt: 'asc' },
          take: logsToDelete,
          select: { id: true },
        });

        if (oldestToKeep.length > 0) {
          const maxIdToDelete = oldestToKeep[oldestToKeep.length - 1].id;
          await prisma.appLog.deleteMany({
            where: { id: { lte: maxIdToDelete } },
          });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }

  async log(level: LogLevel, category: LogCategory, message: string, metadata?: LogMetadata) {
    try {
      // Also log to console for Render logs
      const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logFn(`[${category.toUpperCase()}] ${message}`, metadata || '');

      // Save to database
      await prisma.appLog.create({
        data: {
          level,
          category,
          message,
          metadata: metadata || null,
        },
      });

      // Periodically cleanup old logs (every ~100 logs)
      if (Math.random() < 0.01) {
        this.cleanup();
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  async info(category: LogCategory, message: string, metadata?: LogMetadata) {
    return this.log('info', category, message, metadata);
  }

  async warn(category: LogCategory, message: string, metadata?: LogMetadata) {
    return this.log('warn', category, message, metadata);
  }

  async error(category: LogCategory, message: string, metadata?: LogMetadata) {
    return this.log('error', category, message, metadata);
  }

  async debug(category: LogCategory, message: string, metadata?: LogMetadata) {
    return this.log('debug', category, message, metadata);
  }
}

export const logger = new AppLogger();
