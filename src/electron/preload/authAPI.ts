import { ipcRenderer } from "electron";
import type { AuthAPI } from "./types";

const authAPI: AuthAPI = {
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  createUser: (userData) => ipcRenderer.invoke("auth:createUser", userData),
  getUserById: (userId) => ipcRenderer.invoke("auth:getUserById", userId),
  getUserByUsername: (username) => ipcRenderer.invoke("auth:getUserByUsername", username),
  updateUserRole: (userId, role) => ipcRenderer.invoke("auth:updateUserRole", userId, role),
  getAllUsers: () => ipcRenderer.invoke("auth:getAllUsers"),
  deactivateUser: (userId) => ipcRenderer.invoke("auth:deactivateUser", userId),
  activateUser: (userId) => ipcRenderer.invoke("auth:activateUser", userId),
  deleteUser: (userId) => ipcRenderer.invoke("auth:deleteUser", userId),
};

export { authAPI };
