import { test, expect } from '@playwright/test';

// Jeder Test startet mit leerem localStorage (frischer Browser-Kontext).

test('Startseite lädt und schlägt Neulingen den Einstufungstest vor', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /FiSi\.dev/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Test starten' })).toBeVisible();
});

test('Einstufungstest bis zum Lernplan', async ({ page }) => {
  await page.goto('/#/einstufung');
  await page.getByRole('button', { name: /Kurz/ }).click();
  for (let i = 0; i < 40; i += 1) {
    const weissNicht = page.getByRole('button', { name: 'Weiß ich nicht' });
    if (!(await weissNicht.isVisible())) break;
    await weissNicht.click();
    await page.getByRole('button', { name: /^(Weiter|Auswerten)$/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Dein Lernplan' })).toBeVisible();
  await expect(page.getByText('Prüfungssimulation & Wiederholen')).toBeVisible();
  // Fokus-Thema startet eine Themen-Lernrunde.
  await page.getByRole('link', { name: /Jetzt lernen/ }).click();
  await expect(page).toHaveURL(/modus=thema/);
});

test('Rechen-Trainer: Antwort prüfen und Lösungsweg sehen', async ({ page }) => {
  await page.goto('/#/rechnen');
  await page.getByRole('button', { name: 'Hosts pro Netz' }).click();
  await page.getByLabel('Deine Antwort').fill('1');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Hostbits = 32/)).toBeVisible();
  await expect(page.getByText('0/1 richtig')).toBeVisible();
});

test('Heute lernen: Karte aufdecken und bewerten zählt XP', async ({ page }) => {
  await page.goto('/#/lernen');
  await page.getByRole('button', { name: /Aufdecken|Weiß ich/ }).first().click();
  await page.getByRole('button', { name: /Gewusst|Richtig/ }).first().click();
  const gami = await page.evaluate(() => JSON.parse(localStorage.getItem('ap2_lernapp_gamification_v1') || '{}'));
  expect(gami.xp).toBeGreaterThan(0);
});

test('Eigene Karten aus Text erzeugen und speichern', async ({ page }) => {
  await page.goto('/#/eigene-karten');
  await page
    .getByLabel('Text für Lernkarten')
    .fill('Subnetzmaske: Trennt Netz- und Hostanteil einer Adresse.\nWas macht ein Switch?\nLeitet Frames weiter.');
  await page.getByRole('button', { name: /Karten vorschlagen/ }).click();
  await page.getByLabel('Name des Stapels').fill('E2E');
  await page.getByRole('button', { name: '2 Karten speichern' }).click();
  await expect(page.getByText(/2 Karten · 0 fällig · 2 neu/)).toBeVisible();
});
