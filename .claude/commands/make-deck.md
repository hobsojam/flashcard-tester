Generate a flashcard deck as a JSON file for the Flashcard Tester app.

The user will provide either a topic (e.g. "TCP/IP networking") or raw study material to turn into cards.

Input: $ARGUMENTS

---

## Your job

1. Generate 10–20 multiple-choice questions unless the user specifies a number.
2. Output a single JSON object — nothing else, no explanation, no markdown fences.
3. The JSON must be valid and match the schema below exactly.

## Schema

```
{
  "meta": {
    "title": "<deck title>",
    "description": "<one sentence describing the deck>",
    "difficulty": "<beginner | intermediate | advanced>",
    "passMark": <integer 0–100, percentage needed to pass — use 70 for most topics, 80 for professional/exam-level>,
    "timeLimitSeconds": <integer — omit this field unless the user asks for a time limit>
  },
  "cards": [
    {
      "question": "<clear, unambiguous question>",
      "answer": <index of correct choice, 0-based integer>,
      "choices": [
        "<choice 0>",
        "<choice 1>",
        "<choice 2>",
        "<choice 3>"
      ],
      "explanation": "<one or two sentences explaining why the answer is correct — always include this>"
    }
  ]
}
```

## Rules

- Always 4 choices per card.
- `answer` must be an integer index (0–3) matching the correct entry in `choices`.
- Shuffle the correct answer's position — don't always put it in the same slot.
- Distractors should be plausible, not obviously wrong. Good distractors are the most common misconceptions about the topic.
- `explanation` is required on every card. Explain the correct answer, not just restate it.
- Questions should test understanding, not just recall. Prefer "which of these is true", scenario-based, or "what happens when" phrasing over pure definition questions.
- Do not include cards without choices (flashcard-only format is not useful here).
- Output raw JSON only. No markdown, no commentary before or after.
