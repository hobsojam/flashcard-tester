const { test, expect } = require('@playwright/test');
const path = require('path');

const DECK  = path.join(__dirname, 'fixtures/deck.json');
const MULTI = path.join(__dirname, 'fixtures/multi.json');
const TIMED = path.join(__dirname, 'fixtures/timed.json');
const PASSMARK = path.join(__dirname, 'fixtures/passmark.json');

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

// ── Keyboard shortcuts ──────────────────────────────────────

test('space flips the flashcard', async ({ page }) => {
  await loadDeck(page, DECK);
  await expect(page.locator('#card')).not.toHaveClass(/flipped/);
  await page.keyboard.press(' ');
  await expect(page.locator('#card')).toHaveClass(/flipped/);
});

test('arrow keys navigate cards', async ({ page }) => {
  await loadDeck(page, DECK);
  await expect(page.locator('#counter')).toContainText('1 /');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#counter')).toContainText('2 /');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#counter')).toContainText('1 /');
});

// ── Question grid ───────────────────────────────────────────

test('question grid chip jumps to that question', async ({ page }) => {
  await loadDeck(page, MULTI);
  await page.locator('#btn-mc').click();
  await page.locator('.q-chip', { hasText: '1' }).click();
  await expect(page.locator('#counter')).toContainText('1 /');
});

// ── Timer and pass mark ──────────────────────────────────────
// PASSMARK/TIMED decks have 2 cards; MC mode shuffles card and choice
// order, so tests answer by looking up the correct/wrong choice text
// for whichever question is currently showing, rather than assuming order.

const QA_MAP = {
  'What is 2 + 2?': { correct: '4', wrong: '3' },
  'What is 3 + 3?': { correct: '6', wrong: '5' },
};

async function answerCurrent(page, wantCorrect) {
  const questionText = (await page.locator('#mc-question').textContent()).trim();
  const { correct, wrong } = QA_MAP[questionText];
  await page.getByRole('button', { name: wantCorrect ? correct : wrong, exact: true }).click();
}

test('timer expiring shows the summary as timed out', async ({ page }) => {
  await loadDeck(page, TIMED);
  await page.locator('#btn-mc').click();
  await expect(page.locator('#timer-display')).toBeVisible();
  await expect(page.locator('#summary')).toBeHidden();
  await expect(page.locator('#summary-heading')).toHaveText("Time's Up!", { timeout: 5000 });
});

test('pass mark shows Passed verdict when score meets it', async ({ page }) => {
  await loadDeck(page, PASSMARK);
  await page.locator('#btn-mc').click();
  await answerCurrent(page, true);
  await page.locator('#next-btn').click();
  await answerCurrent(page, true);
  await page.locator('#next-btn').click();
  await expect(page.locator('#summary')).toBeVisible();
  await expect(page.locator('#summary-verdict')).toHaveText('Passed');
});

test('pass mark shows Failed verdict when score misses it', async ({ page }) => {
  await loadDeck(page, PASSMARK);
  await page.locator('#btn-mc').click();
  await answerCurrent(page, false);
  await page.locator('#next-btn').click();
  await answerCurrent(page, false);
  await page.locator('#next-btn').click();
  await expect(page.locator('#summary')).toBeVisible();
  await expect(page.locator('#summary-verdict')).toHaveText('Failed');
});

// ── Retry ────────────────────────────────────────────────────

test('retry button restarts MC mode with a reset score', async ({ page }) => {
  await loadDeck(page, MULTI);
  await page.locator('#btn-mc').click();
  await page.getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: '4' }).click();
  await page.locator('#check-btn').click();
  await page.locator('#next-btn').click();
  await expect(page.locator('#summary')).toBeVisible();
  await page.locator('#retry-btn').click();
  await expect(page.locator('#summary')).toBeHidden();
  await expect(page.locator('#score-display')).toHaveText('Score: 0 / 0');
});
