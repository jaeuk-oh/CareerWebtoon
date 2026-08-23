import React from 'react';
import { ClaimValidation } from '../lib/api';
import {
  CLAIM_STATUS_META,
  claimMarkId,
  claimStatus,
  segmentByClaims
} from '../lib/claims';
import { cn } from './ui';

interface DocumentCanvasProps {
  content: string;
  claims: ClaimValidation[];
  activeClaimId: string | null;
  onSelectClaim: (claimId: string) => void;
}

/**
 * Read-only rendering of the document with each validated claim underlined in place.
 * This is the half of the editor that makes the product's core promise visible: the
 * validation result sits on the sentence it is about, not in a separate list.
 */
export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  content,
  claims,
  activeClaimId,
  onSelectClaim
}) => {
  const segments = segmentByClaims(content, claims);

  return (
    <div className="whitespace-pre-wrap text-base leading-[1.9] text-slate-800">
      {segments.map((segment, i) => {
        if (!segment.claim) return <span key={i}>{segment.text}</span>;

        const status = claimStatus(segment.claim);
        const meta = CLAIM_STATUS_META[status];
        const isActive = activeClaimId === segment.claim.claim_id;

        return (
          <mark
            key={i}
            id={claimMarkId(segment.claim.claim_id)}
            role="button"
            tabIndex={0}
            title={`${meta.label} — 클릭하면 오른쪽 검증 카드로 이동합니다`}
            onClick={() => onSelectClaim(segment.claim!.claim_id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectClaim(segment.claim!.claim_id);
              }
            }}
            className={cn(
              'cursor-pointer rounded-sm underline decoration-2 underline-offset-4 transition-all',
              meta.mark,
              isActive ? 'ring-2 ring-brand-400 ring-offset-1' : 'hover:brightness-95'
            )}
          >
            {segment.text}
          </mark>
        );
      })}
    </div>
  );
};
