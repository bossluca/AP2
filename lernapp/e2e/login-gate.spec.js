import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// C9 – Login-Pflicht mit gemocktem Backend (vite preview hat keins).
// Service Worker blockieren, damit page.route jede /api-Anfrage sieht.
test.use({ serviceWorkers: 'block' });

/** Mockt die Auth-API: Login-Pflicht, anfangs keine Sitzung. */
async function mockeBackend(page) {
  let angemeldet = false;
  const json = (route, status, body) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const pfad = url.pathname.replace(/^.*\/api/, '');
    if (pfad === '/auth/config') return json(route, 200, { registrierung: 'invite', loginPflicht: true });
    if (pfad === '/auth/me') {
      return angemeldet ? json(route, 200, { user: { id: 1, email: 'a@x.de' } }) : json(route, 401, { error: 'x' });
    }
    if (pfad === '/auth/login') {
      angemeldet = true;
      return json(route, 200, { user: { id: 1, email: 'a@x.de' } });
    }
    if (pfad === '/auth/logout') {
      angemeldet = false;
      return json(route, 200, { ok: true });
    }
    if (!angemeldet) return json(route, 401, { error: 'Nicht angemeldet' });
    if (pfad === '/progress') return json(route, 200, { progress: {} });
    if (pfad === '/gamification') return json(route, 200, { gamification: null });
    if (pfad === '/daten') return json(route, 200, { daten: {} });
    return json(route, 200, { ok: true });
  });
}

/** Zählt Anfragen an den Prüfungsdaten-Chunk. */
function zaehleExamdata(page) {
  const treffer = [];
  page.on('request', (r) => {
    if (/\/assets\/examdata-[\w-]+\.js$/.test(r.url())) treffer.push(r.url());
  });
  return treffer;
}

test('Gate: ohne Sitzung nur Konto-Seite, keine Lerninhalte geladen', async ({ page }) => {
  await mockeBackend(page);
  const examdata = zaehleExamdata(page);
  await page.goto('/#/lernzettel');
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();
  await expect(page).toHaveURL(/#\/konto$/);
  await expect(page.getByRole('link', { name: /Statistik/ })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(examdata).toEqual([]);
});

test('Gate: Einladungslink füllt den Code vor', async ({ page }) => {
  await mockeBackend(page);
  await page.goto('/#/konto?einladung=ABCD-EFGH-JKLM');
  await expect(page.getByLabel('Einladungscode')).toHaveValue('ABCD-EFGH-JKLM');
});

test('Gate: Login öffnet die App und lädt die Inhalte, Logout zeigt wieder das Gate', async ({ page }) => {
  await mockeBackend(page);
  const examdata = zaehleExamdata(page);
  await page.goto('/');
  await page.getByLabel('E-Mail').fill('a@x.de');
  await page.getByLabel('Passwort').fill('geheim1234');
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();
  await expect(page.getByText(/Angemeldet als/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Statistik/ }).first()).toBeVisible();
  expect(examdata.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Statistik/ })).toHaveCount(0);
  const reste = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('ap2_lernapp_'))
  );
  // Nach dem Logout bleiben nur Geräte-Einstellungen (Theme, Login-Pflicht-Merker).
  const erlaubt = ['ap2_lernapp_loginpflicht_v1', 'ap2_lernapp_theme_v1'];
  expect(reste.filter((k) => !erlaubt.includes(k))).toEqual([]);
});

for (const theme of ['light', 'dark']) {
  test(`a11y ${theme} Login-Gate`, async ({ page }) => {
    await mockeBackend(page);
    await page.addInitScript((t) => localStorage.setItem('ap2_lernapp_theme_v1', t), theme);
    await page.goto('/#/konto');
    await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toBeVisible();
    const ergebnis = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const kurz = ergebnis.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
    expect(kurz, kurz.join('\n')).toEqual([]);
  });
}
