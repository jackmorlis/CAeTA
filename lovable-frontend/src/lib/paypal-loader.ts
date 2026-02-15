// PayPal SDK Dynamic Loader
// Loads PayPal SDK dynamically at runtime with client ID from backend

import { apiClient } from './api';

let paypalLoadPromise: Promise<void> | null = null;
let isLoaded = false;
let clientIdPromise: Promise<{ client_id: string; mode: string }> | null = null;

const CACHE_KEY = 'paypal_client_config';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Prefetch PayPal client ID and cache it in localStorage
 * Call this early in the form flow (Step 1) to avoid delays later
 */
export async function prefetchPayPalClientId(): Promise<void> {
  // Check if already cached and valid
  const cached = getCachedClientConfig();
  if (cached) {
    // console.log('PayPal client ID already cached');
    return;
  }

  // If already fetching, return existing promise
  if (clientIdPromise) {
    // console.log('PayPal client ID fetch in progress, waiting...');
    await clientIdPromise;
    return;
  }

  // Start fetching
  // console.log('Prefetching PayPal client ID...');
  clientIdPromise = apiClient.getPayPalClientId();

  try {
    const config = await clientIdPromise;
    // Cache in localStorage
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...config,
      timestamp: Date.now()
    }));
    // console.log('✅ PayPal client ID prefetched and cached');
  } catch (error) {
    // console.error('❌ Failed to prefetch PayPal client ID:', error);
    clientIdPromise = null;
    throw error;
  }
}

/**
 * Get cached client config from localStorage
 */
function getCachedClientConfig(): { client_id: string; mode: string } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - (data.timestamp || 0);

    // Check if cache is still valid
    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return { client_id: data.client_id, mode: data.mode };
  } catch {
    return null;
  }
}

/**
 * Dynamically loads the PayPal SDK script
 * Uses client ID fetched from backend to avoid exposing it in page source
 * Returns a promise that resolves when SDK is ready
 */
export async function loadPayPalSDK(): Promise<void> {
  // If already loaded, return immediately
  if (isLoaded && window.paypal) {
    // console.log('PayPal SDK already loaded');
    return Promise.resolve();
  }

  // If loading is in progress, return the existing promise
  if (paypalLoadPromise) {
    // console.log('PayPal SDK loading in progress, waiting...');
    return paypalLoadPromise;
  }

  // Start loading
  // console.log('Starting PayPal SDK load...');
  paypalLoadPromise = (async () => {
    try {
      // Try to get from cache first, otherwise fetch
      let config = getCachedClientConfig();

      if (!config) {
        // console.log('Fetching PayPal client ID from backend...');
        config = await apiClient.getPayPalClientId();
        // Cache for future use
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ...config,
          timestamp: Date.now()
        }));
        // console.log(`PayPal client ID fetched successfully (mode: ${config.mode})`);
      } else {
        // console.log(`Using cached PayPal client ID (mode: ${config.mode})`);
      }

      // Create and inject script tag
      // IMPORTANT: intent=authorize must match backend's intent=AUTHORIZE for pre-auth flow
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.client_id}&components=buttons,card-fields&currency=USD&intent=authorize`;
      script.async = true;

      // Wait for script to load
      await new Promise<void>((resolve, reject) => {
        script.onload = () => {
          // console.log('✅ PayPal SDK loaded successfully');
          isLoaded = true;
          resolve();
        };
        script.onerror = () => {
          // console.error('❌ Failed to load PayPal SDK');
          reject(new Error('Failed to load PayPal SDK'));
        };

        document.head.appendChild(script);
      });

      // Wait a bit more for SDK to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!window.paypal) {
        throw new Error('PayPal SDK loaded but window.paypal is not available');
      }

      // console.log('PayPal SDK ready');
    } catch (error) {
      // console.error('Error loading PayPal SDK:', error);
      paypalLoadPromise = null; // Reset so it can be retried
      throw error;
    }
  })();

  return paypalLoadPromise;
}

/**
 * Check if PayPal SDK is loaded
 */
export function isPayPalLoaded(): boolean {
  return isLoaded && !!window.paypal;
}
