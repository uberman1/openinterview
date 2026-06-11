/**
 * Reconcile entitlements.shares_used with actual published profile count.
 * Publish/unpublish keep +1/-1 for speed; call reconcile after reset, plan changes, bulk unpublish.
 */
import * as pgClient from '../db/pg-client.js';

/**
 * Set shares_used = COUNT(profiles WHERE visibility = 'public').
 * @returns {{ publicCount: number, previousSharesUsed: number, changed: boolean }}
 */
export async function reconcileSharesUsed(userId) {
  if (!userId) {
    return { publicCount: 0, previousSharesUsed: 0, changed: false };
  }

  const entitlement = await pgClient.getEntitlement(userId);
  const previousSharesUsed = Number(entitlement?.sharesUsed ?? 0) || 0;
  const publicCount = await pgClient.countPublicProfilesByUser(userId);

  if (previousSharesUsed === publicCount) {
    return { publicCount, previousSharesUsed, changed: false };
  }

  await pgClient.setSharesUsed(userId, publicCount);
  console.log(
    `[share-credits] Reconciled shares_used for ${userId}: ${previousSharesUsed} → ${publicCount} (public profiles)`
  );

  return { publicCount, previousSharesUsed, changed: true };
}
