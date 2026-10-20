import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Automatischer Barrierefreiheits-Check (WCAG 2.1 A/AA) der Hauptseiten in
// beiden Themes. Findet nur maschinell prüfbare Fehler – ersetzt keinen
// manuellen Test mit Screenreader/Tastatur.
const SEITEN = ['/', '/#/lernen', '/#/einstufung', '/#/rechnen', '/#/statistik', '/#/konto', '/#/drill'];

for (const theme of ['light', 'dark']) {
  for (const pfad of SEITEN) {
    test(`a11y ${theme} ${pfad}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('ap2_lernapp_theme_v1', t), theme);
      await page.goto(pfad);
      await page.waitForLoadState('networkidle');
      const ergebnis = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const kurz = ergebnis.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
      expect(kurz, kurz.join('\n')).toEqual([]);
    });
  }
}
