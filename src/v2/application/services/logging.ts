import { ask, doEffect, Effect, LoggerEffect } from '@typed/fp'
import * as colors from 'typed-colors'
import * as figures from 'typed-figures'

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

export const levelToIcon = (level: LogLevel) => {
  switch (level) {
    case LogLevel.Debug:
      return figures.squareSmallFilled
    case LogLevel.Error:
      return figures.warning
    case LogLevel.Info:
      return figures.info
  }
}

export const levelToIconColor = (level: LogLevel, message: string): string => {
  switch (level) {
    case LogLevel.Debug:
      return colors.white(message)
    case LogLevel.Error:
      return colors.red(message)
    case LogLevel.Info:
      return colors.blue(message)
  }
}

export const levelToTextColor = (level: LogLevel, message: string): string => {
  switch (level) {
    case LogLevel.Debug:
      return colors.dim(message)
    case LogLevel.Error:
      return colors.red(message)
    case LogLevel.Info:
      return colors.white(message)
  }
}

export function logEntry(entry: LogEntry): Effect<LoggerEnv, void> {
  const eff = doEffect(function* () {
    const { logLevel, logger, logPrefix } = yield* ask<LoggerEnv>()

    if (logLevel <= entry.level) {
      yield* logger(
        `${logPrefix} ${levelToIconColor(entry.level, levelToIcon(entry.level))} ${levelToTextColor(
          entry.level,
          entry.message,
        )}`.trim(),
      )
    }
  })

  return eff
}

export const info = (message: string) => logEntry({ level: LogLevel.Info, message })
export const error = (message: string) => logEntry({ level: LogLevel.Error, message })
export const debug = (message: string) => logEntry({ level: LogLevel.Debug, message })
