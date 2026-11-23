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

/** Dev build only: Login dispatches this so App re-enters the welcome-only shell for UI work. */
export const DEV_OPEN_WELCOME_EVENT = "store-management:dev-open-welcome";

/** Dispatched after setup data is created or removed so the avatar checklist refreshes immediately. */
export const SETUP_DATA_CHANGED_EVENT = "store-management:setup-data-changed";

/** Persisted once the avatar setup checklist has celebrated and been hidden. */
export const SETUP_CHECKLIST_COMPLETED_KEY = "onboarding.setupChecklistCompleted";
