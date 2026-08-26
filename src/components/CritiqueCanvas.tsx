import React from 'react';
import { CritiqueSpan } from '../lib/api';
import { CRITIQUE_CATEGORY_META, critiqueMarkId, segmentByCritique } from '../lib/critique';
import { cn } from './ui';

interface CritiqueCanvasProps {
  content: string;
  spans: CritiqueSpan[];
  activeSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

/**
 * Read-only rendering of the document with each critique comment underlined in place.
 * Mirrors the old claim-highlighting canvas, but the highlight is about how a sentence
 * is written rather than whether it is factually grounded.
 */
export const CritiqueCanvas: React.FC<CritiqueCanvasProps> = ({
  content,
  spans,
  activeSpanId,
  onSelectSpan
}) => {
  const segments = segmentByCritique(content, spans);

  return (
    <div className="whitespace-pre-wrap text-base leading-[1.9] text-slate-800">
      {segments.map((segment, i) => {
        if (!segment.span) return <span key={i}>{segment.text}</span>;

        const meta = CRITIQUE_CATEGORY_META[segment.span.category];
        const isActive = activeSpanId === segment.span.span_id;

        return (
          <mark
            key={i}
            id={critiqueMarkId(segment.span.span_id)}
            role="button"
            tabIndex={0}
            title={`${meta.label} — 클릭하면 오른쪽 첨삭 카드로 이동합니다`}
            onClick={() => onSelectSpan(segment.span!.span_id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSpan(segment.span!.span_id);
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
