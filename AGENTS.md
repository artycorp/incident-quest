# AGENTS.md — Incident Quest

Interactive investigations of real **load/performance incidents**. A reader walks the on-call engineer's path through a real postmortem, picking one of 4 options at each step. Episodes are published to a load-testing Telegram chat (RU) and LinkedIn (EN).

Site: plain static HTML served by GitHub Pages from `master`. Merging a PR publishes it. Base URL: `https://artycorp.github.io/incident-quest/`.

- **Episode JSON, charts, hints, service diagram, post and PR body**: `docs/episode-format.md`. Read it before writing or reviewing an episode.
- **Review rules** (spoilers, hints, chart realism, `player.js`): `CODING_STANDARDS.md`.

## Producing an episode

Each episode is one PR on branch `episode/NNN` containing exactly:

- `episodes/NNN.html` — the playable episode
- `episodes/NNN.post.md` — copy-paste texts for Telegram and LinkedIn
- `episodes/NNN.arch.ru.html`, `episodes/NNN.arch.en.html` — the service diagram
- `sources.md` — the used incident marked with `NNN`

Steps:

1. **Number.** `NNN` = highest number among `episodes/*.html` and open `episode/*` branches, plus 1, zero-padded to 3 digits.
2. **Pick.** Take the first `todo` incident in `sources.md`. Done when you have one incident whose root cause is load-shaped (see *Load-shaped*). Prefer simple ones: a single mechanism a reader can guess from the charts, 1–3 components, no chain of several independent failures. When adding incidents, keep the table ordered simplest first.
3. **Read the source.** Read the full original postmortem. Done when you can list its timeline, the symptoms engineers saw, the root cause, the mitigation, and every number you plan to use, each traceable to a sentence in the source.
4. **Write `episodes/NNN.html`** following *Episode format* and *Charts*. Done when every step on the spine is backed by the source and `python3 scripts/check-episodes.py` reports 0 errors and 0 warnings.
5. **Draw the service diagram** following *Service diagram*.
6. **Write `episodes/NNN.post.md`** following *Post format*.
7. **Mark** the incident in `sources.md` as `NNN`.
8. **Check.** Run `python3 serve.py` and play `http://localhost:8000/episodes/NNN.html` to the end in both languages. Done when every option responds, every chart link opens a drawn chart, every hint button shows its hint (and turns `threshold` series red on that step's charts), and the reveal shows the source link.
9. **Open the PR** titled `Episode NNN: <EN title>`, with the body from *PR body*. Leave it unmerged — the maintainer merges on publication day.

## Load-shaped

The chat is about load testing, so the root cause must be a capacity or performance mechanism: resource limits (threads, connections, file descriptors, memory), retry storms, thundering herd, cascading failure through a saturated dependency, queue build-up, GC or lock contention, hot keys/partitions, autoscaling lag. Mark config typos, expired certificates, and pure security incidents `skip` in `sources.md` with a short reason.

## Checks and preview

- `python3 scripts/check-episodes.py` validates every episode; the pre-commit hook and CI run it. Enable the hook once per clone: `git config core.hooksPath .githooks`.
- `python3 serve.py` serves the site on `http://localhost:8000/` with caching off, so the browser always shows the current files.
