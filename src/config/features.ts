/**
 * Feature Flags Configuration
 * 
 * Centralized feature toggles for Unyva backend.
 * Controlled via environment variables.
 * 
 * Production environment defaults to Hotspot being DISABLED unless explicitly
 * enabled via HOTSPOT_ENABLED=true.
 */

export const isHotspotEnabled = (): boolean => {
  const envVal = process.env.HOTSPOT_ENABLED;

  if (envVal !== undefined) {
    return envVal === 'true' || envVal === '1';
  }

  // In production, default strictly to FALSE (disabled)
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // In non-production environments without explicit variable,
  // default to false to match the disabled state across environments.
  return false;
};
