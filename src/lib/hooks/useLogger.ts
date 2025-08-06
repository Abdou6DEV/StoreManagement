import { useCallback } from "react";
import rendererLogger from "../logger/rendererLogger";
import { LogLevel } from "../logger/common";

export const useLogger = (context?: string) => {
  const log = useCallback(
    (level: LogLevel, message: string, data?: any, userId?: string) => {
      rendererLogger.log(level, message, context, data, userId);
    },
    [context],
  );

  const error = useCallback(
    (message: string, data?: any, userId?: string) => {
      log(LogLevel.ERROR, message, data, userId);
    },
    [log],
  );

  const warn = useCallback(
    (message: string, data?: any, userId?: string) => {
      log(LogLevel.WARN, message, data, userId);
    },
    [log],
  );

  const info = useCallback(
    (message: string, data?: any, userId?: string) => {
      log(LogLevel.INFO, message, data, userId);
    },
    [log],
  );

  const debug = useCallback(
    (message: string, data?: any, userId?: string) => {
      log(LogLevel.DEBUG, message, data, userId);
    },
    [log],
  );

  const trace = useCallback(
    (message: string, data?: any, userId?: string) => {
      log(LogLevel.TRACE, message, data, userId);
    },
    [log],
  );

  return {
    error,
    warn,
    info,
    debug,
    trace,
  };
};
