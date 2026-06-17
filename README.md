# Flashcard Tester

A lightweight client-side learning tool. No install, no server, no account — open `index.html` in a browser and go.

## Getting Started

1. Open `index.html` in Chrome, Edge, or Firefox
2. Click **Load Cards** (or drag and drop a `.json` file)
3. Choose a mode and start studying

## Modes

### Flashcard
Click the card (or press **Space**) to flip and reveal the answer. Use arrow keys or Prev / Next to navigate.

### Multiple Choice
Choose from up to four options. Feedback is immediate. Your score is tracked for the session. When you reach the last card a **View Results** summary shows your score, time taken, and a Passed / Failed verdict if the deck defines a `passMark`.

### Multi-Select
Questions with more than one correct answer show a **Select all that apply** prompt. Toggle your choices then click **Check Answer**.

## Card File Format

Cards live in a `.json` file you load locally. The file is never uploaded anywhere.

```json
{
  "meta": {
    "title": "My Deck",
    "description": "What this deck covers.",
    "difficulty": "beginner",
    "tags": ["topic", "subtopic"]
  },
  "cards": [
    {
      "question": "What is the capital of France?",
      "answer": 2,
      "explanation": "Paris has been the capital since 987 AD.",
      "link": "https://en.wikipedia.org/wiki/Paris",
      "choices": ["London", "Berlin", "Paris", "Madrid"]
    },
    {
      "question": "Which are primary colours? (Select all that apply)",
      "answer": [0, 2, 3],
      "explanation": "Red, yellow, and blue are the primary colours in the RYB model.",
      "choices": ["Red", "Green", "Yellow", "Blue"]
    },
    {
      "question": "Who wrote Hamlet?",
      "answer": "William Shakespeare",
      "explanation": "Written around 1600–1601, Hamlet is one of Shakespeare's most celebrated tragedies."
    }
  ]
}
```

### Fields

#### `meta` (optional)

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Displayed in the app header |
| `description` | string | Subtitle shown below the title |
| `difficulty` | string | `beginner`, `intermediate`, or `advanced` — shown as a colour-coded badge |
| `tags` | string[] | For your own organisation; not displayed in the app |
| `passMark` | integer (1–100) | Minimum % score to pass. When set, the end-of-session summary shows Passed or Failed |

#### `cards` (required)

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `question` | Yes | string | The prompt shown to the user |
| `answer` | Yes | integer \| integer[] \| string | See below |
| `explanation` | No | string | Shown after answering — explains why the answer is correct |
| `link` | No | string (URL) | Source or further reading; shown as a clickable hostname. Must be `http` or `https` |
| `choices` | No | string[] | 2–4 options. Required for multiple-choice and multi-select modes |

### Answer field

| Card type | `answer` value | Example |
|-----------|---------------|---------|
| Multiple choice | 0-based index of the correct choice | `2` (third choice) |
| Multi-select | Array of all correct indices | `[0, 2, 3]` |
| Flashcard only (no `choices`) | The answer as plain text | `"William Shakespeare"` |

### Validation limits

The app enforces these limits on load:

| Field | Limit |
|-------|-------|
| File size | 2 MB |
| Cards per deck | 1,000 |
| Question length | 1,000 characters |
| Answer length (text) | 1,000 characters |
| Explanation length | 3,000 characters |
| Choice length | 500 characters |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next card |
| `Space` | Flip card (flashcard mode) |

## Tips

- Cards without `choices` are flashcard-only; cards with `choices` work in all three modes
- Choices are shuffled on each session in single-answer mode; order is preserved in multi-select
- Progress resets on reload — there is no saved state
- A JSON Schema for the card format is provided in `card-schema.json` — editors like VS Code will give you autocomplete and validation if you add `"$schema": "./card-schema.json"` to your deck file

---

## Licences

### Software

This app is released under the **MIT Licence** — you are free to use, copy, modify, and distribute it, including for commercial purposes, with no warranty of any kind. See `LICENSE` for the full text.

### Card decks

Card files are creative works, separate from the software, and carry their own licence.

If you publish a card deck, consider licensing it under **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** — free to share and adapt for any purpose, provided you credit the author. Declare the licence in the `meta.license` field of your deck file:

```json
{
  "meta": {
    "title": "My Deck",
    "license": "CC BY 4.0"
  },
  "cards": []
}
```

Common choices:

| Licence | Allows commercial use | Requires credit | Derivatives must stay open |
|---------|----------------------|-----------------|---------------------------|
| CC0-1.0 | Yes | No | No — public domain |
| CC BY 4.0 | Yes | Yes | No |
| CC BY-SA 4.0 | Yes | Yes | Yes |
| CC BY-NC 4.0 | No | Yes | No |

---

## Hosting & Content

**Architecture:** This is a fully client-side app. Card files are loaded directly in the user's browser via the File API and are never transmitted to any server, stored remotely, or seen by anyone other than the person who loaded the file. There is no upload mechanism and no shared content store.

**If you fork or host this app:** you inherit responsibility for any features you add. In particular:

- If you add a deck-sharing or upload feature, you create a content moderation problem that does not exist in the original codebase. You are responsible for moderating any content your users can share with each other.
- The original project provides no such feature and accepts no liability for modifications made in derivative works.

This notice exists to make the architectural boundary explicit, not as a legal instrument.
