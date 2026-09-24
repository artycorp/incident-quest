# AGENTS.md — Incident Quest

Interactive investigations of real **load/performance incidents**. A reader walks the on-call engineer's path through a real postmortem, picking one of 4 options at each step. Episodes are published to a load-testing Telegram chat (RU) and LinkedIn (EN).

Site: plain static HTML served by GitHub Pages from `master`. Merging a PR publishes it. Base URL: `https://artycorp.github.io/incident-quest/`.

## Producing an episode

Each episode is one PR on branch `episode/NNN` containing exactly:

- `episodes/NNN.html` — the playable episode
- `episodes/NNN.post.md` — copy-paste texts for Telegram and LinkedIn
- `sources.md` — the used incident marked with `NNN`

Steps:

1. **Number.** `NNN` = highest number among `episodes/*.html` and open `episode/*` branches, plus 1, zero-padded to 3 digits.
2. **Pick.** Take the first `todo` incident in `sources.md`. Done when you have one incident whose root cause is load-shaped (see *Load-shaped*).
3. **Read the source.** Read the full original postmortem. Done when you can list its timeline, the symptoms engineers saw, the root cause, the mitigation, and every number you plan to use, each traceable to a sentence in the source.
4. **Write `episodes/NNN.html`** following *Episode format*. Done when every step on the spine is backed by the source and every text field has both `ru` and `en`.
5. **Write `episodes/NNN.post.md`** following *Post format*.
6. **Mark** the incident in `sources.md` as `NNN`.
7. **Check.** Open `episodes/NNN.html` via a local static server (`python3 -m http.server`) and play it to the end in both languages. Done when every option responds and the reveal shows the source link.
8. **Open the PR** titled `Episode NNN: <EN title>`. Leave it unmerged — the maintainer merges on publication day.

## Load-shaped

The chat is about load testing, so the root cause must be a capacity or performance mechanism: resource limits (threads, connections, file descriptors, memory), retry storms, thundering herd, cascading failure through a saturated dependency, queue build-up, GC or lock contention, hot keys/partitions, autoscaling lag. Mark config typos, expired certificates, and pure security incidents `skip` in `sources.md` with a short reason.

## Episode format

`episodes/NNN.html` is this template with the JSON filled in. The page markup stays identical across episodes; only the `<title>` and the JSON change.

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RU title</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <main id="app"></main>
  <script type="application/json" id="episode">
{
  "title": { "ru": "...", "en": "..." },
  "source": { "title": "AWS: Summary of the ... Event (2020)", "url": "https://..." },
  "intro": { "ru": "...", "en": "..." },
  "steps": [
    {
      "text": { "ru": "...", "en": "..." },
      "options": [
        { "text": { "ru": "...", "en": "..." }, "correct": true,  "result": { "ru": "...", "en": "..." } },
        { "text": { "ru": "...", "en": "..." }, "correct": false, "result": { "ru": "...", "en": "..." } },
        { "text": { "ru": "...", "en": "..." }, "correct": false, "result": { "ru": "...", "en": "..." } },
        { "text": { "ru": "...", "en": "..." }, "correct": false, "result": { "ru": "...", "en": "..." } }
      ]
    }
  ],
  "outro": { "ru": "...", "en": "..." }
}
  </script>
  <script src="../player.js"></script>
</body>
</html>
```

Rules:

- **Spine.** 3–5 steps following the real investigation: first signal → what to look at → hypothesis → root cause → mitigation. Each step has exactly 4 options, exactly one `"correct": true`. The player shuffles options, so list them in any order.
- **Facts.** Every fact on the spine (times, metrics, component names, numbers) comes from the source. Narrative wrapping (the pager going off at night, the on-call's thoughts) is welcome as long as it adds no facts.
- **Dead ends.** A wrong option's `result` is 1–2 sentences: a plausible consequence of that action, written as what *would* happen, and it ends by sending the reader back to the fork. Make wrong options tempting — they are what a competent engineer might try first.
- **Correct results** explain in 1–3 sentences why this was the right move and what it revealed, leading into the next step.
- **Intro** sets the scene in 2–4 sentences: the service, the time, the first symptom. The company may be named.
- **Outro** is "what really happened": the actual root cause, mitigation, and the lesson for load testing (what test or metric would have caught it). 1–3 paragraphs.
- **Language.** RU is the primary text, written naturally for Russian-speaking engineers, keeping technical terms in English (`p99`, `thread pool`, `retry storm`). EN is an equal-quality rewrite for LinkedIn, not a literal translation. Paragraphs are separated by a blank line (`\n\n`).
- **Step 1 doubles as the Telegram quiz poll**, so its `text.ru` fits in 300 characters and each option's `text.ru` fits in 100 characters.

## Post format

`episodes/NNN.post.md`:

```markdown
# Telegram (RU)

<teaser: 2–4 sentences with the hook from the intro, no spoilers>

<base URL>episodes/NNN.html?lang=ru

## Quiz poll

Question: <step 1 text.ru, ≤300 chars>
1. <option, ≤100 chars>
2. <option>
3. <option>
4. <option>
Correct: <1-4>
Explanation: <≤200 chars, shown after answering; no full spoiler of the root cause>

# LinkedIn (EN)

<post: hook, 1-paragraph setup, the step 1 question, invitation to play, 3–5 hashtags>

<base URL>episodes/NNN.html?lang=en
```

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

`index.html` discovers episodes by probing `episodes/001.html`, `002.html`, … until the first missing number, so episodes appear on the index only when numbering has no gaps.
