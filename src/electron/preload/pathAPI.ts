import { contextBridge } from "electron";
import * as path from "path";

export const pathAPI = {
  join: (...paths: string[]) => path.join(...paths),
  resolve: (...paths: string[]) => path.resolve(...paths),
  dirname: (p: string) => path.dirname(p),
  basename: (p: string, ext?: string) => path.basename(p, ext),
  extname: (p: string) => path.extname(p),
  sep: path.sep,
  delimiter: path.delimiter,
};
