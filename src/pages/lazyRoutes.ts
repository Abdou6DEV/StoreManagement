/**
 * Central place for lazy route imports. Used by App (React.lazy) and auth preload
 * so the same chunks are loaded and Suspense doesn't show after preload.
 */

export const getLazyMainMenu = () => import("./mainMenu");
export const getLazyDashboard = () => import("./dashboard");
export const getLazyClients = () => import("./clients");
export const getLazyCashier = () => import("./cashier");
export const getLazyStock = () => import("./stock");
export const getLazyHistory = () => import("./history");
export const getLazyBills = () => import("./bills");
export const getLazyServices = () => import("./services");
export const getLazyAdministrator = () => import("./administrator");
export const getLazyZakatAlMal = () => import("./zakat");
export const getLazyAbout = () => import("./about");

export const routeLoaders = [
  getLazyMainMenu,
  getLazyDashboard,
  getLazyClients,
  getLazyCashier,
  getLazyStock,
  getLazyHistory,
  getLazyBills,
  getLazyServices,
  getLazyAdministrator,
  getLazyZakatAlMal,
  getLazyAbout,
];
