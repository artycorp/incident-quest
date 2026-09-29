(() => {
  const UI = {
    ru: { step: 'Шаг', next: 'Дальше', reveal: 'Что было на самом деле', source: 'Источник',
          mistakes: n => n ? `Тупиков по пути: ${n}` : 'Ни одного тупика — отличное расследование!',
          now: 'сейчас', illustrativeShort: 'иллюстрация', illustrative: 'Иллюстрация: в источнике нет цифр, значения придуманы по описанию в тексте.', back: '← Все выпуски', toEpisode: '← К выпуску', empty: 'Выпусков пока нет.',
          noChart: 'График не найден.', checkQ: 'Что видишь на графике?',
          checkOk: 'Всё в порядке, вернуться к развилке', checkBad: 'Есть деградация',
          hint: 'Подсказка', hints: n => `Подсказок: ${n}` },
    en: { step: 'Step', next: 'Next', reveal: 'What really happened', source: 'Source',
          mistakes: n => n ? `Dead ends on the way: ${n}` : 'No dead ends — great investigation!',
          now: 'now', illustrativeShort: 'illustration', illustrative: 'Illustration: the source has no numbers, values are made up from the description.', back: '← All episodes', toEpisode: '← Back to episode', empty: 'No episodes yet.',
          noChart: 'Chart not found.', checkQ: 'What does the chart show?',
          checkOk: 'All fine, back to the fork', checkBad: 'Degradation',
          hint: 'Hint', hints: n => `Hints used: ${n}` },
  };
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { } },
  };
  const params = new URLSearchParams(location.search);
  let lang = [params.get('lang'), store.get('lang')].find(l => l in UI)
    || (navigator.language.startsWith('ru') ? 'ru' : 'en');

  const UMAMI_ID = '072ac9f6-92c4-450d-8392-61ddbaa87c21';
  if (UMAMI_ID) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://cloud.umami.is/script.js';
    s.dataset.websiteId = UMAMI_ID;
    s.dataset.domains = 'artycorp.github.io';
    document.head.append(s);
  }
  const track = (name, data) => window.umami?.track(name, { episode: epId, lang, ...data });

  const app = document.getElementById('app');
  const t = v => typeof v === 'string' ? v : (v[lang] ?? v.en);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const LINK = /\[([^\]]+)\]\((chart:[\w-]+(?:@[\d:.]+)?|https:\/\/[^)\s]+|[\w.-]+\.html)\)|`([^`]+)`/g;
  const epId = location.pathname.match(/([\w-]+)\.html$/)?.[1];
  const rich = (text, parent) => {
    let i = 0;
    for (const m of text.matchAll(LINK)) {
      parent.append(text.slice(i, m.index));
      i = m.index + m[0].length;
      if (m[3] != null) {
        parent.append(el('code', null, m[3]));
        continue;
      }
      const chart = m[2].startsWith('chart:');
      const a = el('a', chart ? 'chart-link' : null, m[1]);
      const [id, until] = m[2].slice(6).split('@');
      a.href = chart ? `../chart.html?ep=${epId}&id=${id}${until ? `&until=${until}` : ''}&lang=${lang}` : m[2];
      a.target = '_blank';
      a.rel = 'noopener';
      parent.append(a);
    }
    parent.append(text.slice(i));
  };
  const paras = (text, parent) => text.split(/\n\s*\n/).forEach(p => {
    const e = el('p');
    rich(p.trim(), e);
    parent.append(e);
  });
  const loadEpisode = async id => {
    const res = await fetch(`episodes/${id}.html`);
    if (!res.ok) return null;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    return JSON.parse(doc.getElementById('episode').textContent);
  };
  const shuffle = n => [...Array(n).keys()].sort(() => Math.random() - 0.5);

  let render;

  function header(title, backHref, backLabel = UI[lang].back) {
    document.title = title;
    document.documentElement.lang = lang;
    const bar = el('nav', 'bar');
    if (backHref) {
      const a = el('a', null, backLabel);
      a.href = `${backHref}?lang=${lang}`;
      bar.append(a);
    } else {
      bar.append(el('span'));
    }
    const toggle = el('button', 'lang', lang === 'ru' ? 'EN' : 'RU');
    toggle.onclick = () => {
      lang = lang === 'ru' ? 'en' : 'ru';
      store.set('lang', lang);
      params.set('lang', lang);
      history.replaceState(null, '', `?${params}`);
      render();
    };
    bar.append(toggle);
    app.append(bar);
  }

  function panel(ep, c, until, { threshold = false, href, height = 220 } = {}) {
    const fig = el('figure', 'panel');
    const bar = el('div', 'dash-bar');
    const crumbs = el('span', 'crumbs', 'Dashboards › ');
    crumbs.append(el('b', null, t(ep.dashboard ?? ep.title)));
    const range = `${c.x[0]} – ${until ?? c.x.at(-1)}${c.xLabel ? ` ${t(c.xLabel)}` : ''}`;
    const refresh = el('span', 'refresh', '↻');
    refresh.ariaHidden = 'true';
    bar.append(crumbs, el('span', 'picker', `🕐 ${range}`), refresh);
    const card = el('div', 'panel-card');
    const head = el('figcaption');
    const title = el(href ? 'a' : 'span', href ? 'chart-link' : null, t(c.title));
    if (href) {
      title.href = href;
      title.target = '_blank';
      title.rel = 'noopener';
    }
    head.append(title);
    if (c.illustrative) {
      const badge = el('span', 'illustrative', UI[lang].illustrativeShort);
      badge.title = UI[lang].illustrative;
      head.append(badge);
    }
    const box = el('div', 'plot');
    card.append(head, box);
    fig.append(bar, card);
    loadUPlot().then(() => box.isConnected && drawChart(box, c, until, height, threshold));
    return fig;
  }

  function inlineChart(ep, ref, threshold) {
    const [id, until] = ref.split('@');
    const href = `../chart.html?ep=${epId}&id=${id}${until ? `&until=${until}` : ''}&lang=${lang}`;
    return panel(ep, ep.charts[id], until, { threshold, href });
  }

  function playEpisode(ep) {
    const mistakes = () => state.steps.reduce((n, st) => n + st.tried.length - 1, 0);
    const hints = () => state.steps.filter(st => st.hint).length;
    const state = { step: 0, steps: ep.steps.map(s => ({ order: shuffle(s.options.length), tried: [], checks: {}, solved: false, hint: false })) };

    render = () => {
      const y = scrollY;
      clearPlots();
      app.replaceChildren();
      header(t(ep.title), '../');
      app.append(el('h1', null, t(ep.title)));
      const intro = el('section', 'intro');
      paras(t(ep.intro), intro);
      app.append(intro);

      for (let i = 0; i <= Math.min(state.step, ep.steps.length - 1); i++) {
        const s = ep.steps[i], st = state.steps[i];
        const box = el('section', 'step');
        box.append(el('h2', null, `${UI[lang].step} ${i + 1}/${ep.steps.length}`));
        paras(t(s.text), box);
        if (s.chart) box.append(inlineChart(ep, s.chart, st.hint));
        if (st.hint) {
          const h = el('div', 'hint');
          paras(t(s.hint), h);
          box.append(h);
        } else if (s.hint && !st.solved) {
          const h = el('button', 'hint-btn', UI[lang].hint);
          h.onclick = () => {
            st.hint = true;
            track('hint', { step: i + 1 });
            render();
          };
          box.append(h);
        }
        const pending = st.tried.some(j => s.options[j].chart && !s.options[j].correct && !(j in st.checks));
        for (const j of st.solved ? st.tried : st.order) {
          const o = s.options[j], tried = st.tried.includes(j);
          const b = el('button', 'option', t(o.text));
          b.disabled = st.solved || tried || pending;
          if (tried) b.classList.add(o.correct ? 'right' : 'wrong');
          b.onclick = () => {
            st.tried.push(j);
            st.solved = !!o.correct;
            track('option', { step: i + 1, option: j + 1, correct: !!o.correct, attempt: st.tried.length });
            render();
          };
          box.append(b);
          if (!tried) continue;
          const r = el('div', `result ${o.correct ? 'right' : 'wrong'}`);
          if (o.correct || !o.chart) {
            paras(t(o.result), r);
            if (o.chart) r.append(inlineChart(ep, o.chart, st.hint));
          } else {
            const said = st.checks[j];
            r.append(inlineChart(ep, o.chart, st.hint), el('p', null, UI[lang].checkQ));
            for (const bad of [false, true]) {
              const c = el('button', 'option check', bad ? UI[lang].checkBad : UI[lang].checkOk);
              c.disabled = said !== undefined;
              if (said === bad) c.classList.add(bad === !!o.degraded ? 'right' : 'wrong');
              c.onclick = () => {
                st.checks[j] = bad;
                track('check', { step: i + 1, option: j + 1, correct: bad === !!o.degraded });
                render();
              };
              r.append(c);
            }
            if (said !== undefined) paras(t(said === !!o.degraded ? o.result : o.miss), r);
          }
          box.append(r);
        }
        if (st.solved && i === state.step) {
          const isLast = i === ep.steps.length - 1;
          const next = el('button', 'next', isLast ? UI[lang].reveal : UI[lang].next);
          next.onclick = () => {
            state.step++;
            if (isLast) track('finish', { mistakes: mistakes(), hints: hints() });
            render();
            app.lastElementChild.scrollIntoView({ behavior: 'smooth' });
          };
          box.append(next);
        }
        app.append(box);
      }

      if (state.step === ep.steps.length) {
        const out = el('section', 'outro');
        out.append(el('h2', null, UI[lang].reveal));
        paras(t(ep.outro), out);
        const src = el('p');
        const a = el('a', null, ep.source.title);
        a.href = ep.source.url;
        a.rel = 'noopener';
        src.append(`${UI[lang].source}: `, a);
        out.append(src);
        const score = [UI[lang].mistakes(mistakes()), hints() && UI[lang].hints(hints())].filter(Boolean);
        out.append(el('p', 'score', score.join(' · ')));
        app.append(out);
      }
      scrollTo(0, y);
    };
    render();
  }

  async function listEpisodes() {
    const episodes = [];
    for (let n = 1; ; n++) {
      const id = String(n).padStart(3, '0');
      const ep = await loadEpisode(id);
      if (!ep) break;
      episodes.push({ id, ...ep });
    }
    episodes.reverse();

    render = () => {
      app.replaceChildren();
      header('Incident Quest');
      app.append(el('h1', null, 'Incident Quest'));
      if (!episodes.length) app.append(el('p', null, UI[lang].empty));
      const ul = el('ul', 'episodes');
      for (const ep of episodes) {
        const li = el('li');
        const a = el('a', null, `#${ep.id} · ${t(ep.title)}`);
        a.href = `episodes/${ep.id}.html?lang=${lang}`;
        li.append(a);
        ul.append(li);
      }
      app.append(ul);
    };
    render();
  }

  const toMin = v => typeof v === 'string' ? v.split(':').reduce((h, m) => h * 60 + +m) : v;
  const hhmm = m => [Math.floor(m / 60) % 24, m % 60].map(n => String(n).padStart(2, '0')).join(':');
  const fmt = (v, unit) => {
    if (v == null) return '—';
    if (/^(ms|мс)$/.test(unit) && Math.abs(v) >= 1000) [v, unit] = [v / 1000, lang === 'ru' ? 'с' : 's'];
    const [n, k] = Math.abs(v) >= 1e6 ? [v / 1e6, 'M'] : Math.abs(v) >= 1e3 ? [v / 1e3, 'K'] : [v, ''];
    const num = +n.toFixed(Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2) + k;
    return !unit ? num : unit === '%' ? `${num}%` : `${num} ${unit}`;
  };

  const UPLOT = 'https://cdn.jsdelivr.net/npm/uplot@1.6.31/dist/uPlot';
  let uplotReady;
  const loadUPlot = () => uplotReady ??= new Promise((resolve, reject) => {
    const link = el('link');
    link.rel = 'stylesheet';
    link.href = `${UPLOT}.min.css`;
    const script = el('script');
    script.src = `${UPLOT}.iife.min.js`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(link, script);
  });

  let plots = [];
  addEventListener('resize', () => {
    for (const { plot, box } of plots) {
      if (box.clientWidth !== plot.width) plot.setSize({ width: box.clientWidth, height: plot.height });
    }
  });
  const clearPlots = () => {
    plots.forEach(({ plot }) => plot.destroy());
    plots = [];
  };

  function drawChart(box, c, until, height, threshold) {
    const style = getComputedStyle(box);
    const css = n => style.getPropertyValue(n).trim();
    const unit = c.unit && t(c.unit), tickUnit = unit?.length <= 3 ? unit : '';
    const time = typeof c.x[0] === 'string';
    const xs = c.x.reduce((acc, v) => {
      let m = toMin(v);
      while (time && acc.length && m < acc.at(-1)) m += 1440;
      return [...acc, m];
    }, []);
    const markX = v => toMin(v) + (time && toMin(v) < xs[0] ? 1440 : 0);
    const cut = until == null ? Infinity : markX(until);
    const n = xs.filter(x => x <= cut).length;
    const colors = ['--s1', '--s2', '--s3'].map(css);
    const axis = { stroke: css('--muted'), grid: { stroke: css('--line'), width: 1 }, ticks: { show: false } };
    const marks = u => {
      const { ctx, bbox } = u, dpr = devicePixelRatio;
      ctx.save();
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.lineWidth = dpr;
      ctx.strokeStyle = ctx.fillStyle = css('--muted');
      ctx.font = `${12 * dpr}px ${css('--ui')}`;
      const line = (x, label, y, left = false) => {
        x = Math.round(u.valToPos(x, 'x', true));
        ctx.beginPath();
        ctx.moveTo(x, bbox.top);
        ctx.lineTo(x, bbox.top + bbox.height);
        ctx.stroke();
        const bottom = bbox.top + bbox.height, w = 4 * dpr;
        ctx.beginPath();
        ctx.moveTo(x - w, bottom);
        ctx.lineTo(x + w, bottom);
        ctx.lineTo(x, bottom - 1.5 * w);
        ctx.fill();
        ctx.textAlign = left ? 'right' : 'left';
        ctx.fillText(label, x + (left ? -6 : 4) * dpr, y);
      };
      const rows = [];
      for (const m of c.marks ?? []) {
        if (markX(m.x) > cut) continue;
        const x = u.valToPos(markX(m.x), 'x', true), w = ctx.measureText(t(m.label)).width + 10 * dpr;
        const nearRight = x > bbox.left + bbox.width * 0.65;
        const [from, to] = nearRight ? [x - w, x] : [x, x + w];
        let r = 0;
        while (rows[r] > from) r++;
        rows[r] = to;
        line(markX(m.x), t(m.label), bbox.top + (14 + 16 * r) * dpr, nearRight);
      }
      if (until != null) {
        ctx.setLineDash([]);
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = ctx.fillStyle = css('--spine');
        line(cut, UI[lang].now, bbox.top + bbox.height - 24 * dpr, true);
      }
      ctx.restore();
    };
    const tip = el('div', 'tooltip');
    tip.hidden = true;
    const tooltip = u => {
      const i = u.cursor.idx;
      tip.hidden = i == null;
      if (tip.hidden) return;
      const x = u.data[0][i];
      tip.replaceChildren(el('b', null, time ? hhmm(x) : `${x}${c.xLabel ? ` ${t(c.xLabel)}` : ''}`));
      c.series.forEach((s, k) => {
        const row = el('div');
        const swatch = el('i');
        swatch.style.background = u.series[k + 1].stroke();
        row.append(swatch, `${t(s.name)} `, el('span', null, fmt(u.data[k + 1][i], tickUnit)));
        tip.append(row);
      });
      const { left, top } = u.cursor, w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = `${left + 12 + w > u.over.clientWidth ? Math.max(0, left - 12 - w) : left + 12}px`;
      tip.style.top = `${Math.max(0, Math.min(top + 12, u.over.clientHeight - h))}px`;
    };
    const plot = new uPlot({
      width: box.clientWidth,
      height,
      scales: {
        x: { time: false, ...(until != null && { range: (u, min) => [min, cut] }) },
        y: { range: (u, min, max) => [0, Math.max(c.yMax ?? 0, max * 1.1)] },
      },
      axes: [
        { ...axis, ...(time && { incrs: [1, 2, 5, 10, 15, 30, 60, 120, 180, 240, 360, 720], values: (u, vs) => vs.map(hhmm) }) },
        { ...axis, label: tickUnit ? undefined : unit, size: 56, values: (u, vs) => vs.map(v => fmt(v, tickUnit)) },
      ],
      legend: { show: false },
      series: [
        { label: time ? 'time' : t(c.xLabel ?? ''), value: (u, v) => v == null ? '—' : time ? hhmm(v) : v },
        ...c.series.map((s, i) => ({
          label: t(s.name), stroke: colors[i % colors.length], width: 2, spanGaps: true,
          ...(c.interpolation === 'step' && { paths: uPlot.paths.stepped({ align: 1 }) }),
          ...(c.illustrative && { dash: [8, 5] }),
          ...(threshold && s.threshold && { stroke: css('--threshold'), dash: [10, 6] }),
        })),
      ],
      hooks: { draw: [marks], setCursor: [tooltip], ready: [u => u.over.append(tip)] },
    }, [xs.slice(0, n), ...c.series.map(s => s.values.slice(0, n))], box);
    plots.push({ plot, box });
    const touch = e => {
      const r = plot.over.getBoundingClientRect(), p = e.touches[0];
      plot.setCursor({ left: p.clientX - r.left, top: p.clientY - r.top });
    };
    plot.over.addEventListener('touchstart', touch, { passive: true });
    plot.over.addEventListener('touchmove', touch, { passive: true });

    const legend = el('table', 'legend');
    const head = el('tr');
    head.append(el('th'), el('th', null, 'Last'), el('th', null, 'Max'));
    legend.append(head);
    c.series.forEach((s, i) => {
      const vs = s.values.slice(0, n).filter(v => v != null);
      const name = el('td', null, t(s.name));
      const swatch = el('i');
      swatch.style.background = plot.series[i + 1].stroke();
      name.prepend(swatch);
      const row = el('tr');
      row.append(name, el('td', null, fmt(vs.at(-1), tickUnit)), el('td', null, fmt(vs.length ? Math.max(...vs) : null, tickUnit)));
      legend.append(row);
    });
    box.after(legend);
  }

  async function showChart() {
    const id = params.get('ep');
    const ep = await loadEpisode(id);
    const c = ep?.charts?.[params.get('id')];
    if (c) await loadUPlot();

    render = () => {
      clearPlots();
      app.replaceChildren();
      if (!c) {
        header('Incident Quest', `episodes/${id}.html`, UI[lang].toEpisode);
        app.append(el('p', null, UI[lang].noChart));
        return;
      }
      header(t(c.title), `episodes/${id}.html`, UI[lang].toEpisode);
      const until = params.get('until');
      const height = Math.max(240, Math.min(380, innerHeight * 0.5));
      app.append(panel(ep, c, until ?? undefined, { threshold: until == null, height }));
      if (c.illustrative) app.append(el('p', 'chart-source', UI[lang].illustrative));
      if (until != null) return;
      if (c.note) paras(t(c.note), app);
      const src = el('p', 'chart-source');
      const a = el('a', null, ep.source.title);
      a.href = ep.source.url;
      a.rel = 'noopener';
      src.append(`${UI[lang].source}: `, a);
      app.append(src);
    };
    render();
  }

  if (document.body.dataset.page === 'chart') showChart();
  else if (document.getElementById('episode')) playEpisode(JSON.parse(document.getElementById('episode').textContent));
  else listEpisodes();
})();
