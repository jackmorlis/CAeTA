/**
 * Site Configuration
 * Centralized configuration for branding, contact info, and other site-wide constants
 * Update these values in one place to reflect changes across the entire application
 */

export const SITE_CONFIG = {
  // Domain and branding
  domain: 'curacao.earrivalform.com',
  siteName: 'Curaçao Digital Immigration Card',
  siteNameShort: 'Curaçao DIC',

  // Contact information
  supportEmail: 'help@earrival-support.com',

  // Legal
  arbitrationLocation: 'Newark, Delaware',
  governingState: 'State of Delaware',
} as const;

// Type-safe access to config values
export type SiteConfig = typeof SITE_CONFIG;
