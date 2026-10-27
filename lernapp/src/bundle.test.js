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

  it('C9: exam_data.json wird außerhalb von Tests nie statisch importiert (nur nach Login per import())', () => {
    const treffer = dateien(SRC)
      .filter((p) => !/\.test\.jsx?$/.test(p) && !p.includes(`${join('src', 'test')}`))
      .filter((p) => /^\s*import\s+[^(]*['"][^'"]*exam_data\.json['"]/m.test(readFileSync(p, 'utf8')));
    expect(treffer).toEqual([]);
  });

  it('C9: vite.config nimmt den examdata-Chunk aus dem Precache und cacht ihn zur Laufzeit', () => {
    const cfg = readFileSync(join(SRC, '..', 'vite.config.js'), 'utf8');
    expect(cfg).toMatch(/globIgnores:\s*\[[^\]]*examdata-\*\.js/);
    expect(cfg).toMatch(/runtimeCaching/);
    expect(cfg).toMatch(/handler:\s*'CacheFirst'/);
    expect(cfg).toMatch(/cacheName:\s*EXAMDATEN_CACHE/);
  });
});
