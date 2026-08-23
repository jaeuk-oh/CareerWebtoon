/**
 * Minimal class joiner. Deliberately not tailwind-merge: the primitives own their
 * base classes and callers only add layout/spacing on top, so there is nothing to
 * de-duplicate and no reason to pull in another dependency.
 */
export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');
