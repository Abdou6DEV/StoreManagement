import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { PublisherGithub } from "@electron-forge/publisher-github";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/.prisma/**/*"
    },
    ignore: [
      /^\/prisma\/seed\//,
      /^\/scripts\//
    ],
    icon: "./public/myapp.ico"
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: "./public/myapp.ico",
      iconUrl: "https://raw.githubusercontent.com/Abdou6DEV/StoreManagement/main/public/myapp.ico",
      name: "REDATECHStoreManagement",
      authors: "REDA TECH",
      description: "A comprehensive store management solution by REDA TECH",
      noMsi: true,
      // Squirrel.Windows creates desktop shortcuts by default
      // But we can ensure it via the setup events in main.ts
    }),
    new MakerZIP({}, ["win32"]), // Create ZIP for Windows updates
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "Abdou6DEV",
        name: "StoreManagement"
      },
      prerelease: false,
      draft: false
    })
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/electron/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/electron/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
