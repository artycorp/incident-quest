import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "episodes"
LINK = re.compile(r"\[([^\]]+)\]\(([^)]*)\)")
OK_TARGET = re.compile(r"chart:[\w-]+(?:@[\d:.]+)?$|https://[^)\s]+$|[\w.-]+\.html$")
JSON_BLOCK = re.compile(r'(<script type="application/json" id="episode">\n)(.*?)(\n  </script>)', re.S)

errors, warnings = [], []


def minutes(v):
    if isinstance(v, str):
        h, m = v.split(":")
        return int(h) * 60 + int(m)
    return v


def text(ep_id, where, v, required=True):
    if v is None:
        if required:
            errors.append(f"{ep_id} {where}: missing")
        return
    if isinstance(v, str):
        return
    for lang in ("ru", "en"):
        if not isinstance(v, dict) or not str(v.get(lang, "")).strip():
            errors.append(f"{ep_id} {where}: missing {lang}")
            continue
        for label, target in LINK.findall(v[lang]):
            if not OK_TARGET.match(target):
                errors.append(f"{ep_id} {where}.{lang}: unsupported link target {target!r}")
            elif target.startswith("chart:"):
                chart_ref(ep_id, f"{where}.{lang}", target[6:])
            elif target.endswith(".html") and not (EPISODES / target).exists():
                errors.append(f"{ep_id} {where}.{lang}: {target} does not exist")


charts = {}


def chart_ref(ep_id, where, ref):
    cid, _, moment = ref.partition("@")
    c = charts.get(cid)
    if c is None:
        errors.append(f"{ep_id} {where}: unknown chart {cid!r}")
    elif moment and moment not in [str(x) for x in c.get("x", [])]:
        errors.append(f"{ep_id} {where}: moment {moment} is not in chart {cid!r} x")


def check_chart(ep_id, cid, c):
    where = f"charts.{cid}"
    text(ep_id, f"{where}.title", c.get("title"))
    text(ep_id, f"{where}.note", c.get("note"), required=c.get("illustrative", False))
    text(ep_id, f"{where}.unit", c.get("unit"), required=False)
    text(ep_id, f"{where}.xLabel", c.get("xLabel"), required=False)
    xs = c.get("x", [])
    series = c.get("series", [])
    if not 1 <= len(series) <= 3:
        errors.append(f"{ep_id} {where}: {len(series)} series, expected 1-3")
    if c.get("interpolation", "linear") not in ("step", "linear"):
        errors.append(f"{ep_id} {where}: interpolation must be \"step\" or \"linear\"")
    for i, s in enumerate(series):
        text(ep_id, f"{where}.series[{i}].name", s.get("name"))
        if len(s.get("values", [])) != len(xs):
            errors.append(f"{ep_id} {where}.series[{i}]: {len(s.get('values', []))} values for {len(xs)} x")
        if "threshold" in s and not isinstance(s["threshold"], bool):
            errors.append(f"{ep_id} {where}.series[{i}]: threshold must be true/false")
    for i, m in enumerate(c.get("marks", [])):
        text(ep_id, f"{where}.marks[{i}].label", m.get("label"))
    if "interpolation" in c or len(xs) < 2:
        return
    span = minutes(xs[-1]) - minutes(xs[0])
    span += 1440 if span < 0 else 0
    for s in series:
        vs = s.get("values", [])
        top = max([v for v in vs if v is not None] + [c.get("yMax", 0)])
        for a, b, xa, xb in zip(vs, vs[1:], xs, xs[1:]):
            gap = (minutes(xb) - minutes(xa)) % 1440 if isinstance(xa, str) else xb - xa
            if None not in (a, b) and top and abs(b - a) > 0.5 * top and span and gap > 0.05 * span:
                warnings.append(
                    f"{ep_id} {where}: {t_en(s['name'])} jumps {a}->{b} over {xa}-{xb}; "
                    f"set \"interpolation\": \"step\" for a sudden change, "
                    f"or \"linear\" if it really is gradual"
                )


def t_en(v):
    return v if isinstance(v, str) else v.get("en", "")


def check_episode(path):
    ep_id = path.stem
    html = path.read_text()
    m = JSON_BLOCK.search(html)
    if not m:
        errors.append(f"{ep_id}: no <script id=\"episode\"> JSON block")
        return
    try:
        ep = json.loads(m.group(2))
    except json.JSONDecodeError as e:
        errors.append(f"{ep_id}: invalid JSON: {e}")
        return
    if json.dumps(ep, ensure_ascii=False, indent=2) != m.group(2):
        errors.append(f"{ep_id}: JSON is not formatted as json.dumps(indent=2, ensure_ascii=False)")
    for suffix in (".post.md", ".arch.ru.html", ".arch.en.html"):
        if not (EPISODES / f"{ep_id}{suffix}").exists():
            errors.append(f"{ep_id}: missing {ep_id}{suffix}")

    charts.clear()
    charts.update(ep.get("charts", {}))
    for key in ("title", "intro", "outro"):
        text(ep_id, key, ep.get(key))
    src = ep.get("source", {})
    if not src.get("title") or not str(src.get("url", "")).startswith("https://"):
        errors.append(f"{ep_id} source: needs title and https url")
    for cid, c in charts.items():
        check_chart(ep_id, cid, c)

    steps = ep.get("steps", [])
    if not 3 <= len(steps) <= 5:
        errors.append(f"{ep_id}: {len(steps)} steps, expected 3-5")
    for n, s in enumerate(steps, 1):
        where = f"steps[{n}]"
        text(ep_id, f"{where}.text", s.get("text"))
        text(ep_id, f"{where}.hint", s.get("hint"), required=False)
        if s.get("chart"):
            chart_ref(ep_id, f"{where}.chart", s["chart"])
        opts = s.get("options", [])
        allowed = range(2, 5) if s.get("chart") else [4]
        if len(opts) not in allowed:
            errors.append(f"{ep_id} {where}: {len(opts)} options, expected {list(allowed)}")
        if sum(bool(o.get("correct")) for o in opts) != 1:
            errors.append(f"{ep_id} {where}: exactly one option must be correct")
        for i, o in enumerate(opts, 1):
            ow = f"{where}.options[{i}]"
            text(ep_id, f"{ow}.text", o.get("text"))
            text(ep_id, f"{ow}.result", o.get("result"))
            if not o.get("chart"):
                errors.append(f"{ep_id} {ow}: missing chart")
                continue
            chart_ref(ep_id, f"{ow}.chart", o["chart"])
            if not o.get("correct"):
                if not isinstance(o.get("degraded"), bool):
                    errors.append(f"{ep_id} {ow}: wrong option needs \"degraded\": true/false")
                text(ep_id, f"{ow}.miss", o.get("miss"))
                c = charts.get(o["chart"].partition("@")[0], {})
                if not c.get("illustrative"):
                    errors.append(f"{ep_id} {ow}: wrong-option chart must be illustrative")
        if n == 1:
            if s.get("chart") or len(opts) != 4:
                errors.append(f"{ep_id} {where}: the quiz step has no chart and 4 options")
            if len(s.get("text", {}).get("ru", "")) > 300:
                errors.append(f"{ep_id} {where}.text.ru: over 300 chars (Telegram poll)")
            for i, o in enumerate(opts, 1):
                if len(o.get("text", {}).get("ru", "")) > 100:
                    errors.append(f"{ep_id} {where}.options[{i}].text.ru: over 100 chars (Telegram poll)")


def main():
    paths = sorted(EPISODES.glob("[0-9][0-9][0-9].html"))
    for n, path in enumerate(paths, 1):
        if path.stem != f"{n:03}":
            errors.append(f"numbering gap: expected {n:03}.html, found {path.name}")
            break
    for path in paths:
        check_episode(path)
    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"{len(paths)} episodes, {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
