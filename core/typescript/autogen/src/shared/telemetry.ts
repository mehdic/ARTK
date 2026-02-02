/**
 * @module shared/telemetry
 * @description Pipeline telemetry for tracking performance, costs, and errors
 *
 * Persists data to .artk/autogen/telemetry.json for analysis and debugging.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { TokenUsage } from './types.js';
import { getAutogenArtifact, ensureAutogenDir } from '../utils/paths.js';
import { estimateCost } from './cost-tracker.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TelemetryEvent {
  /** Event timestamp (ISO 8601) */
  timestamp: string;
  /** Event type */
  type: 'command_start' | 'command_end' | 'llm_call' | 'error' | 'pipeline_transition';
  /** Command that generated the event */
  command: string;
  /** Additional event data */
  data: Record<string, unknown>;
}

export interface CommandStats {
  /** Total executions */
  count: number;
  /** Total successful executions */
  successCount: number;
  /** Total failed executions */
  errorCount: number;
  /** Average duration in milliseconds */
  avgDurationMs: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Last execution timestamp */
  lastRun: string | null;
}

export interface TelemetryData {
  /** Version of telemetry schema */
  version: number;
  /** Session ID */
  sessionId: string;
  /** When this telemetry file was created */
  createdAt: string;
  /** Last update time */
  updatedAt: string;
  /** Total tokens used across all commands */
  totalTokens: number;
  /** Total estimated cost in USD */
  totalCostUsd: number;
  /** Command-level stats */
  commandStats: Record<string, CommandStats>;
  /** Recent events (last 100) */
  recentEvents: TelemetryEvent[];
  /** Error counts by type */
  errorCounts: Record<string, number>;
}

export interface TelemetryConfig {
  /** Whether telemetry is enabled */
  enabled: boolean;
  /** Maximum number of events to keep */
  maxEvents: number;
  /** Default model for cost estimation */
  defaultModel: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  maxEvents: 100,
  defaultModel: 'gpt-4o-mini',
};

function createEmptyTelemetryData(sessionId: string): TelemetryData {
  const now = new Date().toISOString();
  return {
    version: 1,
    sessionId,
    createdAt: now,
    updatedAt: now,
    totalTokens: 0,
    totalCostUsd: 0,
    commandStats: {},
    recentEvents: [],
    errorCounts: {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRY CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Telemetry {
  private data: TelemetryData;
  private config: TelemetryConfig;
  private sessionId: string;
  private pendingCommands: Map<string, { startTime: number; command: string }>;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.data = createEmptyTelemetryData(this.sessionId);
    this.pendingCommands = new Map();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Load existing telemetry data or create new
   */
  async load(baseDir?: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const telemetryPath = getAutogenArtifact('telemetry', baseDir);
      if (existsSync(telemetryPath)) {
        const content = readFileSync(telemetryPath, 'utf-8');
        const loaded = JSON.parse(content) as TelemetryData;

        // Preserve historical data, update session
        this.data = {
          ...loaded,
          sessionId: this.sessionId,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // If loading fails, start fresh
      this.data = createEmptyTelemetryData(this.sessionId);
    }
  }

  /**
   * Save telemetry data to disk
   */
  async save(baseDir?: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await ensureAutogenDir(baseDir);
      const telemetryPath = getAutogenArtifact('telemetry', baseDir);
      this.data.updatedAt = new Date().toISOString();
      writeFileSync(telemetryPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Silently fail - telemetry should never block operations
    }
  }

  /**
   * Track command start
   */
  trackCommandStart(command: string): string {
    if (!this.config.enabled) return '';

    const eventId = `${command}-${Date.now()}`;
    this.pendingCommands.set(eventId, {
      startTime: Date.now(),
      command,
    });

    this.addEvent({
      timestamp: new Date().toISOString(),
      type: 'command_start',
      command,
      data: { eventId },
    });

    return eventId;
  }

  /**
   * Track command end
   */
  trackCommandEnd(eventId: string, success: boolean, data: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return;

    const pending = this.pendingCommands.get(eventId);
    if (!pending) return;

    const durationMs = Date.now() - pending.startTime;
    const { command } = pending;

    // Update command stats
    if (!this.data.commandStats[command]) {
      this.data.commandStats[command] = {
        count: 0,
        successCount: 0,
        errorCount: 0,
        avgDurationMs: 0,
        totalDurationMs: 0,
        lastRun: null,
      };
    }

    const stats = this.data.commandStats[command];
    stats.count++;
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
    stats.totalDurationMs += durationMs;
    stats.avgDurationMs = stats.totalDurationMs / stats.count;
    stats.lastRun = new Date().toISOString();

    this.addEvent({
      timestamp: new Date().toISOString(),
      type: 'command_end',
      command,
      data: { eventId, success, durationMs, ...data },
    });

    this.pendingCommands.delete(eventId);
  }

  /**
   * Track LLM usage
   */
  trackLLMUsage(
    command: string,
    usage: TokenUsage,
    model: string = this.config.defaultModel
  ): void {
    if (!this.config.enabled) return;

    const cost = usage.estimatedCostUsd > 0
      ? usage.estimatedCostUsd
      : estimateCost(usage, model);

    this.data.totalTokens += usage.totalTokens;
    this.data.totalCostUsd += cost;

    this.addEvent({
      timestamp: new Date().toISOString(),
      type: 'llm_call',
      command,
      data: {
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        costUsd: cost,
      },
    });
  }

  /**
   * Track error
   */
  trackError(command: string, errorType: string, message: string): void {
    if (!this.config.enabled) return;

    this.data.errorCounts[errorType] = (this.data.errorCounts[errorType] || 0) + 1;

    this.addEvent({
      timestamp: new Date().toISOString(),
      type: 'error',
      command,
      data: { errorType, message },
    });
  }

  /**
   * Track pipeline state transition
   */
  trackPipelineTransition(
    command: string,
    fromStage: string,
    toStage: string,
    data: Record<string, unknown> = {}
  ): void {
    if (!this.config.enabled) return;

    this.addEvent({
      timestamp: new Date().toISOString(),
      type: 'pipeline_transition',
      command,
      data: { fromStage, toStage, ...data },
    });
  }

  private addEvent(event: TelemetryEvent): void {
    this.data.recentEvents.push(event);

    // Trim to max events
    if (this.data.recentEvents.length > this.config.maxEvents) {
      this.data.recentEvents = this.data.recentEvents.slice(-this.config.maxEvents);
    }
  }

  /**
   * Get telemetry summary
   */
  getSummary(): TelemetrySummary {
    return {
      sessionId: this.sessionId,
      totalTokens: this.data.totalTokens,
      totalCostUsd: this.data.totalCostUsd,
      commandStats: { ...this.data.commandStats },
      topErrors: Object.entries(this.data.errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
      eventCount: this.data.recentEvents.length,
    };
  }

  /**
   * Get raw data (for debugging)
   */
  getData(): TelemetryData {
    return { ...this.data };
  }

  /**
   * Reset telemetry (for testing)
   */
  reset(): void {
    this.sessionId = this.generateSessionId();
    this.data = createEmptyTelemetryData(this.sessionId);
    this.pendingCommands.clear();
  }
}

export interface TelemetrySummary {
  sessionId: string;
  totalTokens: number;
  totalCostUsd: number;
  commandStats: Record<string, CommandStats>;
  topErrors: Array<{ type: string; count: number }>;
  eventCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let globalTelemetry: Telemetry | null = null;

/**
 * Get the global telemetry instance
 */
export function getTelemetry(config?: Partial<TelemetryConfig>): Telemetry {
  if (!globalTelemetry) {
    globalTelemetry = new Telemetry(config);
  }
  return globalTelemetry;
}

/**
 * Create a new telemetry instance (for testing)
 */
export function createTelemetry(config?: Partial<TelemetryConfig>): Telemetry {
  return new Telemetry(config);
}

/**
 * Reset global telemetry (for testing)
 */
export function resetGlobalTelemetry(): void {
  globalTelemetry = null;
}
