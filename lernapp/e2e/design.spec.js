import { test, expect } from '@playwright/test';

// Apple-artiges „Mehr“-Fenster: ziehbar, mit Schwung, unterbrechbar; Escape und
// „weniger Bewegung“ schließen ohne Animation. Das Ziehen gibt es nur mobil.

async function oeffne(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mehr' }).last().click();
  const dialog = page.getByRole('dialog', { name: 'Alle Bereiche' });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(650); // Einblend-Animation (0,44 s) abwarten, sonst stimmt die Griff-Position nicht
  return dialog;
}

test('Escape schließt das Fenster', async ({ page }) => {
  const dialog = await oeffne(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden({ timeout: 3000 });
});

test('Schließen-Knopf schließt das Fenster', async ({ page }) => {
  const dialog = await oeffne(page);
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(dialog).toBeHidden({ timeout: 3000 });
});

test('Weniger Bewegung: schließt sofort', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const dialog = await oeffne(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden({ timeout: 500 });
});

test('Schneller Wisch nach unten schließt (Schwung zählt)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Ziehen gibt es nur im Bottom-Sheet (mobil)');
  const dialog = await oeffne(page);
  const griff = dialog.locator('[style*="touch-action"]').first();
  const box = await griff.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 4; i += 1) {
    await page.mouse.move(x, y + i * 40);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect(dialog).toBeHidden({ timeout: 3000 });
});

test('Kurzes langsames Ziehen federt zurück, das Fenster bleibt offen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Ziehen gibt es nur im Bottom-Sheet (mobil)');
  const dialog = await oeffne(page);
  const panel = dialog.locator('.sheet-panel');
  const griff = dialog.locator('[style*="touch-action"]').first();
  const box = await griff.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 30, { steps: 3 });
  await page.waitForTimeout(250); // Finger ruht: kein Schwung
  await expect(panel).toHaveAttribute('style', /translate3d/); // folgt dem Finger 1:1
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await expect(async () => {
    const stil = (await panel.getAttribute('style')) || '';
    expect(stil).not.toMatch(/translate3d\(0px, (?!0px)/);
  }).toPass({ timeout: 3000 });
});
