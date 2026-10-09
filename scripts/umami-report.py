"""Episode report from Umami: who opened it, where readers went wrong, who finished.

Export the site's data in Umami (website settings → Data → Export), then:

    python3 scripts/umami-report.py 003 ~/Downloads/<id>.zip --since 2026-10-02
"""
import argparse
import csv
import io
import html
import json
import re
import tempfile
import urllib.parse
import webbrowser
import zipfile
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_BLOCK = re.compile(r'<script type="application/json" id="episode">\n(.*?)\n  </script>', re.S)


def value(row):
    v = row.get("numberValue")
    if v is not None:
        return int(float(v)) if float(v).is_integer() else float(v)
    v = row.get("stringValue")
    return {"true": True, "false": False}.get(v, v)


def load_zip(path):
    with zipfile.ZipFile(path) as z:
        rows = lambda name: csv.DictReader(io.TextIOWrapper(z.open(name), encoding="utf-8"))
        data = defaultdict(dict)
        for r in rows("event_data.csv"):
            num = None if r["number_value"] == "\\N" else r["number_value"]
            data[r["event_id"]][r["data_key"]] = value({"numberValue": num, "stringValue": r["string_value"]})
        return [{"id": r["event_id"], "sessionId": r["session_id"], "createdAt": r["created_at"].replace(" ", "T"),
                 "urlPath": r["url_path"], "urlQuery": r["url_query"], "eventName": r["event_name"] or None,
                 "data": data.get(r["event_id"], {})} for r in rows("website_event.csv")]


def aggregate(events, ep_id):
    """Pure: Umami events (with "data" on custom ones) -> numbers for one episode."""
    page = f"/episodes/{ep_id}.html"
    views = [e for e in events if not e.get("eventName") and (e.get("urlPath") or "").endswith(page)]
    mine = [e for e in events if e.get("eventName") and str(e.get("data", {}).get("episode")) == ep_id]
    by = defaultdict(list)
    for e in mine:
        by[e["eventName"]].append(e)
    r = {
        "views": len(views),
        "visitors": len({e["sessionId"] for e in views}),
        "days": Counter(e["createdAt"][:10] for e in views),
        "langs": Counter(re.search(r"lang=(\w+)", e.get("urlQuery") or "lang=?").group(1) for e in views),
        "sources": Counter(dict(urllib.parse.parse_qsl(e.get("urlQuery") or "")).get("utm_source", "без метки")
                           for e in views),
        "started": len({e["sessionId"] for e in by["option"]}),
        "finished": len({e["sessionId"] for e in by["finish"]}),
        "reached": defaultdict(set), "first": defaultdict(Counter), "picks": defaultdict(Counter),
        "checks": defaultdict(Counter), "hints": defaultdict(set), "mistakes": [],
    }
    for e in sorted(by["option"], key=lambda e: e["createdAt"]):
        d = e["data"]
        if e["sessionId"] not in r["reached"][d["step"]]:
            r["first"][d["step"]][d["option"]] += 1
        r["reached"][d["step"]].add(e["sessionId"])
        r["picks"][d["step"]][d["option"]] += 1
    for e in by["check"]:
        r["checks"][e["data"]["step"]][bool(e["data"]["correct"])] += 1
    for e in by["hint"]:
        r["hints"][e["data"]["step"]].add(e["sessionId"])
    r["mistakes"] = [e["data"].get("mistakes", 0) for e in by["finish"]]
    return r


CSS = """
:root { --bg:#12162B; --fg:#E4E6F0; --muted:#8C92B3; --line:#2C3254; --card:#191E38;
  --spine:#F5B53F; --dead:#FF7A7A; --right:#5ED8B0; --blue:#8FA8FF; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:400 15px/1.5 system-ui, sans-serif; }
main { max-width:56rem; margin:0 auto; padding:24px 16px 64px; }
h1 { font:800 28px/1.15 system-ui; margin:0 0 4px; } h2 { font:700 18px/1.3 system-ui; margin:32px 0 12px; }
.sub { color:var(--muted); margin:0 0 24px; }
.kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(10rem,1fr)); gap:12px; }
.kpi { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
.kpi b { display:block; font:800 30px/1.1 system-ui; color:var(--spine); } .kpi span { color:var(--muted); font-size:13px; }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin:12px 0; }
.row { display:grid; grid-template-columns:minmax(8rem,16rem) 1fr 4.5rem; gap:10px; align-items:center; margin:6px 0; }
.row .label { font-size:13px; overflow:hidden; text-overflow:ellipsis; }
.track { height:14px; background:#0f1326; border-radius:7px; overflow:hidden; }
.bar { height:100%; border-radius:7px; background:var(--blue); }
.bar.right { background:var(--right); } .bar.wrong { background:var(--dead); } .bar.spine { background:var(--spine); }
.num { text-align:right; font-variant-numeric:tabular-nums; color:var(--muted); font-size:13px; }
.meta { color:var(--muted); font-size:13px; margin:4px 0 10px; }
.days { display:flex; align-items:flex-end; gap:6px; height:140px; padding-top:8px; }
.day { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; font-size:11px; color:var(--muted); }
.day i { display:block; width:100%; max-width:36px; background:var(--spine); border-radius:4px 4px 0 0; min-height:2px; }
@media (max-width:560px) { .row { grid-template-columns:1fr 3.5rem; } .row .track { grid-column:1 / -1; grid-row:2; } }
"""


def bars(rows, total=None):
    total = total or max([n for _, n, _ in rows] + [1])
    out = []
    for label, n, cls in rows:
        pct = 100 * n / total if total else 0
        out.append(f'<div class="row"><div class="label" title="{html.escape(label)}">{html.escape(label)}</div>'
                   f'<div class="track"><div class="bar {cls}" style="width:{pct:.1f}%"></div></div>'
                   f'<div class="num">{n} · {pct:.0f}%</div></div>')
    return "".join(out)


def render(ep, ep_id, r, start, end):
    t = lambda v: v if isinstance(v, str) else v.get("ru") or v.get("en")
    steps = ep["steps"]
    pct = lambda a, b: f"{100 * a / b:.0f}%" if b else "—"
    avg = sum(r["mistakes"]) / len(r["mistakes"]) if r["mistakes"] else 0
    kpis = [(r["visitors"], "читателей открыли"), (r["started"], "начали расследование"),
            (r["finished"], "дошли до развязки"), (pct(r["finished"], r["started"]), "доходимость"),
            (f"{avg:.1f}", "ошибок в среднем у финишировавших")]
    funnel = [("Открыли выпуск", r["visitors"], "spine")]
    funnel += [(f"Шаг {n}", len(r["reached"][n]), "") for n in range(1, len(steps) + 1)]
    funnel += [("Развязка", r["finished"], "right")]
    parts = [f"<h1>#{ep_id} · {html.escape(t(ep['title']))}</h1>",
             f'<p class="sub">Umami, {start:%d.%m.%Y} – {end:%d.%m.%Y} · {r["views"]} просмотров · '
             + " · ".join(f"{html.escape(str(k))}: {v}" for k, v in (r["langs"] + r["sources"]).most_common()) + "</p>",
             '<div class="kpis">' + "".join(f'<div class="kpi"><b>{v}</b><span>{l}</span></div>' for v, l in kpis) + "</div>",
             "<h2>Воронка</h2>", f'<div class="card">{bars(funnel, r["visitors"] or None)}</div>']
    parts.append("<h2>Шаги: первый выбор читателей</h2>")
    for n, s in enumerate(steps, 1):
        first = r["first"][n]
        rows = [(t(o["text"]), first[j], "right" if o.get("correct") else "wrong")
                for j, o in enumerate(s["options"], 1)]
        right = sum(first[j] for j, o in enumerate(s["options"], 1) if o.get("correct"))
        chk = r["checks"][n]
        meta = [f"с первой попытки верно: {pct(right, sum(first.values()))}",
                f"подсказку открыли: {len(r['hints'][n])}"]
        if chk:
            meta.append(f"«Что видишь?» угадали: {pct(chk[True], chk[True] + chk[False])}")
        text = re.sub(r"\s*\(?\[([^\]]+)\]\([^)]*\)\)?", r"", t(s["text"]))
        parts.append(f'<div class="card"><b>Шаг {n}</b> <span class="meta">{html.escape(text[:140])}{"…" if len(text) > 140 else ""}</span>'
                     f'<p class="meta">{" · ".join(meta)}</p>{bars(rows, sum(first.values()) or None)}</div>')
    if r["days"]:
        top = max(r["days"].values())
        days = "".join(f'<div class="day"><span>{v}</span><i style="height:{100 * v / top:.0f}%"></i>{d[8:10]}.{d[5:7]}</div>'
                       for d, v in sorted(r["days"].items()))
        parts += ["<h2>Просмотры по дням</h2>", f'<div class="card"><div class="days">{days}</div></div>']
    return (f'<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>Выпуск {ep_id}: статистика</title>'
            f"<style>{CSS}</style></head><body><main>{''.join(parts)}</main></body></html>")


def demo():
    ev = lambda sid, name=None, **d: {"id": "x", "sessionId": sid, "createdAt": "2026-10-02T12:00:00Z",
                                      "urlPath": "/incident-quest/episodes/003.html", "urlQuery": "lang=ru&utm_source=telegram",
                                      "eventName": name, "data": {"episode": "003", **d}}
    r = aggregate([ev("a"), ev("b"), ev("a", "option", step=1, option=2, correct=False, attempt=1),
                   ev("a", "option", step=1, option=1, correct=True, attempt=2), ev("a", "check", step=1, correct=True),
                   ev("a", "finish", mistakes=1, hints=0), ev("b", "option", step=1, option=1, correct=True, attempt=1),
                   ev("a", "option", step=1, option=3, correct=False, attempt=1)], "003")
    assert (r["visitors"], r["started"], r["finished"], r["mistakes"]) == (2, 2, 1, [1])
    assert r["first"][1] == Counter({2: 1, 1: 1}) and r["checks"][1][True] == 1 and r["langs"]["ru"] == r["sources"]["telegram"] == 2


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("episode", help="номер выпуска, например 003")
    p.add_argument("zip", type=Path, help="архив экспорта данных сайта из Umami")
    p.add_argument("--since", help="YYYY-MM-DD, по умолчанию все данные архива")
    p.add_argument("--out", type=Path, help="куда сохранить HTML")
    p.add_argument("--demo", action="store_true", help="только самопроверка агрегатора")
    a = p.parse_args()
    if a.demo:
        demo()
        return print("ok")
    ep_id = a.episode.zfill(3)
    ep = json.loads(JSON_BLOCK.search((ROOT / "episodes" / f"{ep_id}.html").read_text()).group(1))
    events = [e for e in load_zip(a.zip) if e["createdAt"] >= (a.since or "")]
    start, end = (datetime.fromisoformat(f(e["createdAt"] for e in events)) for f in (min, max))
    out = a.out or Path(tempfile.gettempdir()) / f"umami-{ep_id}.html"
    out.write_text(render(ep, ep_id, aggregate(events, ep_id), start, end))
    print(out)
    webbrowser.open(out.as_uri())


if __name__ == "__main__":
    main()
