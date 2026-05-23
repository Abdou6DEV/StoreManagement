/** Option key: set when user finishes welcome once (trial / link / restore); prevents showing welcome again. */
export const ONBOARDING_INITIAL_WELCOME_DONE_KEY = "onboarding.initialWelcomeDone";

/** Option key: `customer_id` returned from `device-request` (cloud backups / restore). */
export const ONLINE_CUSTOMER_ID_OPTION_KEY = "online.customerId";

/** Last known shop name from `device-check` (offline display on License tab). */
export const ONLINE_CUSTOMER_NAME_OPTION_KEY = "online.customerName";

/** Last known shop phone from `device-check` (offline display on License tab). */
export const ONLINE_CUSTOMER_PHONE_OPTION_KEY = "online.customerPhone";

/** Dispatched from Welcome after persisting {@link ONBOARDING_INITIAL_WELCOME_DONE_KEY}; App listens and leaves welcome-only routes (navigate("/login") cannot work there — `*` redirects to /welcome). */
export const INITIAL_WELCOME_DONE_EVENT = "store-management:initial-welcome-done";
