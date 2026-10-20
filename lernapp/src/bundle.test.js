import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));

/** Alle Quelldateien unter src (rekursiv). */
function dateien(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? dateien(p) : /\.(js|jsx)$/.test(f) ? [p] : [];
  });
}

describe('Bundle-Hygiene', () => {
  it('importiert lucide-react nie als Namespace (würde alle ~1500 Icons bundeln)', () => {
    const treffer = dateien(SRC).filter((p) =>
      /import\s+\*\s+as\s+\w+\s+from\s+['"]lucide-react['"]/.test(readFileSync(p, 'utf8'))
    );
    expect(treffer).toEqual([]);
  });
});
