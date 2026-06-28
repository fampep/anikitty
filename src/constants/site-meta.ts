import packageJson from "../../package.json";

/** App version from package.json — shown in the site beta badge. */
export const SITE_VERSION = packageJson.version;

export const SITE_IS_BETA = true;
