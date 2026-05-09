/** Option key: set when user finishes welcome (trial / restore) so we do not loop on empty core data. */
export const ONBOARDING_INITIAL_WELCOME_DONE_KEY = "onboarding.initialWelcomeDone";

/** Dispatched from Welcome after persisting {@link ONBOARDING_INITIAL_WELCOME_DONE_KEY}; App listens and leaves welcome-only routes (navigate("/login") cannot work there — `*` redirects to /welcome). */
export const INITIAL_WELCOME_DONE_EVENT = "store-management:initial-welcome-done";
