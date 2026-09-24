(() => {
  const UI = {
    ru: { step: 'Шаг', next: 'Дальше', reveal: 'Что было на самом деле', source: 'Источник',
          mistakes: n => n ? `Тупиков по пути: ${n}` : 'Ни одного тупика — отличное расследование!',
          now: 'сейчас', illustrative: 'Иллюстрация: в источнике нет цифр, значения придуманы по описанию в тексте.', back: '← Все выпуски', toEpisode: '← К выпуску', empty: 'Выпусков пока нет.',
          noChart: 'График не найден.' },
    en: { step: 'Step', next: 'Next', reveal: 'What really happened', source: 'Source',
          mistakes: n => n ? `Dead ends on the way: ${n}` : 'No dead ends — great investigation!',
          now: 'now', illustrative: 'Illustration: the source has no numbers, values are made up from the description.', back: '← All episodes', toEpisode: '← Back to episode', empty: 'No episodes yet.',
          noChart: 'Chart not found.' },
  };
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { } },
  };
  const params = new URLSearchParams(location.search);
  let lang = [params.get('lang'), store.get('lang')].find(l => l in UI)
    || (navigator.language.startsWith('ru') ? 'ru' : 'en');

  const app = document.getElementById('app');
  const t = v => typeof v === 'string' ? v : (v[lang] ?? v.en);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const LINK = /\[([^\]]+)\]\((chart:[\w-]+(?:@[\d:.]+)?|https:\/\/[^)\s]+)\)/g;
  const epId = location.pathname.match(/([\w-]+)\.html$/)?.[1];
  const rich = (text, parent) => {
    let i = 0;
    for (const m of text.matchAll(LINK)) {
      parent.append(text.slice(i, m.index));
      const chart = m[2].startsWith('chart:');
      const a = el('a', chart ? 'chart-link' : null, m[1]);
      const [id, until] = m[2].slice(6).split('@');
      a.href = chart ? `../chart.html?ep=${epId}&id=${id}${until ? `&until=${until}` : ''}&lang=${lang}` : m[2];
      a.target = '_blank';
      a.rel = 'noopener';
      parent.append(a);
      i = m.index + m[0].length;
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

  function playEpisode(ep) {
    const state = { step: 0, steps: ep.steps.map(s => ({ order: shuffle(s.options.length), tried: [], solved: false })) };

    render = () => {
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
        for (const j of st.solved ? st.tried : st.order) {
          const o = s.options[j], tried = st.tried.includes(j);
          const b = el('button', 'option', t(o.text));
          b.disabled = st.solved || tried;
          if (tried) b.classList.add(o.correct ? 'right' : 'wrong');
          b.onclick = () => {
            st.tried.push(j);
            st.solved = !!o.correct;
            render();
          };
          box.append(b);
          if (tried) {
            const r = el('div', `result ${o.correct ? 'right' : 'wrong'}`);
            paras(t(o.result), r);
            box.append(r);
          }
        }
        if (st.solved && i === state.step) {
          const isLast = i === ep.steps.length - 1;
          const next = el('button', 'next', isLast ? UI[lang].reveal : UI[lang].next);
          next.onclick = () => {
            state.step++;
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
        const mistakes = state.steps.reduce((n, st) => n + st.tried.length - 1, 0);
        out.append(el('p', 'score', UI[lang].mistakes(mistakes)));
        app.append(out);
      }
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

  async function showChart() {
    const id = params.get('ep');
    const ep = await loadEpisode(id);
    const c = ep?.charts?.[params.get('id')];
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    let plot;

    render = () => {
      plot?.destroy();
      app.replaceChildren();
      if (!c) {
        header('Incident Quest', `episodes/${id}.html`, UI[lang].toEpisode);
        app.append(el('p', null, UI[lang].noChart));
        return;
      }
      header(t(c.title), `episodes/${id}.html`, UI[lang].toEpisode);
      app.append(el('h1', 'chart-title', t(c.title)));
      if (c.illustrative) app.append(el('p', 'illustrative', UI[lang].illustrative));
      const box = el('div', 'plot');
      app.append(box);
      if (c.note) paras(t(c.note), app);
      const src = el('p', 'chart-source');
      const a = el('a', null, ep.source.title);
      a.href = ep.source.url;
      a.rel = 'noopener';
      src.append(`${UI[lang].source}: `, a);
      app.append(src);

      const time = typeof c.x[0] === 'string';
      const xs = c.x.reduce((acc, v) => {
        let m = toMin(v);
        while (time && acc.length && m < acc.at(-1)) m += 1440;
        return [...acc, m];
      }, []);
      const markX = v => toMin(v) + (time && toMin(v) < xs[0] ? 1440 : 0);
      const until = params.get('until');
      const cut = until == null ? Infinity : markX(until);
      const n = xs.filter(x => x <= cut).length;
      const colors = ['--s1', '--s2', '--s3'].map(css);
      const axis = { stroke: css('--muted'), grid: { stroke: css('--line'), width: 1 }, ticks: { show: false } };
      const size = () => ({ width: box.clientWidth, height: Math.max(240, Math.min(380, innerHeight * 0.5)) });
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
          ctx.textAlign = left ? 'right' : 'left';
          ctx.fillText(label, x + (left ? -6 : 4) * dpr, y);
        };
        for (const m of c.marks ?? []) {
          if (markX(m.x) <= cut) line(markX(m.x), t(m.label), bbox.top + 14 * dpr);
        }
        if (until != null) {
          ctx.setLineDash([]);
          ctx.lineWidth = 2 * dpr;
          ctx.strokeStyle = ctx.fillStyle = css('--spine');
          line(cut, UI[lang].now, bbox.top + bbox.height - 24 * dpr, true);
        }
        ctx.restore();
      };
      plot = new uPlot({
        ...size(),
        scales: {
          x: { time: false, ...(until != null && { range: (u, min) => [min, cut] }) },
          y: { range: (u, min, max) => [0, Math.max(c.yMax ?? 0, max * 1.1)] },
        },
        axes: [
          { ...axis, ...(time && { values: (u, vs) => vs.map(hhmm) }) },
          { ...axis, label: c.unit, size: 56 },
        ],
        series: [
          { label: time ? 'time' : t(c.xLabel ?? ''), value: (u, v) => v == null ? '—' : time ? hhmm(v) : v },
          ...c.series.map((s, i) => ({ label: t(s.name), stroke: colors[i % colors.length], width: 2, spanGaps: true, ...(c.illustrative && { dash: [8, 5] }) })),
        ],
        hooks: { draw: [marks] },
      }, [xs.slice(0, n), ...c.series.map(s => s.values.slice(0, n))], box);
      onresize = () => plot.setSize(size());
    };
    render();
  }

  if (document.body.dataset.page === 'chart') showChart();
  else if (document.getElementById('episode')) playEpisode(JSON.parse(document.getElementById('episode').textContent));
  else listEpisodes();
})();
