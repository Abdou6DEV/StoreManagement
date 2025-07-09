import { useTheme as useThemeContext } from "../contexts/ThemeContext";

export const useTheme = () => {
  const { theme, toggleTheme } = useThemeContext();

  const isDark = theme === "dark";
  const isLight = theme === "light";

  const setLightTheme = () => {
    if (theme === "dark") {
      toggleTheme();
    }
  };

  const setDarkTheme = () => {
    if (theme === "light") {
      toggleTheme();
    }
  };

  return {
    theme,
    toggleTheme,
    isDark,
    isLight,
    setLightTheme,
    setDarkTheme,
  };
};
