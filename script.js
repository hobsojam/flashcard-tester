// State
let allCards = [];
let deckMeta = null;
let deck = [];
let currentIndex = 0;
let mode = 'flashcard';
let flipped = false;
let answered = false;
let score = { correct: 0, total: 0 };
let sessionStart = null;
let results = [];    // null | 'correct' | 'wrong' per card
let selections = []; // selected answer per card (string for single, number[] for multi)
let timerInterval = null;
let timeRemaining = 0;

// DOM
const loaderEl    = document.getElementById('loader');
const appEl       = document.getElementById('app');
const fileInput   = document.getElementById('file-input');
const loadError   = document.getElementById('load-error');
const fcView      = document.getElementById('flashcard-view');
const mcView      = document.getElementById('mc-view');
const cardEl      = document.getElementById('card');
const fcQuestion  = document.getElementById('fc-question');
const fcAnswer    = document.getElementById('fc-answer');
const mcQuestion  = document.getElementById('mc-question');
const choicesEl   = document.getElementById('choices');
const mcFeedback  = document.getElementById('mc-feedback');
const revealBtn   = document.getElementById('reveal-btn');
const prevBtn     = document.getElementById('prev-btn');
const nextBtn     = document.getElementById('next-btn');
const counter     = document.getElementById('counter');
const scoreArea   = document.getElementById('score-area');
const scoreDisplay = document.getElementById('score-display');
const btnFlashcard      = document.getElementById('btn-flashcard');
const btnMc             = document.getElementById('btn-mc');
const reloadBtn         = document.getElementById('reload-btn');
const checkBtn          = document.getElementById('check-btn');
const mcSelectHint      = document.getElementById('mc-select-hint');
const deckMetaEl        = document.getElementById('deck-meta');
const deckTitleEl       = document.getElementById('deck-title');
const deckDifficultyEl  = document.getElementById('deck-difficulty');
const deckDescriptionEl = document.getElementById('deck-description');
const fcExplanation       = document.getElementById('fc-explanation');
const fcExplanationText   = document.getElementById('fc-explanation-text');
const fcExplanationSource = document.getElementById('fc-explanation-source');
const fcExplanationLink   = document.getElementById('fc-explanation-link');
const mcExplanation       = document.getElementById('mc-explanation');
const mcExplanationText   = document.getElementById('mc-explanation-text');
const mcExplanationSource = document.getElementById('mc-explanation-source');
const mcExplanationLink   = document.getElementById('mc-explanation-link');
const cardAreaEl      = document.getElementById('card-area');
const navEl           = document.getElementById('nav');
const summaryEl       = document.getElementById('summary');
const summaryHeadingEl = document.getElementById('summary-heading');
const summaryScoreEl  = document.getElementById('summary-score');
const summaryVerdictEl = document.getElementById('summary-verdict');
const summaryTimeEl   = document.getElementById('summary-time');
const retryBtn        = document.getElementById('retry-btn');
const questionGridEl  = document.getElementById('question-grid');
const timerDisplayEl  = document.getElementById('timer-display');

// ── Constants ──────────────────────────────────────────

const MAX_FILE_BYTES  = 2 * 1024 * 1024; // 2 MB
const MAX_CARDS       = 1000;
const MAX_Q_LEN       = 1000;
const MAX_ANS_LEN     = 1000;
const MAX_EXP_LEN     = 3000;
const MAX_CHOICE_LEN  = 500;

// ── File loading ───────────────────────────────────────

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) loadFile(file);
});

loaderEl.addEventListener('dragover', e => {
  e.preventDefault();
  loaderEl.classList.add('drag-over');
});

loaderEl.addEventListener('dragleave', () => {
  loaderEl.classList.remove('drag-over');
});

loaderEl.addEventListener('drop', e => {
  e.preventDefault();
  loaderEl.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  loadError.textContent = '';

  if (file.size > MAX_FILE_BYTES) {
    loadError.textContent = `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`;
    return;
  }
  if (file.type && file.type !== 'application/json') {
    loadError.textContent = 'File must be a JSON file';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data.cards) || data.cards.length === 0) {
        throw new Error('No cards found — check your JSON has a "cards" array');
      }
      if (data.cards.length > MAX_CARDS) {
        throw new Error(`Too many cards (max ${MAX_CARDS})`);
      }
      data.cards.forEach((c, i) => {
        const n = i + 1;
        if (!c.question)                                   throw new Error(`Card ${n}: missing "question"`);
        if (c.answer === undefined || c.answer === null)   throw new Error(`Card ${n}: missing "answer"`);
        if (c.question.length > MAX_Q_LEN)                 throw new Error(`Card ${n}: question exceeds ${MAX_Q_LEN} characters`);
        if (typeof c.answer === 'string' && c.answer.length > MAX_ANS_LEN)
                                                           throw new Error(`Card ${n}: answer exceeds ${MAX_ANS_LEN} characters`);
        if (c.explanation && c.explanation.length > MAX_EXP_LEN)
                                                           throw new Error(`Card ${n}: explanation exceeds ${MAX_EXP_LEN} characters`);
        if (Array.isArray(c.choices)) {
          c.choices.forEach((ch, ci) => {
            if (typeof ch !== 'string')                    throw new Error(`Card ${n}, choice ${ci + 1}: must be a string`);
            if (ch.length > MAX_CHOICE_LEN)                throw new Error(`Card ${n}, choice ${ci + 1}: exceeds ${MAX_CHOICE_LEN} characters`);
          });
        }
      });
      allCards = data.cards;
      deckMeta = data.meta || null;
      startApp();
    } catch (err) {
      loadError.textContent = err.message;
    }
  };
  reader.readAsText(file);
}

function startApp() {
  loaderEl.hidden = true;
  appEl.hidden = false;

  if (deckMeta && (deckMeta.title || deckMeta.description)) {
    deckTitleEl.textContent = deckMeta.title || '';
    if (deckMeta.difficulty) {
      deckDifficultyEl.textContent = deckMeta.difficulty;
      deckDifficultyEl.className = `difficulty-badge ${deckMeta.difficulty}`;
      deckDifficultyEl.hidden = false;
    } else {
      deckDifficultyEl.hidden = true;
    }
    if (deckMeta.description) {
      deckDescriptionEl.textContent = deckMeta.description;
      deckDescriptionEl.hidden = false;
    } else {
      deckDescriptionEl.hidden = true;
    }
    deckMetaEl.hidden = false;
  } else {
    deckMetaEl.hidden = true;
  }

  const hasMC = allCards.some(c => Array.isArray(c.choices) && c.choices.length >= 2);
  btnMc.disabled = !hasMC;
  btnMc.title = hasMC ? '' : 'No cards with choices in this deck';

  setMode('flashcard');
}

reloadBtn.addEventListener('click', () => {
  clearTimer();
  appEl.hidden = true;
  loaderEl.hidden = false;
  fileInput.value = '';
  loadError.textContent = '';
  allCards = [];
  deckMeta = null;
  deckMetaEl.hidden = true;
});

// ── Mode ───────────────────────────────────────────────

btnFlashcard.addEventListener('click', () => setMode('flashcard'));
btnMc.addEventListener('click', () => setMode('mc'));

function setMode(newMode) {
  clearTimer();
  mode = newMode;
  btnFlashcard.classList.toggle('active', mode === 'flashcard');
  btnMc.classList.toggle('active', mode === 'mc');

  summaryEl.hidden = true;
  cardAreaEl.hidden = false;
  navEl.hidden = false;

  if (mode === 'flashcard') {
    deck = shuffle([...allCards]);
    fcView.hidden = false;
    mcView.hidden = true;
    scoreArea.hidden = true;
  } else {
    deck = shuffle(allCards.filter(c => Array.isArray(c.choices) && c.choices.length >= 2));
    fcView.hidden = true;
    mcView.hidden = false;
    scoreArea.hidden = false;
    score = { correct: 0, total: 0 };
    results = new Array(deck.length).fill(null);
    selections = new Array(deck.length).fill(null);
    updateScore();
    sessionStart = Date.now();
    if (deckMeta && deckMeta.timeLimitSeconds) startTimer(deckMeta.timeLimitSeconds);
  }

  currentIndex = 0;
  render();
}

// ── Navigation ─────────────────────────────────────────

prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));

function navigate(dir) {
  if (dir > 0 && mode === 'mc' && currentIndex === deck.length - 1 && answered) {
    showSummary();
    return;
  }
  const next = currentIndex + dir;
  if (next < 0 || next >= deck.length) return;
  currentIndex = next;
  render();
}

// ── Render ─────────────────────────────────────────────

function render() {
  const card = deck[currentIndex];
  counter.textContent = `${currentIndex + 1} / ${deck.length}`;
  prevBtn.disabled = currentIndex === 0;

  if (mode === 'flashcard') {
    renderFlashcard(card);
  } else {
    renderMC(card);
    renderQuestionGrid();
  }

  updateNextBtn();
}

function updateNextBtn() {
  const isLast = currentIndex === deck.length - 1;
  const canFinish = mode === 'mc' && isLast && answered;
  nextBtn.disabled = isLast && !canFinish;
  nextBtn.textContent = canFinish ? 'View Results' : 'Next →';
}

function renderFlashcard(card) {
  flipped = false;
  cardEl.classList.remove('flipped');
  fcQuestion.textContent = card.question;
  fcAnswer.textContent = answerText(card);
  revealBtn.textContent = 'Reveal Answer';
  fcExplanation.hidden = true;
}

function renderMC(card) {
  const wasAnswered = results[currentIndex] !== null;
  answered = wasAnswered;
  mcQuestion.textContent = card.question;
  mcFeedback.textContent = '';
  mcFeedback.className = '';
  mcExplanation.hidden = true;
  choicesEl.innerHTML = '';

  const isMulti = Array.isArray(card.answer);
  mcSelectHint.hidden = !isMulti;
  checkBtn.hidden = !isMulti;

  if (isMulti) {
    card.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice;
      btn.dataset.index = i;
      btn.addEventListener('click', () => {
        if (answered) return;
        btn.classList.toggle('selected');
      });
      choicesEl.appendChild(btn);
    });
  } else {
    const correct = answerText(card);
    shuffle([...card.choices]).forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice;
      btn.addEventListener('click', () => selectChoice(choice, correct));
      choicesEl.appendChild(btn);
    });
  }

  if (wasAnswered) applyAnsweredState(card, isMulti);
}

function applyAnsweredState(card, isMulti) {
  const sel = selections[currentIndex];
  const isCorrect = results[currentIndex] === 'correct';

  if (isMulti) {
    const correctSet = new Set(card.answer);
    const selectedSet = new Set(sel);
    choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
      btn.disabled = true;
      const idx = parseInt(btn.dataset.index);
      if (correctSet.has(idx))   btn.classList.add('correct');
      else if (selectedSet.has(idx)) btn.classList.add('wrong');
    });
    checkBtn.hidden = true;
    mcFeedback.textContent = isCorrect ? 'Correct!' : 'Incorrect — correct answers are highlighted';
  } else {
    const correct = answerText(card);
    choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent === correct) btn.classList.add('correct');
      if (btn.textContent === sel && sel !== correct) btn.classList.add('wrong');
    });
    mcFeedback.textContent = isCorrect ? 'Correct!' : `Incorrect — the answer is: ${correct}`;
  }

  mcFeedback.className = isCorrect ? 'correct' : 'wrong';
  showExplanation(card, mcExplanation, mcExplanationText, mcExplanationSource, mcExplanationLink);
}

// ── Flashcard interactions ─────────────────────────────

revealBtn.addEventListener('click', flipCard);
cardEl.addEventListener('click', flipCard);

function flipCard() {
  flipped = !flipped;
  cardEl.classList.toggle('flipped', flipped);
  revealBtn.textContent = flipped ? 'Hide Answer' : 'Reveal Answer';
  if (flipped) {
    showExplanation(deck[currentIndex], fcExplanation, fcExplanationText, fcExplanationSource, fcExplanationLink);
  } else {
    fcExplanation.hidden = true;
  }
}

// ── Multiple choice interactions ───────────────────────

function selectChoice(selected, correct) {
  if (answered) return;
  answered = true;
  score.total++;

  const isCorrect = selected === correct;
  if (isCorrect) score.correct++;
  results[currentIndex] = isCorrect ? 'correct' : 'wrong';
  selections[currentIndex] = selected;
  updateScore();

  choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add('correct');
    if (btn.textContent === selected && !isCorrect) btn.classList.add('wrong');
  });

  mcFeedback.textContent = isCorrect ? 'Correct!' : `Incorrect — the answer is: ${correct}`;
  mcFeedback.className = isCorrect ? 'correct' : 'wrong';
  showExplanation(deck[currentIndex], mcExplanation, mcExplanationText, mcExplanationSource, mcExplanationLink);
  renderQuestionGrid();
  updateNextBtn();
}

checkBtn.addEventListener('click', () => {
  if (answered) return;
  const selected = [...choicesEl.querySelectorAll('.choice-btn.selected')]
    .map(btn => parseInt(btn.dataset.index));
  if (selected.length === 0) return;
  submitMultiSelect(deck[currentIndex], selected);
});

function submitMultiSelect(card, selectedIndices) {
  answered = true;
  score.total++;

  const correctSet  = new Set(card.answer);
  const selectedSet = new Set(selectedIndices);
  const isCorrect   = card.answer.length === selectedIndices.length &&
                      card.answer.every(i => selectedSet.has(i));

  if (isCorrect) score.correct++;
  results[currentIndex] = isCorrect ? 'correct' : 'wrong';
  selections[currentIndex] = selectedIndices;
  updateScore();

  choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    const idx = parseInt(btn.dataset.index);
    if (correctSet.has(idx))                      btn.classList.add('correct');
    else if (selectedSet.has(idx))                btn.classList.add('wrong');
  });

  checkBtn.hidden = true;
  mcFeedback.textContent = isCorrect ? 'Correct!' : 'Incorrect — correct answers are highlighted';
  mcFeedback.className   = isCorrect ? 'correct'  : 'wrong';
  showExplanation(card, mcExplanation, mcExplanationText, mcExplanationSource, mcExplanationLink);
  renderQuestionGrid();
  updateNextBtn();
}

function updateScore() {
  scoreDisplay.textContent = `Score: ${score.correct} / ${score.total}`;
}

function renderQuestionGrid() {
  questionGridEl.innerHTML = '';
  deck.forEach((_, i) => {
    const chip = document.createElement('button');
    chip.className = 'q-chip';
    chip.textContent = i + 1;
    const state = results[i] ?? 'unanswered';
    chip.classList.add(state);
    if (i === currentIndex) chip.classList.add('current');
    chip.addEventListener('click', () => {
      currentIndex = i;
      render();
    });
    questionGridEl.appendChild(chip);
  });
}

// ── Session timer ──────────────────────────────────────

function startTimer(seconds) {
  timeRemaining = seconds;
  timerDisplayEl.hidden = false;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) timeExpired();
  }, 1000);
}

function clearTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerDisplayEl.hidden = true;
  timerDisplayEl.classList.remove('timer-low');
}

function updateTimerDisplay() {
  timerDisplayEl.textContent = `Time: ${formatTime(timeRemaining * 1000)}`;
  timerDisplayEl.classList.toggle('timer-low', timeRemaining <= 60);
}

function timeExpired() {
  clearTimer();
  score.total = deck.length;
  showSummary(true);
}

// ── Keyboard shortcuts ─────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
  // Space flips in flashcard mode, but not when a choice button is focused
  if (e.key === ' ' && mode === 'flashcard' && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    flipCard();
  }
});

// ── Utilities ──────────────────────────────────────────

function isSafeUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

function showExplanation(card, containerEl, textEl, sourceEl, linkEl) {
  if (!card.explanation && !card.link) return;
  textEl.textContent = card.explanation || '';
  textEl.hidden = !card.explanation;
  if (card.link && isSafeUrl(card.link)) {
    linkEl.href = card.link;
    linkEl.textContent = new URL(card.link).hostname + ' ↗';
    sourceEl.hidden = false;
  } else {
    sourceEl.hidden = true;
  }
  containerEl.hidden = false;
}

function answerText(card) {
  if (Array.isArray(card.answer)) return card.answer.map(i => card.choices[i]).join(', ');
  if (typeof card.answer === 'number') return card.choices[card.answer];
  return card.answer;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── Summary ────────────────────────────────────────────

function showSummary(timedOut = false) {
  clearTimer();
  summaryHeadingEl.textContent = timedOut ? "Time's Up!" : 'Session Complete';
  const pct = score.total > 0 ? Math.round(score.correct / score.total * 100) : 0;
  summaryScoreEl.textContent = `${score.correct} / ${score.total} (${pct}%)`;
  summaryTimeEl.textContent = formatTime(Date.now() - sessionStart);

  const passMark = deckMeta && deckMeta.passMark != null ? deckMeta.passMark : null;
  if (passMark === null) {
    summaryVerdictEl.hidden = true;
  } else {
    const passed = pct >= passMark;
    summaryVerdictEl.textContent = passed ? 'Passed' : 'Failed';
    summaryVerdictEl.className = `summary-verdict ${passed ? 'pass' : 'fail'}`;
    summaryVerdictEl.hidden = false;
  }

  cardAreaEl.hidden = true;
  navEl.hidden = true;
  scoreArea.hidden = true;
  summaryEl.hidden = false;
}

retryBtn.addEventListener('click', () => setMode('mc'));
