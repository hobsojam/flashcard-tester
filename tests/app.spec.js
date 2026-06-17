const { test, expect } = require('@playwright/test');
const path = require('path');

const DECK  = path.join(__dirname, 'fixtures/deck.json');
const MULTI = path.join(__dirname, 'fixtures/multi.json');

async function loadDeck(page, fixturePath) {
  await page.locator('#file-input').setInputFiles(fixturePath);
  await expect(page.locator('#app')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ── Loader ─────────────────────────────────────────────────

test('shows loader on startup', async ({ page }) => {
  await expect(page.locator('#loader')).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();
});

test('rejects invalid JSON', async ({ page }) => {
  await page.locator('#file-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not valid json'),
  });
  await expect(page.locator('#load-error')).not.toBeEmpty();
  await expect(page.locator('#app')).toBeHidden();
});

// ── Loading ────────────────────────────────────────────────

test('loads a deck and shows the app', async ({ page }) => {
  await loadDeck(page, DECK);
  await expect(page.locator('#loader')).toBeHidden();
  await expect(page.locator('#counter')).toContainText('/ 2');
});

test('shows deck metadata', async ({ page }) => {
  await loadDeck(page, DECK);
  await expect(page.locator('#deck-title')).toHaveText('Test Deck');
  await expect(page.locator('.difficulty-badge')).toHaveText('beginner');
});

test('reload button returns to loader', async ({ page }) => {
  await loadDeck(page, DECK);
  await page.locator('#reload-btn').click();
  await expect(page.locator('#loader')).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();
});

// ── Flashcard mode ─────────────────────────────────────────

test('flips card on click', async ({ page }) => {
  await loadDeck(page, DECK);
  await expect(page.locator('#card')).not.toHaveClass(/flipped/);
  await page.locator('#card').click();
  await expect(page.locator('#card')).toHaveClass(/flipped/);
});

test('reveal button flips card', async ({ page }) => {
  await loadDeck(page, DECK);
  await page.locator('#reveal-btn').click();
  await expect(page.locator('#card')).toHaveClass(/flipped/);
  await expect(page.locator('#reveal-btn')).toHaveText('Hide Answer');
});

test('next and prev navigate cards', async ({ page }) => {
  await loadDeck(page, DECK);
  await expect(page.locator('#prev-btn')).toBeDisabled();
  await page.locator('#next-btn').click();
  await expect(page.locator('#counter')).toContainText('2 /');
  await expect(page.locator('#next-btn')).toBeDisabled();
  await page.locator('#prev-btn').click();
  await expect(page.locator('#counter')).toContainText('1 /');
});

// ── Multiple choice mode ───────────────────────────────────
// deck.json has one card with choices, so MC mode always shows that card.

test('MC mode: correct answer shows Correct', async ({ page }) => {
  await loadDeck(page, DECK);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '4' }).click();
  await expect(page.locator('#mc-feedback')).toHaveText('Correct!');
  await expect(page.locator('#mc-feedback')).toHaveClass(/correct/);
});

test('MC mode: wrong answer shows Incorrect', async ({ page }) => {
  await loadDeck(page, DECK);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '3' }).click();
  await expect(page.locator('#mc-feedback')).toContainText('Incorrect');
  await expect(page.locator('#mc-feedback')).toHaveClass(/wrong/);
});

test('MC mode: score updates on answer', async ({ page }) => {
  await loadDeck(page, DECK);
  await page.locator('#btn-mc').click();
  await expect(page.locator('#score-display')).toHaveText('Score: 0 / 0');
  await page.getByRole('button', { name: '4' }).click();
  await expect(page.locator('#score-display')).toHaveText('Score: 1 / 1');
});

test('MC mode: shows explanation after answering', async ({ page }) => {
  await loadDeck(page, DECK);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '4' }).click();
  await expect(page.locator('#mc-explanation')).toBeVisible();
  await expect(page.locator('#mc-explanation-text')).toHaveText('Basic arithmetic.');
});

// ── Multi-select mode ──────────────────────────────────────
// multi.json has one card: choices ["2","3","4","5"], correct [0,2] = "2" and "4".

test('multi-select: shows hint and check button', async ({ page }) => {
  await loadDeck(page, MULTI);
  await page.locator('#btn-mc').click();
  await expect(page.locator('#mc-select-hint')).toBeVisible();
  await expect(page.locator('#check-btn')).toBeVisible();
});

test('multi-select: correct selection', async ({ page }) => {
  await loadDeck(page, MULTI);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: '4' }).click();
  await page.locator('#check-btn').click();
  await expect(page.locator('#mc-feedback')).toHaveText('Correct!');
});

test('multi-select: partial selection is wrong', async ({ page }) => {
  await loadDeck(page, MULTI);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '2' }).click();
  await page.locator('#check-btn').click();
  await expect(page.locator('#mc-feedback')).toContainText('Incorrect');
});

test('multi-select: wrong selection highlights correct answers', async ({ page }) => {
  await loadDeck(page, MULTI);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '3' }).click();
  await page.locator('#check-btn').click();
  await expect(page.getByRole('button', { name: '2' })).toHaveClass(/correct/);
  await expect(page.getByRole('button', { name: '4' })).toHaveClass(/correct/);
  await expect(page.getByRole('button', { name: '3' })).toHaveClass(/wrong/);
});
