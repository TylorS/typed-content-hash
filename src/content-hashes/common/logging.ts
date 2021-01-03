import { ask, doEffect, Effect, LoggerEffect } from '@typed/fp'

export enum LogLevel {
  Debug,
  Info,
  Error,
}

export interface LoggerEnv {
  readonly logPrefix: string
  readonly logLevel: LogLevel
  readonly logger: LoggerEffect<unknown, string>
}

export interface LogEntry {
  readonly level: LogLevel
  readonly message: string
}

export function logEntry(entry: LogEntry): Effect<LoggerEnv, void> {
  const eff = doEffect(function* () {
    const { logLevel, logger, logPrefix } = yield* ask<LoggerEnv>()

    if (logLevel <= entry.level) {
      yield* logger(`${logPrefix} ${entry.message}`.trim())
    }
  })

  return eff
}

export const info = (message: string) => logEntry({ level: LogLevel.Info, message })
export const error = (message: string) => logEntry({ level: LogLevel.Error, message })
export const debug = (message: string) => logEntry({ level: LogLevel.Debug, message })
