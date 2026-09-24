(() => {
  const UI = {
    ru: { step: 'Шаг', next: 'Дальше', reveal: 'Что было на самом деле', source: 'Источник',
          mistakes: n => n ? `Тупиков по пути: ${n}` : 'Ни одного тупика — отличное расследование!',
          back: '← Все выпуски', empty: 'Выпусков пока нет.' },
    en: { step: 'Step', next: 'Next', reveal: 'What really happened', source: 'Source',
          mistakes: n => n ? `Dead ends on the way: ${n}` : 'No dead ends — great investigation!',
          back: '← All episodes', empty: 'No episodes yet.' },
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
  const paras = (text, parent) => text.split(/\n\s*\n/).forEach(p => parent.append(el('p', null, p.trim())));
  const shuffle = n => [...Array(n).keys()].sort(() => Math.random() - 0.5);

  let render;

  function header(title, backHref) {
    document.title = title;
    document.documentElement.lang = lang;
    const bar = el('nav', 'bar');
    if (backHref) {
      const a = el('a', null, UI[lang].back);
      a.href = `${backHref}?lang=${lang}`;
      bar.append(a);
    } else {
      bar.append(el('span'));
    }
    const toggle = el('button', 'lang', lang === 'ru' ? 'EN' : 'RU');
    toggle.onclick = () => {
      lang = lang === 'ru' ? 'en' : 'ru';
      store.set('lang', lang);
      history.replaceState(null, '', `?lang=${lang}`);
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
      paras(t(ep.intro), app);

      for (let i = 0; i <= Math.min(state.step, ep.steps.length - 1); i++) {
        const s = ep.steps[i], st = state.steps[i];
        const box = el('section', 'step');
        box.append(el('h2', null, `${UI[lang].step} ${i + 1}/${ep.steps.length}`));
        paras(t(s.text), box);
        for (const j of st.order) {
          const o = s.options[j];
          const b = el('button', 'option', t(o.text));
          b.disabled = st.solved || st.tried.includes(j);
          if (st.tried.includes(j)) b.classList.add(o.correct ? 'right' : 'wrong');
          b.onclick = () => {
            st.tried.push(j);
            st.solved = !!o.correct;
            render();
          };
          box.append(b);
        }
        const last = st.tried.at(-1);
        if (last != null) {
          const o = s.options[last];
          const r = el('div', `result ${o.correct ? 'right' : 'wrong'}`);
          paras(t(o.result), r);
          box.append(r);
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
      const res = await fetch(`episodes/${id}.html`);
      if (!res.ok) break;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      episodes.push({ id, ...JSON.parse(doc.getElementById('episode').textContent) });
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

  const data = document.getElementById('episode');
  if (data) playEpisode(JSON.parse(data.textContent));
  else listEpisodes();
})();
