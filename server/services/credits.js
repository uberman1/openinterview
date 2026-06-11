// server/services/credits.js
// WP9: Stripe Billing Cycle Credit Management
// CRITICAL: Credits reset by Stripe subscription period, NOT calendar month

// PLAN_CREDITS removed - now using database as single source of truth
// Use pgClient.getPlanByCode() to get plan limits

/**
 * Check if credits should be reset based on Stripe billing cycle
 * @param {Object} entitlement - User entitlement with Stripe subscription data
 * @param {Object} stripe - Stripe instance (optional, for checking subscription)
 * @returns {Promise<boolean>} - True if reset needed
 */
export async function shouldResetCredits(entitlement, stripe = null) {
  // Free plan - no reset needed
  if (!entitlement.stripeSubscriptionId) return false;
  
  // No previous reset - needs initial reset
  if (!entitlement.creditsResetAt) return true;
  
  // If Stripe instance provided, check actual billing period
  if (stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(entitlement.stripeSubscriptionId);
      const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      const lastReset = new Date(entitlement.creditsResetAt);
      
      // Reset if current period started after last reset
      return currentPeriodStart > lastReset;
    } catch (error) {
      console.error('[credits] Error checking Stripe subscription:', error);
      return false;
    }
  }
  
  // Without Stripe instance, can't determine - assume no reset needed
  return false;
}

/**
 * Get reset credits data for a plan
 */
export async function getResetCredits(planCode, pgClient, resetDate = null) {
  const plan = await pgClient.getPlanByCode(planCode);
  if (!plan) {
    console.error(`[credits] Plan not found: ${planCode}`);
    return null;
  }
  
  return {
    bookingsUsed: 0,
    bookingsLimit: plan.bookingsLimit,
    sharesLimit: plan.sharesLimit,
    creditsResetAt: resetDate || new Date().toISOString()
  };
}

/**
 * Reset credits based on Stripe billing cycle
 * Called from Stripe webhook when new billing period starts
 */
export async function resetBillingCycleCredits(userId, subscription, pgClient) {
  const entitlement = await pgClient.getEntitlement(userId);
  
  if (!entitlement) {
    console.error(`[credits] No entitlement found for user ${userId}`);
    return null;
  }
  
  const plan = await pgClient.getPlanByCode(entitlement.plan);
  if (!plan) {
    console.error(`[credits] Plan not found: ${entitlement.plan}`);
    return null;
  }
  
  const currentPeriodStart = new Date(subscription.current_period_start * 1000);
  
  // Reset credits to billing period start
  await pgClient.updateEntitlement(userId, {
    bookingsUsed: 0,
    bookingsLimit: plan.bookingsLimit,
    creditsResetAt: currentPeriodStart.toISOString()
  });
  
  console.log(`[credits] Reset for user ${userId} at billing period: ${currentPeriodStart.toISOString()}`);
  
  return {
    bookingsUsed: 0,
    bookingsLimit: plan.bookingsLimit,
    creditsResetAt: currentPeriodStart.toISOString()
  };
}

/**
 * Get credits info for display with Stripe billing cycle dates
 */
export async function getCreditsInfo(entitlement, stripe = null) {
  const used = entitlement.bookingsUsed || 0;
  const limit = entitlement.bookingsLimit || 0;
  const remaining = Math.max(0, limit - used);
  
  let nextResetDate = null;
  let nextBillingDate = null;
  
  // Get next reset date from Stripe subscription
  if (entitlement.stripeSubscriptionId && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(entitlement.stripeSubscriptionId);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      nextResetDate = currentPeriodEnd.toISOString();
      nextBillingDate = currentPeriodEnd.toISOString();
    } catch (error) {
      console.error('[credits] Error fetching Stripe subscription:', error);
    }
  }
  
  return {
    used,
    limit,
    remaining,
    percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
    resetDate: nextResetDate,
    nextBillingDate: nextBillingDate,
    plan: entitlement.plan || 'free'
  };
}

/**
 * Upgrade plan and reset credits with new limits
 */
export async function getUpgradedCredits(newPlanCode, pgClient, billingPeriodStart = null) {
  const plan = await pgClient.getPlanByCode(newPlanCode);
  if (!plan) {
    throw new Error(`Plan not found: ${newPlanCode}`);
  }
  
  return {
    plan: newPlanCode,
    sharesLimit: plan.sharesLimit,
    bookingsUsed: 0,
    bookingsLimit: plan.bookingsLimit,
    creditsResetAt: billingPeriodStart || new Date().toISOString()
  };
}

export default {
  shouldResetCredits,
  getResetCredits,
  resetBillingCycleCredits,
  getCreditsInfo,
  getUpgradedCredits
};
