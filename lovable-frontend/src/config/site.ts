/**
 * Site Configuration
 * Centralized configuration for branding, contact info, and other site-wide constants
 * Update these values in one place to reflect changes across the entire application
 */

export const SITE_CONFIG = {
  // Domain and branding
  domain: 'canada-eta.earrivalform.com',
  siteName: 'Canada eTA',
  siteNameShort: 'Canada eTA',

  // Contact information
  supportEmail: 'help@earrival-support.com',

  // Legal
  arbitrationLocation: 'Newark, Delaware',
  governingState: 'State of Delaware',

  // Pricing
  pricing: {
    basePrice: 89.99,
    fastProcessingFee: 20.00,
    ultraProcessingFee: 50.00,
  },
  processing: {
    standard: 'Under 24 hours',
    fast: 'Under 4 hours',
    ultra: 'Under 1 hour',
  },
} as const;

// Type-safe access to config values
export type SiteConfig = typeof SITE_CONFIG;
