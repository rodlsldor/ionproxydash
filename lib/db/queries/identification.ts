import { db } from '@/lib/db/drizzle';
import {
  identityVerifications,
  type IdentityVerification,
  type NewIdentityVerification,
} from '@/lib/db/schema';
import {
  eq,
  and,
  or,
  isNull,
  desc,
  lt,
} from 'drizzle-orm';

/* =========================
 * IDENTITY VERIFICATION – READ QUERIES
 * ========================= */

type KycStatusResult = {
  status: 'none' | 'pending' | 'waiting' | 'verified' | 'rejected';
  level: string | null;
  lastUpdatedAt: Date | null;
  manualReviewRequired: boolean;
};

/**
 * Retourne un statut KYC simple et exploitable pour le frontend
 */
export async function getKycStatusForUser(
  userId: number
): Promise<KycStatusResult> {
  const kyc = await getLatestIdentityVerificationForUser(userId);

  // Aucun KYC encore démarré
  if (!kyc) {
    return {
      status: 'none',
      level: null,
      lastUpdatedAt: null,
      manualReviewRequired: false,
    };
  }

  let status: KycStatusResult['status'] = 'pending';

  switch (kyc.status) {
    case 'verified':
      status = 'verified';
      break;
    case 'rejected':
      status = 'rejected';
      break;
    case 'waiting':
      status = 'waiting';
      break;
    case 'pending':
    default:
      status = 'pending';
  }

  return {
    status,
    level: kyc.level ?? null,
    lastUpdatedAt:
      kyc.verifiedAt ??
      kyc.rejectedAt ??
      kyc.updatedAt ??
      kyc.createdAt ??
      null,
    manualReviewRequired: kyc.manualReviewRequired,
  };
}


// Dernière vérification (tous statuts) pour un user
export async function getLatestIdentityVerificationForUser(
  userId: number
): Promise<IdentityVerification | null> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.userId, userId),
        isNull(identityVerifications.deletedAt)
      )
    )
    .orderBy(desc(identityVerifications.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

// Dernière vérification "validée" pour un user (status = 'verified')
export async function getLatestVerifiedIdentityVerificationForUser(
  userId: number
): Promise<IdentityVerification | null> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.userId, userId),
        eq(identityVerifications.status, 'verified'),
        isNull(identityVerifications.deletedAt)
      )
    )
    .orderBy(desc(identityVerifications.verifiedAt))
    .limit(1);

  return rows[0] ?? null;
}

// Historique complet pour un user
export async function getIdentityVerificationsForUser(
  userId: number
): Promise<IdentityVerification[]> {
  return db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.userId, userId),
        isNull(identityVerifications.deletedAt)
      )
    )
    .orderBy(desc(identityVerifications.createdAt));
}

// Récupérer une vérif par ID
export async function getIdentityVerificationById(
  id: number
): Promise<IdentityVerification | null> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.id, id),
        isNull(identityVerifications.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

// Récupérer par providerSessionId (utile pour webhooks / callbacks)
export async function getIdentityVerificationByProviderSessionId(
  providerSessionId: string
): Promise<IdentityVerification | null> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.providerSessionId, providerSessionId),
        isNull(identityVerifications.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

// Récupérer par providerVerificationId
export async function getIdentityVerificationByProviderVerificationId(
  providerVerificationId: string
): Promise<IdentityVerification | null> {
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.providerVerificationId, providerVerificationId),
        isNull(identityVerifications.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

// File d'attente générique par statut
export async function getIdentityVerificationsByStatus(
  status: string,
  limit = 50
): Promise<IdentityVerification[]> {
  return db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.status, status),
        isNull(identityVerifications.deletedAt)
      )
    )
    .orderBy(desc(identityVerifications.createdAt))
    .limit(limit);
}

// Vérifications en attente (status = 'pending')
export async function getPendingIdentityVerifications(
  limit = 50
): Promise<IdentityVerification[]> {
  return getIdentityVerificationsByStatus('pending', limit);
}

// Vérifications marquées "manual_review_required"
export async function getManualReviewQueue(
  limit = 50
): Promise<IdentityVerification[]> {
  return db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.manualReviewRequired, true),
        isNull(identityVerifications.deletedAt),
        // potentiellement encore en pending / waiting_review
        or(
          eq(identityVerifications.status, 'pending'),
          eq(identityVerifications.status, 'waiting')
        )
      )
    )
    .orderBy(desc(identityVerifications.createdAt))
    .limit(limit);
}

// Documents expirés (documentExpiryDate < now)
export async function getVerificationsWithExpiredDocuments(
  now: Date = new Date()
): Promise<IdentityVerification[]> {
  return db
    .select()
    .from(identityVerifications)
    .where(
      and(
        lt(identityVerifications.documentExpiryDate, now),
        isNull(identityVerifications.deletedAt)
      )
    )
    .orderBy(desc(identityVerifications.documentExpiryDate));
}

/* =========================
 * IDENTITY VERIFICATION – WRITE / UPDATE HELPERS
 * ========================= */

// Créer une nouvelle vérification
export async function createIdentityVerification(
  data: NewIdentityVerification
): Promise<IdentityVerification> {
  const [row] = await db
    .insert(identityVerifications)
    .values(data)
    .returning();

  return row;
}

// Marquer comme "verified"
export async function markIdentityVerificationVerified(
  id: number,
  reviewedBy?: number,
  reviewNotes?: string
): Promise<IdentityVerification | null> {
  const [row] = await db
    .update(identityVerifications)
    .set({
      status: 'verified',
      manualReviewRequired: false,
      reviewedBy: reviewedBy ?? null,
      reviewNotes: reviewNotes ?? null,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(identityVerifications.id, id))
    .returning();

  return row ?? null;
}

// Marquer comme "rejected"
export async function markIdentityVerificationRejected(
  id: number,
  reason: string,
  reviewedBy?: number
): Promise<IdentityVerification | null> {
  const [row] = await db
    .update(identityVerifications)
    .set({
      status: 'rejected',
      manualReviewRequired: false,
      reviewedBy: reviewedBy ?? null,
      reviewNotes: reason,
      rejectedReason: reason,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(identityVerifications.id, id))
    .returning();

  return row ?? null;
}

// Flag pour revue manuelle
export async function flagIdentityVerificationForManualReview(
  id: number,
  reviewNotes?: string
): Promise<IdentityVerification | null> {
  const [row] = await db
    .update(identityVerifications)
    .set({
      manualReviewRequired: true,
      status: 'waiting', // si tu utilises ce statut
      reviewNotes: reviewNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(identityVerifications.id, id))
    .returning();

  return row ?? null;
}

// Soft delete
export async function softDeleteIdentityVerification(
  id: number
): Promise<void> {
  await db
    .update(identityVerifications)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(identityVerifications.id, id));
}
