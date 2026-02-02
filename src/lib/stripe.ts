import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set - billing features disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Stripe Price IDs - set these in your Stripe dashboard
 * 
 * Create products:
 * - Moltboard Pro ($12/month)
 * - Moltboard Team ($29/month)
 * 
 * Then copy the price IDs here
 */
export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
  team_yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || '',
};

/**
 * Map Stripe price ID to plan type
 */
export function getPlanFromPriceId(priceId: string): 'pro' | 'team' | null {
  if (priceId === STRIPE_PRICES.pro_monthly || priceId === STRIPE_PRICES.pro_yearly) {
    return 'pro';
  }
  if (priceId === STRIPE_PRICES.team_monthly || priceId === STRIPE_PRICES.team_yearly) {
    return 'team';
  }
  return null;
}

/**
 * Check if Stripe is configured
 */
export function isStripeEnabled(): boolean {
  return Boolean(stripe && STRIPE_PRICES.pro_monthly);
}
