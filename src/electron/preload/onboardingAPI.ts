import { ipcRenderer } from "electron";

export const onboardingAPI = {
  isCoreDatabaseEmpty: () =>
    ipcRenderer.invoke("onboarding:isCoreDatabaseEmpty") as Promise<{
      success: boolean;
      isEmpty?: boolean;
      error?: string;
    }>,
};
