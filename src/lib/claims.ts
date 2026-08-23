import { ClaimValidation } from './api';

export type ClaimStatus = 'VERIFIED' | 'FLAGGED' | 'UNVERIFIED';

export const claimStatus = (claim: ClaimValidation): ClaimStatus => {
  const raw = (claim.status || '').toUpperCase();
  return raw === 'VERIFIED' || raw === 'FLAGGED' ? raw : 'UNVERIFIED';
};

export const CLAIM_STATUS_META: Record<
  ClaimStatus,
  { label: string; short: string; tone: 'success' | 'warning' | 'danger'; mark: string; accent: 'success' | 'warning' | 'danger' }
> = {
  VERIFIED: {
    label: '검증 완료',
    short: '검증됨',
    tone: 'success',
    accent: 'success',
    mark: 'bg-emerald-100/70 decoration-emerald-500'
  },
  FLAGGED: {
    label: '근거 보강 필요',
    short: '주의',
    tone: 'warning',
    accent: 'warning',
    mark: 'bg-amber-100/70 decoration-amber-500'
  },
  UNVERIFIED: {
    label: '미검증',
    short: '미검증',
    tone: 'danger',
    accent: 'danger',
    mark: 'bg-rose-100/70 decoration-rose-500'
  }
};

export interface DocumentSegment {
  text: string;
  claim?: ClaimValidation;
}

/**
 * Split the document into plain runs and claim runs so the editor can underline each
 * validated sentence where it actually sits in the text.
 *
 * Claims are located by exact string match (the extraction prompt requires a verbatim
 * span, and the backend snaps near-misses onto the real span before saving). A claim
 * that still cannot be found is simply left out of the segmentation — it stays visible
 * in the side panel, it just isn't highlighted.
 */
export function segmentByClaims(content: string, claims: ClaimValidation[]): DocumentSegment[] {
  if (!content) return [];

  const spans: { start: number; end: number; claim: ClaimValidation }[] = [];
  for (const claim of claims) {
    const needle = claim.claim_text;
    if (!needle) continue;
    const start = content.indexOf(needle);
    if (start === -1) continue;
    spans.push({ start, end: start + needle.length, claim });
  }

  // Longest-first at the same offset, so a claim nested inside another doesn't win.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: DocumentSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue; // overlaps an already-emitted claim
    if (span.start > cursor) segments.push({ text: content.slice(cursor, span.start) });
    segments.push({ text: content.slice(span.start, span.end), claim: span.claim });
    cursor = span.end;
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor) });

  return segments;
}

/** Ids of the claims that could actually be located in the document. */
export function locatableClaimIds(content: string, claims: ClaimValidation[]): Set<string> {
  const ids = new Set<string>();
  for (const claim of claims) {
    if (claim.claim_text && content.includes(claim.claim_text)) ids.add(claim.claim_id);
  }
  return ids;
}

export const claimMarkId = (claimId: string) => `claim-mark-${claimId}`;
export const claimCardId = (claimId: string) => `claim-card-${claimId}`;
