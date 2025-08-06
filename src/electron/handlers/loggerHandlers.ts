import { ipcMain } from "electron";
import logger from "../../lib/logger";

export function setupLoggerHandlers() {
  ipcMain.handle("logger:log", async (_event, entry) => {
    const { timestamp, level, message, context, data, userId } = entry;
    logger.log(level, message, context, data, userId);
  });

  ipcMain.handle("logger:getLogFiles", async () => {
    return logger.getLogFiles();
  });

  ipcMain.handle("logger:readLogFile", async (_event, { filePath, lines }) => {
    return logger.readLogFile(filePath, lines);
  });

  ipcMain.handle("logger:getLogFileStats", async (_event, { filePath }) => {
    return logger.getLogFileStats(filePath);
  });

  ipcMain.handle("logger:clearLogs", async () => {
    logger.clearLogs();
  });

  ipcMain.handle("logger:updateConfig", async (_event, config) => {
    logger.updateConfig(config);
  });

  ipcMain.handle("logger:getConfig", async () => {
    return logger.getConfig();
  });
}
