# Coding standards

Judgement rules for review. `scripts/check-episodes.py` covers the mechanical ones; apply every rule below to every diff it touches.

## Episodes

- **Spoilers.** Everything visible before the reveal shows only what the on-call knows at that moment: step text, results, chart titles, series names, marks, legend values, and anything a chart page renders (any chart page opens mid-game from a panel title). The source title and link appear only in the reveal; `note` only on uncut chart pages, so it explains the chart without naming the root cause.
- **Hints.** A hint points where to look using facts already on the page, and leaves the conclusion to the reader. Read it next to the correct option: if the hint alone picks that option, rewrite it.
- **Chart realism.** Each series moves the way the real metric would: cliffs for state flips, sharp edges at alarms, gradual lines for rollouts and recoveries. Illustrative charts agree with each other and with every sourced number (threads track the fleet size, errors track the servers that fail).
- **Facts.** Every time, number and component name on the spine traces to a sentence in the source; narrative wrapping adds no new facts.

## player.js

- **Reuse first.** Look for an existing helper in `player.js` (`t`, `el`, `paras`, `epId`, `fmt`, `track`) before adding one; one regex per concept.
- **Panel colours** come from CSS variables on `.panel`, read through `getComputedStyle(box)` in `drawChart`. A chart drawn outside `.panel` silently falls back to the site palette, so keep every chart inside `panel()`.
- **Shared markup.** Episode pages stay identical to the template in `docs/episode-format.md`; behaviour for every episode goes into `player.js` and `style.css`.
