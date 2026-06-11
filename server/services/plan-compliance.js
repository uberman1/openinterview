/**
 * Plan downgrade / cancel compliance: instant share unpublish, overage warnings, purge at reset.
 */
import * as pgClient from '../db/pg-client.js';
import { reconcileSharesUsed } from './share-credits.js';
import { DEFAULT_VIDEO_URL } from '../config/defaults.js';

/** Target plan for compliance while still on paid tier until renewal / period end. */
export function getComplianceTargetPlanCode(entitlement) {
  if (!entitlement) return null;
  if (entitlement.stripeCancelAtPeriodEnd) return 'free';
  if (entitlement.pendingDowngradePlan) return entitlement.pendingDowngradePlan;
  return null;
}

/**
 * Instant FIFO unpublish (oldest created_at first) to fit target plan shares_limit.
 * Does not change entitlement.plan or other limits.
 */
export async function unpublishExcessShares(userId, targetPlan) {
  if (!targetPlan || targetPlan.sharesLimit === null || targetPlan.sharesLimit === undefined) {
    const shares = await reconcileSharesUsed(userId);
    return { skipped: true, reason: 'unlimited_shares', unpublishedProfileIds: [], sharesReconciled: shares };
  }

  const limit = Number(targetPlan.sharesLimit);
  if (!Number.isFinite(limit) || limit < 0) {
    return { skipped: true, reason: 'invalid_limit', unpublishedProfileIds: [] };
  }

  const publicProfiles = await pgClient.listPublicProfilesByUserOldestFirst(userId);
  const excess = publicProfiles.length - limit;
  if (excess <= 0) {
    const shares = await reconcileSharesUsed(userId);
    return {
      skipped: false,
      unpublishedProfileIds: [],
      keptPublic: publicProfiles.length,
      sharesReconciled: shares
    };
  }

  const toUnpublish = publicProfiles.slice(0, excess);
  const unpublishedProfileIds = [];
  for (const profile of toUnpublish) {
    try {
      await pgClient.unpublishProfile(userId, profile.id);
      unpublishedProfileIds.push(profile.id);
    } catch (err) {
      console.error(`[plan-compliance] unpublish failed profile=${profile.id} user=${userId}:`, err?.message || err);
    }
  }

  console.log(
    `[plan-compliance] Unpublished ${unpublishedProfileIds.length}/${excess} oldest public profiles for user ${userId} (target=${targetPlan.code}, limit=${limit})`
  );

  const shares = await reconcileSharesUsed(userId);

  return {
    skipped: false,
    targetPlanCode: targetPlan.code,
    sharesLimit: limit,
    unpublishedProfileIds,
    unpublishedCount: unpublishedProfileIds.length,
    sharesReconciled: shares
  };
}

export async function applyInstantDowngradeCompliance(userId, targetPlanCode) {
  const targetPlan = await pgClient.getPlanByCode(targetPlanCode);
  if (!targetPlan) {
    console.warn(`[plan-compliance] Unknown target plan ${targetPlanCode} for user ${userId}`);
    return { unpublish: null };
  }
  const unpublish = await unpublishExcessShares(userId, targetPlan);
  const sharesReconciled =
    unpublish?.sharesReconciled ?? (await reconcileSharesUsed(userId));
  return { unpublish, targetPlanCode: targetPlan.code, sharesReconciled };
}

async function getCloudinaryVideoDurationSeconds(publicId) {
  if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) return null;
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    const resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
    const d = resource?.duration;
    return typeof d === 'number' && Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

function isVideoKind(file) {
  const kind = file?.kind || '';
  const mime = file?.mime || '';
  return kind === 'video' || kind.startsWith('video') || mime.startsWith('video/');
}

function isDocKind(file) {
  return !isVideoKind(file);
}

/** Assess storage / duration vs target plan (not necessarily current entitlement.plan). */
export async function assessMediaOverage(userId, targetPlan, entitlement) {
  if (!targetPlan || !entitlement) {
    return { hasOverage: false, items: [] };
  }

  const items = [];
  const videoUsed = Number(entitlement.videoStorageUsedBytes || 0);
  const docUsed = Number(entitlement.docStorageUsedBytes || 0);
  const videoLimit = targetPlan.videoStorageLimitBytes;
  const docLimit = targetPlan.docStorageLimitBytes;
  const maxSeconds = Number(targetPlan.maxInterviewLengthSeconds || 0);

  if (videoLimit !== null && videoLimit !== undefined && videoUsed > Number(videoLimit)) {
    items.push({
      type: 'video_storage',
      usedBytes: videoUsed,
      limitBytes: Number(videoLimit),
      overBytes: videoUsed - Number(videoLimit)
    });
  }

  if (docLimit !== null && docLimit !== undefined && docUsed > Number(docLimit)) {
    items.push({
      type: 'doc_storage',
      usedBytes: docUsed,
      limitBytes: Number(docLimit),
      overBytes: docUsed - Number(docLimit)
    });
  }

  if (maxSeconds > 0) {
    const profiles = await pgClient.listProfilesByUser(userId);
    const seenFileIds = new Set();
    for (const profile of profiles) {
      const fileIds = [profile.video_file_id, profile.videoFileId].filter(Boolean);
      for (const fileId of fileIds) {
        if (seenFileIds.has(fileId)) continue;
        seenFileIds.add(fileId);
        const file = await pgClient.getFile(fileId);
        if (!file || !isVideoKind(file)) continue;
        const duration = await getCloudinaryVideoDurationSeconds(file.public_id);
        if (duration != null && duration > maxSeconds) {
          items.push({
            type: 'video_duration',
            profileId: profile.id,
            fileId: file.id,
            durationSeconds: Math.round(duration),
            maxSeconds
          });
        }
      }
    }

    const allFiles = await pgClient.listFilesByUser(userId);
    for (const file of allFiles) {
      if (!isVideoKind(file) || seenFileIds.has(file.id)) continue;
      const duration = await getCloudinaryVideoDurationSeconds(file.public_id);
      if (duration != null && duration > maxSeconds) {
        items.push({
          type: 'video_duration',
          profileId: file.profile_id,
          fileId: file.id,
          durationSeconds: Math.round(duration),
          maxSeconds
        });
      }
    }
  }

  return { hasOverage: items.length > 0, items };
}

export async function getComplianceStatusForUser(userId) {
  const entitlement = await pgClient.getEntitlement(userId);
  if (!entitlement) {
    return { hasWarnings: false, warnings: [], messages: [] };
  }

  const targetPlanCode = getComplianceTargetPlanCode(entitlement);
  if (!targetPlanCode) {
    return { hasWarnings: false, warnings: [], messages: [] };
  }

  const targetPlan = await pgClient.getPlanByCode(targetPlanCode);
  if (!targetPlan) {
    return { hasWarnings: false, warnings: [], messages: [] };
  }

  const overage = await assessMediaOverage(userId, targetPlan, entitlement);
  const purgeAt = entitlement.creditsResetAt || entitlement.stripeCancelAtPeriodEnd || null;
  const messages = [];

  if (overage.hasOverage) {
    const planLabel = targetPlan.name || targetPlan.code;
    const resetLabel = purgeAt
      ? new Date(purgeAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : 'your next billing reset';

    const parts = [];
    if (overage.items.some((i) => i.type === 'video_storage')) parts.push('video storage');
    if (overage.items.some((i) => i.type === 'doc_storage')) parts.push('document storage');
    if (overage.items.some((i) => i.type === 'video_duration')) parts.push('video length');

    messages.push(
      `Your ${planLabel} plan limits are lower than your current ${parts.join(', ')}. ` +
        `Content still over the limit will be removed on ${resetLabel} unless you replace it with files within your new limits. ` +
        `We cannot shorten existing videos.`
    );
  }

  return {
    hasWarnings: overage.hasOverage,
    targetPlanCode: targetPlan.code,
    targetPlanName: targetPlan.name,
    purgeAt,
    overageItems: overage.items,
    warnings: overage.items.map((item) => ({ code: item.type, ...item })),
    messages
  };
}

async function deleteMediaFileRecord(file) {
  if (!file?.id) return false;

  if (file.public_id && process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      let resourceType = 'raw';
      if (file.mime?.startsWith('video/') || file.kind === 'video') resourceType = 'video';
      else if (file.mime?.startsWith('image/') || file.kind === 'thumbnail' || file.kind === 'avatar') {
        resourceType = 'image';
      }
      await cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType, invalidate: true });
    } catch (err) {
      console.error(`[plan-compliance] Cloudinary delete failed ${file.public_id}:`, err?.message || err);
    }
  }

  await pgClient.deleteFile(file.id);

  const userId = file.user_id;
  const size = parseInt(file.size_bytes || 0, 10);
  if (userId && size > 0) {
    const type = isVideoKind(file) ? 'video' : 'doc';
    await pgClient.atomicUpdateStorageUsage(userId, type, -size, false);
  }

  if (file.profile_id) {
    const profile = await pgClient.getProfile(file.profile_id);
    if (profile && (profile.video_file_id === file.id || profile.videoFileId === file.id)) {
      await pgClient.updateProfile(file.profile_id, {
        video_file_id: null,
        video_url: DEFAULT_VIDEO_URL
      });
    }
  }

  return true;
}

/**
 * At billing reset: remove media still over current entitlement.plan limits.
 */
export async function purgeMediaOverageIfNeeded(userId) {
  const entitlement = await pgClient.getEntitlement(userId);
  if (!entitlement) return { purged: false };

  const plan = await pgClient.getPlanByCode(entitlement.plan || 'free');
  if (!plan) return { purged: false };

  const overage = await assessMediaOverage(userId, plan, entitlement);
  if (!overage.hasOverage) {
    return { purged: false, reason: 'compliant' };
  }

  const deletedFileIds = [];
  let ent = entitlement;

  const videoLimit = plan.videoStorageLimitBytes;
  if (videoLimit !== null && videoLimit !== undefined) {
    let videoUsed = Number(ent.videoStorageUsedBytes || 0);
    const limit = Number(videoLimit);
    if (videoUsed > limit) {
      const files = (await pgClient.listFilesByUser(userId))
        .filter(isVideoKind)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      for (const file of files) {
        if (videoUsed <= limit) break;
        await deleteMediaFileRecord(file);
        deletedFileIds.push(file.id);
        ent = (await pgClient.getEntitlement(userId)) || ent;
        videoUsed = Number(ent.videoStorageUsedBytes || 0);
      }
    }
  }

  const docLimit = plan.docStorageLimitBytes;
  if (docLimit !== null && docLimit !== undefined) {
    let docUsed = Number(ent.docStorageUsedBytes || 0);
    const limit = Number(docLimit);
    if (docUsed > limit) {
      const files = (await pgClient.listFilesByUser(userId))
        .filter(isDocKind)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      for (const file of files) {
        if (docUsed <= limit) break;
        await deleteMediaFileRecord(file);
        deletedFileIds.push(file.id);
        ent = (await pgClient.getEntitlement(userId)) || ent;
        docUsed = Number(ent.docStorageUsedBytes || 0);
      }
    }
  }

  const maxSeconds = Number(plan.maxInterviewLengthSeconds || 0);
  if (maxSeconds > 0) {
    const files = (await pgClient.listFilesByUser(userId)).filter(isVideoKind);
    for (const file of files) {
      const duration = await getCloudinaryVideoDurationSeconds(file.public_id);
      if (duration != null && duration > maxSeconds) {
        await deleteMediaFileRecord(file);
        deletedFileIds.push(file.id);
      }
    }
  }

  if (deletedFileIds.length > 0) {
    console.log(`[plan-compliance] Purged ${deletedFileIds.length} file(s) for user ${userId} (plan=${plan.code})`);
  }

  return { purged: deletedFileIds.length > 0, deletedFileIds, planCode: plan.code };
}
