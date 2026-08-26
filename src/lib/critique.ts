import { CritiqueCategory, CritiqueSpan } from './api';

export const CRITIQUE_CATEGORY_META: Record<
  CritiqueCategory,
  { label: string; tone: 'success' | 'warning' | 'brand'; mark: string }
> = {
  strength: {
    label: '잘 쓴 부분',
    tone: 'success',
    mark: 'bg-emerald-100/70 decoration-emerald-500'
  },
  improvement: {
    label: '보완 필요',
    tone: 'warning',
    mark: 'bg-amber-100/70 decoration-amber-500'
  },
  suggestion: {
    label: '표현 추천',
    tone: 'brand',
    mark: 'bg-brand-100/70 decoration-brand-500'
  }
};

export interface DocumentSegment {
  text: string;
  span?: CritiqueSpan;
}

/**
 * Split the document into plain runs and critique runs so the editor can underline each
 * commented-on sentence where it actually sits in the text.
 *
 * Spans are located by exact string match (the critique prompt requires a verbatim span,
 * and the backend snaps near-misses onto the real span before returning). A span that
 * still cannot be found is simply left out of the segmentation — it stays visible in the
 * side panel, it just isn't highlighted.
 */
export function segmentByCritique(content: string, spans: CritiqueSpan[]): DocumentSegment[] {
  if (!content) return [];

  const ranges: { start: number; end: number; span: CritiqueSpan }[] = [];
  for (const span of spans) {
    const needle = span.span_text;
    if (!needle) continue;
    const start = content.indexOf(needle);
    if (start === -1) continue;
    ranges.push({ start, end: start + needle.length, span });
  }

  // Longest-first at the same offset, so a span nested inside another doesn't win.
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: DocumentSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue; // overlaps an already-emitted span
    if (range.start > cursor) segments.push({ text: content.slice(cursor, range.start) });
    segments.push({ text: content.slice(range.start, range.end), span: range.span });
    cursor = range.end;
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor) });

  return segments;
}

/** Ids of the critique spans that could actually be located in the document. */
export function locatableCritiqueSpanIds(content: string, spans: CritiqueSpan[]): Set<string> {
  const ids = new Set<string>();
  for (const span of spans) {
    if (span.span_text && content.includes(span.span_text)) ids.add(span.span_id);
  }
  return ids;
}

export const critiqueMarkId = (spanId: string) => `critique-mark-${spanId}`;
export const critiqueCardId = (spanId: string) => `critique-card-${spanId}`;
