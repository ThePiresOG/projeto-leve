'use strict';

/* ---------- Dados ---------- */
const KEY = 'leve.v1';
const $ = (s, el = document) => el.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ds(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtBR = (s) => { const d = parseD(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const kg = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function defaults() {
  const t = todayStr();
  return {
    settings: { start: t, startWeight: 85, goal: 77, height: 178, open: '11:00', close: '19:00', water: 3000 },
    days: {},
    measures: [{ date: t, weight: 85, waist: null }]
  };
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.settings) {
      const d = defaults();
      return { ...d, ...raw, settings: { ...d.settings, ...raw.settings }, days: raw.days || {}, measures: raw.measures || [] };
    }
  } catch (e) { /* segue com padrão */ }
  return defaults();
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Não foi possível salvar neste aparelho'); }
}
function day(dateStr = todayStr()) {
  if (!S.days[dateStr]) S.days[dateStr] = { checks: {}, water: 0, sets: {}, loads: {} };
  const d = S.days[dateStr];
  d.checks ||= {}; d.sets ||= {}; d.loads ||= {}; d.water ||= 0;
  return d;
}

/* ---------- Plano ---------- */
const CHECKS = [
  { id: 'jejum', t: 'Jejum respeitado', s: () => `Janela das ${S.settings.open} às ${S.settings.close}` },
  { id: 'proteina', t: 'Proteína em todas as refeições', s: () => 'Ovos, frango, peixe, carne magra, iogurte, whey' },
  { id: 'prato', t: 'Metade do prato com salada e legumes' },
  { id: 'fibra', t: 'Fonte de fibra', s: () => 'Aveia, feijão, lentilha, fruta' },
  { id: 'treino', t: 'Treino do dia', s: () => planFor(new Date()).short },
  { id: 'agua', t: 'Meta de água', s: () => `${(S.settings.water / 1000).toLocaleString('pt-BR')} L (marca sozinho no contador)` },
  { id: 'passos', t: '8 a 10 mil passos' },
  { id: 'doce', t: 'Sem doce fora do planejado', s: () => '1 a 2 vezes por semana, porção definida' },
  { id: 'cozinha', t: 'Cozinha fechada após o jantar', s: () => 'Escovar os dentes logo depois ajuda' }
];

const WORKOUTS = {
  A: [
    { id: 'agach', n: 'Agachamento livre (ou no Smith)', p: '3 x 10', tip: 'Desça até a coxa ficar paralela ao chão, coluna neutra.' },
    { id: 'supino', n: 'Supino reto com halteres', p: '3 x 10 a 12', tip: 'Escápulas encaixadas, desça controlando.' },
    { id: 'remada', n: 'Remada baixa na polia', p: '3 x 12', tip: 'Puxe com as costas, cotovelos rentes ao corpo.' },
    { id: 'stiff', n: 'Stiff com halteres', p: '3 x 10', tip: 'Joelhos levemente flexionados, leve o quadril pra trás.' },
    { id: 'prancha', n: 'Prancha', p: '3 x 30 a 45 s', tip: 'Abdômen e glúteos contraídos, sem deixar o quadril cair.', noLoad: true }
  ],
  B: [
    { id: 'leg', n: 'Leg press 45°', p: '3 x 12', tip: 'Pés na largura do quadril, não trave os joelhos no topo.' },
    { id: 'desenv', n: 'Desenvolvimento com halteres', p: '3 x 10 a 12', tip: 'Sentado, sem arquear a lombar.' },
    { id: 'puxada', n: 'Puxada frontal', p: '3 x 12', tip: 'Puxe a barra até o queixo, peito aberto.' },
    { id: 'pelvica', n: 'Elevação pélvica', p: '3 x 12', tip: 'Segure 1 segundo no topo apertando o glúteo.' },
    { id: 'pranchalat', n: 'Prancha lateral', p: '3 x 30 s cada lado', tip: 'Corpo alinhado da cabeça aos pés.', noLoad: true }
  ]
};

function weekOf(date) {
  const diff = Math.round((parseD(ds(date)) - parseD(S.settings.start)) / 864e5);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}
function phaseOf(w) {
  if (w <= 0) return { n: 0, name: 'Pré-início', tip: 'O projeto começa na data definida nas configurações. Use esses dias pra fazer as compras e tirar o doce da vista.' };
  if (w <= 2) return { n: 1, name: 'Adaptação', tip: 'Comece com jejum de 12h e suba aos poucos até 16h. Corte açúcar e farinha branca. Cargas leves, foco na técnica.' };
  if (w <= 8) return { n: 2, name: 'Aceleração', tip: 'Plano completo: jejum 16:8, aumente um pouco a carga toda semana e leve o cardio para 40 a 45 min.' };
  if (w <= 12) return { n: 3, name: 'Consolidação', tip: 'Se a perda travar, ajuste as porções. Inclua 1 treino intervalado leve na quinta.' };
  return { n: 4, name: 'Manutenção', tip: 'Meta batida ou quase lá? Mantenha a rotina e libere um pouco mais de carbo bom, monitorando o peso.' };
}
function cardioMin(ph) { return ph <= 1 ? '30' : ph === 2 ? '40 a 45' : '45'; }

function planFor(date) {
  const w = weekOf(date), ph = phaseOf(w).n, wd = date.getDay();
  const order = (w % 2 === 0 && w > 0) ? ['B', 'A', 'B'] : ['A', 'B', 'A'];
  const idx = [1, 3, 5].indexOf(wd);
  if (idx >= 0) {
    const t = order[idx];
    return { kind: 'forca', w: t, short: `Musculação ${t}`, title: `Musculação ${t}`, desc: wd === 1 ? 'Finalize com 20 min de caminhada na esteira.' : 'Se sobrar tempo, 10 a 15 min de esteira inclinada no final.' };
  }
  if (wd === 2) return { kind: 'cardio', short: `Cardio ${cardioMin(ph)} min`, title: 'Cardio moderado', desc: `Caminhada rápida ou bike por ${cardioMin(ph)} min. Ritmo em que dá pra conversar, mas sem cantar.` };
  if (wd === 4) return { kind: 'cardio', short: ph >= 3 ? 'Cardio + intervalado' : `Cardio ${cardioMin(ph)} min`, title: ph >= 3 ? 'Cardio com intervalado leve' : 'Cardio moderado',
    desc: ph >= 3 ? 'Esteira ou bike: 5 min aquecendo, depois 8 x (1 min forte + 2 min leve), 5 min desacelerando.' : `Esteira inclinada ou bike por ${cardioMin(ph)} min.` };
  if (wd === 6) return { kind: 'ativo', short: 'Atividade livre', title: 'Dia ativo', desc: 'Atividade com os filhos, bike ou caminhada longa. O que importa é se mexer.' };
  return { kind: 'descanso', short: 'Descanso', title: 'Descanso', desc: 'Dia de recuperar. Um alongamento leve ou caminhada tranquila já conta.' };
}

function currentWeight() {
  const m = [...S.measures].filter((x) => x.weight).sort((a, b) => a.date.localeCompare(b.date));
  return m.length ? m[m.length - 1].weight : S.settings.startWeight;
}
function score(d) {
  const x = S.days[d];
  if (!x || !x.checks) return 0;
  return CHECKS.filter((c) => x.checks[c.id]).length / CHECKS.length;
}
function streak() {
  let n = 0, d = new Date();
  if (score(ds(d)) < 0.75) d = addDays(d, -1);
  while (score(ds(d)) >= 0.75) { n++; d = addDays(d, -1); }
  return n;
}

const FRASES = [
  'Um dia de cada vez. Hoje é o que conta.',
  'Doce dos meninos é dos meninos!',
  'Já tomou água? Bora encher esse copo.',
  'Treino feito vale mais que treino perfeito.',
  'Constância ganha de intensidade.',
  'Em 2018 foram 13 kg. Dá pra fazer de novo.',
  'Café preto no jejum é liberado. Aproveita!',
  'Cada série anotada é um passo rumo à meta.',
  'Prato colorido, cabeça leve.',
  'Bateu a vontade de doce? Água e espera 10 minutos.',
  'Não precisa ser perfeito. Precisa ser hoje.',
  'Os meninos estão olhando. Dá o exemplo!'
];
function motivation(t, w) {
  if (w <= 0) return 'Logo a gente começa. Já tira o doce da vista!';
  const sc = score(t);
  if (sc === 1) return 'Dia 100%! É assim que se faz.';
  if (currentWeight() <= S.settings.goal) return 'Meta batida! Agora é manter.';
  const n = Math.round(parseD(t) / 864e5);
  return FRASES[n % FRASES.length];
}

/* ---------- Jejum ---------- */
function at(base, hhmm, plusDays = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const x = new Date(base); x.setHours(h, m, 0, 0); x.setDate(x.getDate() + plusDays); return x;
}
function fastState(now = new Date()) {
  const { open, close } = S.settings;
  const o = at(now, open), c = at(now, close);
  if (now >= o && now < c) return { eating: true, start: o, end: c };
  if (now < o) return { eating: false, start: at(now, close, -1), end: o };
  return { eating: false, start: c, end: at(now, open, 1) };
}
const dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)}h ${pad(m % 60)}min`; };

/* ---------- UI helpers ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
const TICK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';

/* ---------- View: Hoje ---------- */
function renderHoje() {
  const now = new Date(), t = todayStr(), d = day(t);
  const w = weekOf(now), ph = phaseOf(w), plan = planFor(now);
  const cw = currentWeight(), sw = S.settings.startWeight, goal = S.settings.goal;
  const prog = Math.min(100, Math.max(0, ((sw - cw) / (sw - goal)) * 100)) || 0;
  const waterPct = Math.min(100, (d.water / S.settings.water) * 100);

  let dots = '';
  for (let i = 13; i >= 0; i--) {
    const k = ds(addDays(now, -i)), sc = score(k);
    const lv = sc >= 0.75 ? 'l3' : sc >= 0.5 ? 'l2' : sc > 0 ? 'l1' : '';
    dots += `<span class="${lv}${i === 0 ? ' today' : ''}" title="${fmtBR(k)}"></span>`;
  }

  $('#view-hoje').innerHTML = `
    <div class="card hero">
      <div class="hero-top">
        <div class="hero-txt">
          <span class="pill">${w > 0 ? `Semana ${w} · ` : ''}${ph.name}</span>
          <h2>${kg(cw)} kg <span class="muted small">meta ${kg(goal)} kg</span></h2>
          <div class="bubble">${esc(motivation(t, w))}</div>
        </div>
        <img class="hero-img" src="icons/felipe-meio.png" alt="" width="247" height="480">
      </div>
      <p class="muted small" style="margin-top:12px">${esc(ph.tip)}</p>
      <div class="bar"><i style="width:${prog}%"></i></div>
      <div class="split"><span>${kg(sw)} kg</span><span>${Math.round(prog)}% do caminho</span><span>${kg(goal)} kg</span></div>
    </div>

    <div class="card">
      <div class="fast">
        <div class="ring" id="ring"></div>
        <div id="fastTxt"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Água</h2><span class="muted small">copo = 250 ml</span></div>
      <div class="water-row">
        <button class="round" data-water="-250" aria-label="Menos 250 ml">−</button>
        <div class="amount tnum">${(d.water / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L <span class="muted small">/ ${(S.settings.water / 1000).toLocaleString('pt-BR')} L</span></div>
        <button class="round primary" data-water="250" aria-label="Mais 250 ml">+</button>
      </div>
      <div class="bar water"><i style="width:${waterPct}%"></i></div>
    </div>

    <div class="card">
      <div class="card-head">
        <h2>Checklist de hoje</h2>
        <span class="pill ${score(t) >= 0.75 ? '' : 'amber'}">${CHECKS.filter((c) => d.checks[c.id]).length}/${CHECKS.length}</span>
      </div>
      ${CHECKS.map((c) => `
        <label class="check">
          <input type="checkbox" data-check="${c.id}" ${d.checks[c.id] ? 'checked' : ''}>
          <span class="box">${TICK}</span>
          <span class="lbl">${esc(c.t)}${c.s ? `<small>${esc(c.s())}</small>` : ''}</span>
        </label>`).join('')}
    </div>

    <div class="card">
      <div class="card-head">
        <div><div class="streak tnum">${streak()}</div><div class="muted small">dias seguidos com 75% ou mais</div></div>
        <button class="btn ghost" data-go="treino">Hoje: ${esc(plan.short)}</button>
      </div>
      <div class="days">${dots}</div>
      <div class="split" style="margin-top:6px"><span>14 dias atrás</span><span>hoje</span></div>
    </div>`;
  renderFast();
}

function renderFast() {
  const ring = $('#ring'); if (!ring) return;
  const now = new Date(), f = fastState(now);
  const total = f.end - f.start, pct = Math.min(1, Math.max(0, (now - f.start) / total));
  const R = 54, C = 2 * Math.PI * R;
  const color = f.eating ? 'var(--amber)' : 'var(--accent)';
  ring.innerHTML = `
    <svg viewBox="0 0 128 128" width="128" height="128">
      <circle cx="64" cy="64" r="${R}" fill="none" stroke="var(--ring-track)" stroke-width="12"/>
      <circle cx="64" cy="64" r="${R}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
    </svg>
    <div class="center"><div class="big tnum">${Math.round(pct * 100)}%</div><div class="muted small">${f.eating ? 'janela' : 'jejum'}</div></div>`;
  const hh = (x) => `${pad(x.getHours())}:${pad(x.getMinutes())}`;
  $('#fastTxt').innerHTML = f.eating
    ? `<div class="status">Janela aberta</div>
       <p class="muted small">Fecha às ${hh(f.end)}</p>
       <p class="tnum" style="margin-top:8px"><strong>${dur(f.end - now)}</strong> <span class="muted small">pra fechar</span></p>`
    : `<div class="status">Em jejum há <span class="tnum">${dur(now - f.start)}</span></div>
       <p class="muted small">Janela abre às ${hh(f.end)}</p>
       <p class="tnum" style="margin-top:8px"><strong>${dur(f.end - now)}</strong> <span class="muted small">pra abrir</span></p>
       <p class="muted small" style="margin-top:6px">Água, café preto e chá liberados.</p>`;
}

/* ---------- View: Treino ---------- */
let treinoSel = null;
function lastLoad(exId, before) {
  const keys = Object.keys(S.days).filter((k) => k < before && S.days[k].loads && S.days[k].loads[exId]).sort();
  const k = keys[keys.length - 1];
  return k ? { date: k, v: S.days[k].loads[exId] } : null;
}
function renderTreino() {
  const now = new Date(), t = todayStr(), d = day(t), plan = planFor(now);
  if (!treinoSel) treinoSel = plan.kind === 'forca' ? plan.w : 'A';
  const ph = phaseOf(weekOf(now));
  let head = '';
  if (plan.kind !== 'forca') {
    head = `
      <div class="card cardio-card">
        <span class="pill">Hoje</span>
        <h2 style="margin:8px 0 4px">${esc(plan.title)}</h2>
        <p>${esc(plan.desc)}</p>
        <label class="check" style="margin-top:8px">
          <input type="checkbox" data-check="treino" ${d.checks.treino ? 'checked' : ''}>
          <span class="box">${TICK}</span><span class="lbl">Feito</span>
        </label>
      </div>
      <p class="muted small" style="margin:0 4px 10px">Precisou trocar o dia? Dá pra registrar a musculação abaixo.</p>`;
  } else {
    head = `<div class="card cardio-card"><span class="pill">Hoje · ${esc(plan.title)}</span>
      <p style="margin-top:8px">${ph.n <= 1 ? 'Fase de adaptação: carga leve, foco na técnica.' : 'Tente subir um pouco a carga em relação à última vez.'} Descanso de 60 a 90 s entre séries. ${esc(plan.desc)}</p></div>`;
  }
  const list = WORKOUTS[treinoSel];
  $('#view-treino').innerHTML = `
    ${head}
    <div class="seg" role="tablist">
      <button class="${treinoSel === 'A' ? 'on' : ''}" data-wsel="A">Treino A</button>
      <button class="${treinoSel === 'B' ? 'on' : ''}" data-wsel="B">Treino B</button>
    </div>
    ${list.map((ex) => {
      const sets = d.sets[ex.id] || [false, false, false];
      const ll = lastLoad(ex.id, t);
      return `
      <div class="card ex">
        <div class="card-head" style="margin-bottom:0"><h3>${esc(ex.n)}</h3><span class="presc">${esc(ex.p)}</span></div>
        <div class="tip">${esc(ex.tip)}</div>
        <div class="ex-row">
          ${ex.noLoad ? '' : `<div class="load"><input type="number" step="0.5" inputmode="decimal" placeholder="${ll ? esc(ll.v) : 'kg'}" value="${d.loads[ex.id] ?? ''}" data-load="${ex.id}" aria-label="Carga em kg"><span class="muted small">kg</span></div>`}
          <div class="sets">${sets.map((on, i) => `<button class="set ${on ? 'done' : ''}" data-set="${ex.id}" data-i="${i}" aria-label="Série ${i + 1}">${i + 1}</button>`).join('')}</div>
          ${!ex.noLoad && ll ? `<div class="last">Última: ${esc(ll.v)} kg em ${fmtBR(ll.date)}</div>` : ''}
        </div>
      </div>`;
    }).join('')}`;
}
function checkWorkoutDone() {
  const d = day();
  const done = WORKOUTS[treinoSel].every((ex) => (d.sets[ex.id] || []).filter(Boolean).length === 3);
  if (done && !d.checks.treino) { d.checks.treino = true; save(); toast('Treino concluído! Marquei no checklist.'); }
}

/* Descanso */
let restEnd = 0, restT;
function startRest(sec = 90) {
  restEnd = Date.now() + sec * 1000; $('#restPill').hidden = false; tickRest();
  clearInterval(restT); restT = setInterval(tickRest, 250);
}
function tickRest() {
  const left = Math.ceil((restEnd - Date.now()) / 1000);
  if (left <= 0) {
    stopRest(); toast('Bora pra próxima série!');
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* sem vibração */ }
    return;
  }
  $('#restTime').textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`;
}
function stopRest() { clearInterval(restT); $('#restPill').hidden = true; }

/* ---------- View: Evolução ---------- */
function chartSVG() {
  const ms = S.measures.filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date));
  if (ms.length < 2) return '<p class="muted small">Registre pelo menos duas pesagens pra ver o gráfico.</p>';
  const W = 340, H = 190, L = 34, R = 12, T = 12, B = 26;
  const goal = S.settings.goal;
  const t0 = parseD(ms[0].date).getTime(), t1 = Math.max(parseD(ms[ms.length - 1].date).getTime(), t0 + 864e5);
  const ys = ms.map((m) => m.weight).concat(goal);
  const lo = Math.floor(Math.min(...ys) - 1), hi = Math.ceil(Math.max(...ys) + 1);
  const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const pts = ms.map((m) => [x(parseD(m.date).getTime()), y(m.weight)]);
  const step = Math.max(1, Math.ceil((hi - lo) / 4));
  let grid = '';
  for (let v = lo; v <= hi; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  const area = `M${pts[0][0]},${H - B} L${pts.map((p) => p.join(',')).join(' L')} L${pts[pts.length - 1][0]},${H - B} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de peso">
    ${grid}
    <line x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--amber)" stroke-width="2" stroke-dasharray="5 4"/>
    <text x="${W - R}" y="${y(goal) - 5}" text-anchor="end" style="fill:var(--amber);font-weight:700">meta ${kg(goal)}</text>
    <path d="${area}" fill="var(--accent)" opacity=".12"/>
    <polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>`).join('')}
    <text x="${L}" y="${H - 8}">${fmtBR(ms[0].date)}</text>
    <text x="${W - R}" y="${H - 8}" text-anchor="end">${fmtBR(ms[ms.length - 1].date)}</text>
  </svg>`;
}
function renderEvolucao() {
  const cw = currentWeight(), sw = S.settings.startWeight, goal = S.settings.goal, h = S.settings.height / 100;
  const imc = cw / (h * h);
  const waists = S.measures.filter((m) => m.waist).sort((a, b) => a.date.localeCompare(b.date));
  const wDiff = waists.length >= 2 ? waists[waists.length - 1].waist - waists[0].waist : null;
  const chol = ds(addDays(parseD(S.settings.start), 90));
  const hist = [...S.measures].sort((a, b) => b.date.localeCompare(a.date));
  const lost = sw - cw, left = Math.max(0, cw - goal);
  const msg = left === 0 ? 'Meta batida! Parabéns, agora é manter o ritmo.'
    : lost >= 0.5 ? `Já foram ${kg(lost)} kg. Faltam ${kg(left)} kg, segue firme!`
    : 'Registre seu peso toda semana e acompanhe a evolução aqui.';
  $('#view-evolucao').innerHTML = `
    <div class="card me-card">
      <img src="icons/felipe-corpo.png" alt="" width="263" height="900">
      <div><h2>${left === 0 ? 'Chegou lá!' : 'Bora, Felipe!'}</h2><p class="muted" style="margin-top:6px">${esc(msg)}</p></div>
    </div>
    <div class="stats">
      <div class="stat"><div class="v tnum">${kg(cw)}</div><div class="k">peso atual (kg)</div></div>
      <div class="stat"><div class="v tnum" style="color:var(--accent)">${sw - cw >= 0 ? '−' : '+'}${kg(Math.abs(sw - cw))}</div><div class="k">desde o início (kg)</div></div>
      <div class="stat"><div class="v tnum">${kg(Math.max(0, cw - goal))}</div><div class="k">faltam pra meta (kg)</div></div>
      <div class="stat"><div class="v tnum">${imc.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div><div class="k">IMC ${imc < 25 ? '(normal)' : imc < 30 ? '(sobrepeso)' : '(obesidade)'}</div></div>
    </div>
    <div class="card chart"><div class="card-head"><h2>Peso</h2>${wDiff !== null ? `<span class="pill">cintura ${wDiff <= 0 ? '−' : '+'}${kg(Math.abs(wDiff))} cm</span>` : ''}</div>${chartSVG()}</div>
    <div class="card">
      <h2 style="margin-bottom:4px">Nova medição</h2>
      <p class="muted small" style="margin-bottom:12px">1x por semana, mesmo dia e horário, em jejum. Cintura a cada 2 semanas, na altura do umbigo.</p>
      <form id="measureForm">
        <div class="form-row">
          <label>Data<input type="date" name="date" value="${todayStr()}" required></label>
          <label>Peso (kg)<input type="number" name="weight" step="0.1" inputmode="decimal" placeholder="${kg(cw)}"></label>
          <label>Cintura (cm)<input type="number" name="waist" step="0.5" inputmode="decimal" placeholder="opcional"></label>
        </div>
        <button class="btn primary full">Salvar medição</button>
      </form>
    </div>
    <div class="card">
      <h2 style="margin-bottom:8px">Histórico</h2>
      ${hist.length ? `<ul class="hist">${hist.map((m) => `<li><span class="d">${fmtBR(m.date)}</span><span class="w tnum">${m.weight ? kg(m.weight) + ' kg' : '–'}</span><span class="muted small tnum">${m.waist ? kg(m.waist) + ' cm' : ''}</span><button class="del" data-del="${m.date}" aria-label="Apagar">×</button></li>`).join('')}</ul>` : '<p class="muted small">Nenhuma medição ainda.</p>'}
    </div>
    <div class="card cardio-card">
      <h2>Exame de colesterol</h2>
      <p style="margin-top:6px">Refazer por volta de <strong>${fmtBR(chol)}/${parseD(chol).getFullYear()}</strong> (3 meses após o início) pra conferir se o plano está ajudando.</p>
    </div>`;
}

/* ---------- View: Plano ---------- */
function renderPlano() {
  const s = S.settings;
  $('#view-plano').innerHTML = `
    <div class="card">
      <details open><summary>Seus números</summary><ul>
        <li><strong>Calorias:</strong> 1.900 a 2.100 kcal por dia</li>
        <li><strong>Proteína:</strong> 140 a 160 g por dia</li>
        <li><strong>Carboidrato:</strong> 80 a 120 g, vindo de legumes, frutas, feijão e aveia</li>
        <li><strong>Fibra:</strong> 30 g ou mais</li>
        <li><strong>Ritmo:</strong> 0,5 a 1 kg por semana</li>
        <li><strong>Jejum 16:8:</strong> comer entre ${s.open} e ${s.close}. Fora disso, água, café preto e chá sem açúcar.</li>
      </ul></details>
      <details><summary>Cardápio exemplo</summary><ul>
        <li><strong>1ª refeição:</strong> 3 ovos mexidos no azeite + 1 fatia de pão integral, ou 2 colheres de aveia com iogurte natural e morango</li>
        <li><strong>Almoço:</strong> metade do prato com salada e legumes, 150 a 180 g de frango, peixe ou carne magra, 1 concha de feijão ou lentilha, azeite na salada</li>
        <li><strong>Lanche:</strong> iogurte natural ou whey + 1 punhado de castanhas</li>
        <li><strong>Jantar:</strong> omelete ou peixe com legumes refogados, ou sopa de legumes com frango desfiado</li>
      </ul></details>
      <details><summary>Colesterol: o que priorizar</summary>
        <p><strong>Aumentar:</strong> aveia, feijão, lentilha, peixe 2x por semana (sardinha, salmão), azeite, abacate, castanhas.</p>
        <p><strong>Reduzir:</strong> embutidos, bacon, manteiga em excesso, frituras, óleo de coco, doces.</p>
        <p class="muted small">Por isso a estratégia é low carb moderada e não a cetogênica raiz com muita gordura saturada.</p>
      </details>
      <details><summary>Estratégia dos doces</summary><ul>
        <li>Doce dos meninos num armário fechado ou caixa opaca, nunca na bancada</li>
        <li>Compre os doces que você não gosta tanto</li>
        <li>Doce planejado 1 a 2 vezes por semana, porção definida, sem culpa</li>
        <li>2 quadradinhos de chocolate 70% depois do almoço</li>
        <li>Escovar os dentes logo depois do jantar fecha a cozinha</li>
        <li>Na cafeteria: regra fixa antes do turno, tipo "só café, nada da vitrine"</li>
      </ul></details>
      <details><summary>Semana de treino</summary><ul>
        <li><strong>Seg, Qua, Sex:</strong> musculação (alterna A e B a cada semana)</li>
        <li><strong>Ter:</strong> caminhada rápida ou bike</li>
        <li><strong>Qui:</strong> esteira inclinada ou bike (intervalado leve a partir da semana 9)</li>
        <li><strong>Sáb:</strong> atividade livre com os filhos</li>
        <li><strong>Dom:</strong> descanso</li>
        <li>Meta extra: 8 a 10 mil passos por dia</li>
      </ul></details>
      <details><summary>Fases (12 semanas)</summary><ul>
        <li><strong>Semanas 1 e 2, adaptação:</strong> jejum de 12h subindo pra 16h, corta açúcar e farinha branca, treino leve</li>
        <li><strong>Semanas 3 a 8, aceleração:</strong> plano completo, mais carga, cardio de 40 a 45 min</li>
        <li><strong>Semanas 9 a 12, consolidação:</strong> ajusta porções se travar, intervalado na quinta</li>
      </ul></details>
    </div>
    <p class="muted small" style="margin:0 4px">Plano de referência. Vale validar com seu médico ou nutricionista, principalmente por causa do colesterol.</p>`;
}

/* ---------- Navegação ---------- */
const TITLES = { hoje: 'Hoje', treino: 'Treino', evolucao: 'Evolução', plano: 'Plano' };
let tab = 'hoje';
function render() {
  const now = new Date();
  const dt = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#hdrDate').textContent = dt.charAt(0).toUpperCase() + dt.slice(1);
  $('#hdrTitle').textContent = TITLES[tab];
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${tab}`; });
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ({ hoje: renderHoje, treino: renderTreino, evolucao: renderEvolucao, plano: renderPlano })[tab]();
}
function go(t) { tab = t; render(); window.scrollTo(0, 0); }

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (b) go(b.dataset.tab);
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.check) {
    day().checks[el.dataset.check] = el.checked; save();
    if (tab === 'hoje') render();
    if (el.checked && score(todayStr()) === 1) toast('Dia 100%! Mandou bem.');
  }
  if (el.dataset.load) {
    const v = el.value.trim(); const d = day();
    if (v) d.loads[el.dataset.load] = v; else delete d.loads[el.dataset.load];
    save();
  }
});

document.addEventListener('click', (e) => {
  const w = e.target.closest('[data-water]');
  if (w) {
    const d = day(); d.water = Math.max(0, d.water + Number(w.dataset.water));
    const hit = d.water >= S.settings.water;
    if (hit && !d.checks.agua) toast('Meta de água batida!');
    d.checks.agua = hit; save(); render(); return;
  }
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const ws = e.target.closest('[data-wsel]'); if (ws) { treinoSel = ws.dataset.wsel; render(); return; }
  const st = e.target.closest('[data-set]');
  if (st) {
    const d = day(), id = st.dataset.set, i = Number(st.dataset.i);
    const arr = d.sets[id] || [false, false, false];
    arr[i] = !arr[i]; d.sets[id] = arr; save();
    st.classList.toggle('done', arr[i]);
    if (arr[i]) { startRest(90); checkWorkoutDone(); }
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!confirm(`Apagar a medição de ${fmtBR(del.dataset.del)}?`)) return;
    S.measures = S.measures.filter((m) => m.date !== del.dataset.del); save(); render(); return;
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'measureForm') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const date = f.get('date'), weight = parseFloat(f.get('weight')), waist = parseFloat(f.get('waist'));
  if (!date || (!weight && !waist)) { toast('Preencha o peso ou a cintura'); return; }
  const prev = S.measures.find((m) => m.date === date) || { date, weight: null, waist: null };
  if (weight) prev.weight = weight;
  if (waist) prev.waist = waist;
  S.measures = S.measures.filter((m) => m.date !== date).concat(prev);
  save(); toast('Medição salva'); render();
});

$('#restAdd').addEventListener('click', () => { restEnd += 30000; tickRest(); });
$('#restStop').addEventListener('click', stopRest);

/* ---------- Configurações ---------- */
const dlg = $('#settings'), sf = $('#settingsForm');
$('#btnSettings').addEventListener('click', () => {
  for (const [k, v] of Object.entries(S.settings)) if (sf.elements[k]) sf.elements[k].value = v;
  dlg.showModal();
});
dlg.addEventListener('close', () => {
  if (dlg.returnValue !== 'save') return;
  const f = sf.elements;
  if (f.open.value >= f.close.value) { toast('O horário de abrir precisa ser antes do de fechar'); return; }
  const oldStart = S.settings.startWeight;
  S.settings = {
    start: f.start.value, startWeight: parseFloat(f.startWeight.value), goal: parseFloat(f.goal.value),
    height: parseFloat(f.height.value), open: f.open.value, close: f.close.value, water: parseInt(f.water.value, 10)
  };
  // Mantém a primeira pesagem coerente com o peso inicial
  const first = [...S.measures].sort((a, b) => a.date.localeCompare(b.date))[0];
  if (first && first.weight === oldStart) { first.weight = S.settings.startWeight; first.date = S.settings.start < first.date ? S.settings.start : first.date; }
  save(); toast('Configurações salvas'); render();
});
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `projeto-leve-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#fileImport').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.settings || !data.days) throw new Error('formato');
    if (!confirm('Substituir os dados deste aparelho pelo backup?')) return;
    S = { ...defaults(), ...data }; save(); dlg.close(); toast('Backup importado'); render();
  } catch (err) { toast('Arquivo de backup inválido'); }
  e.target.value = '';
});
$('#btnReset').addEventListener('click', () => {
  if (!confirm('Apagar TODOS os dados? Isso não pode ser desfeito.')) return;
  S = defaults(); save(); dlg.close(); toast('Dados apagados'); render();
});

/* ---------- Instalação ---------- */
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let deferred;
function dismissed() { try { return localStorage.getItem('leve.noinstall') === '1'; } catch (e) { return false; } }
function showInstall(html) {
  if (standalone || dismissed()) return;
  const b = $('#installBanner'); b.innerHTML = html + '<button class="x" aria-label="Fechar">×</button>'; b.hidden = false;
  b.querySelector('.x').onclick = () => { b.hidden = true; try { localStorage.setItem('leve.noinstall', '1'); } catch (e) { /* ok */ } };
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferred = e;
  showInstall('<span style="flex:1">Instale o app na tela inicial pra abrir em tela cheia e usar offline.</span><button class="btn primary" id="btnInstall">Instalar</button>');
  $('#btnInstall').onclick = async () => { deferred.prompt(); await deferred.userChoice; $('#installBanner').hidden = true; };
});
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) {
  showInstall('<span style="flex:1">Pra instalar: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</span>');
}

/* ---------- Início ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
render();
setInterval(() => { if (tab === 'hoje') renderFast(); }, 30000);
let lastDay = todayStr();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (todayStr() !== lastDay) { lastDay = todayStr(); treinoSel = null; } render(); }
});
