export interface DiffSegment {
  text: string;
  added: boolean;
}

// Word-level LCS diff between two short strings (a rewritten sentence vs its
// original, both from REWRITE_SPAN_SYSTEM's single-sentence output) — small
// enough that an O(n*m) DP table is fine, no diff library needed. Used to bold
// only what the AI actually changed, instead of restating the whole sentence.
export function wordDiff(original: string, rewritten: string): DiffSegment[] {
  const a = original.split(/(\s+)/).filter(Boolean);
  const b = rewritten.split(/(\s+)/).filter(Boolean);

  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  const push = (text: string, added: boolean) => {
    const last = segments[segments.length - 1];
    if (last && last.added === added) last.text += text;
    else segments.push({ text, added });
  };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(b[j], false);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      push(b[j], true);
      j++;
    }
  }
  while (j < b.length) {
    push(b[j], true);
    j++;
  }
  return segments;
}
