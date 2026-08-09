import { BENEFIT_REQUEST, HELPER_OVERASK, exposure } from './scenario.mjs';

function el(tag, props = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) n.append(c);
  return n;
}

function mrz(passport) {
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '<');
  const pad = (s) => (s + '<'.repeat(44)).slice(0, 44);
  const nameParts = norm(passport.meta('full_name')?.value || 'ANA ROJAS').split('<').filter(Boolean);
  const given = nameParts[0] || 'ANA';
  const surname = nameParts.slice(1).join('<') || 'ROJAS';
  const line1 = pad('P<CHL' + surname + '<<' + given);
  const dob = (passport.meta('date_of_birth')?.value || '1979-04-11').replace(/[^0-9]/g, '').slice(2, 8) || '790411';
  const docno = (passport.meta('national_id')?.value || '123456789').replace(/[^0-9]/g, '').slice(0, 9);
  const line2 = pad(pad(docno).slice(0, 10) + 'CHL' + dob + '4F310811' + '9');
  return line1 + '\n' + line2;
}

function stampEl(kind, label) {
  return el('span', { class: 'stamp ' + kind, text: label });
}

export function mount(root, { world, i18n }) {
  const t = (k, v) => i18n.t(k, v);
  const requested = new Set(BENEFIT_REQUEST.fields);
  const selected = new Set(BENEFIT_REQUEST.fields);
  const cardEls = new Map();
  let token = null;
  let granted = false;
  let grantedFields = new Set();

  root.replaceChildren();

  function fieldStateText(key) {
    if (!requested.has(key)) return t('notRequested');
    if (granted) return grantedFields.has(key) ? t('shared') : t('withheld');
    return selected.has(key) ? t('willShare') : t('tapToShare');
  }
  function fieldClass(key) {
    const parts = ['field'];
    parts.push(requested.has(key) ? 'requested' : 'notrequested');
    if (granted) { if (grantedFields.has(key)) parts.push('granted'); }
    else if (selected.has(key)) parts.push('selected');
    return parts.join(' ');
  }
  function updateCard(key) {
    const card = cardEls.get(key);
    if (!card) return;
    card.className = fieldClass(key);
    card.querySelector('.fstate').textContent = fieldStateText(key);
  }

  const header = el('header', { class: 'doc-head' }, [
    el('div', {}, [
      el('h1', { text: t('title'), id: 'title' }),
      el('div', { class: 'serial', text: 'N° SC-26-0847' }),
      el('div', { class: 'docclass', text: t('docClass') }),
      el('p', { class: 'tagline', text: t('tagline') }),
      el('p', { class: 'protonote', text: t('prototypeNote') }),
    ]),
    el('div', {}, [
      el('button', { id: 'lang', text: t('langToggle'), onclick: () => { i18n.setLang(i18n.lang === 'en' ? 'es' : 'en'); mount(root, { world, i18n }); } }),
    ]),
  ]);

  const passportPanel = el('section', { class: 'panel', id: 'passport' }, [
    el('h2', { text: t('passportHeading') }),
    el('p', { class: 'note', text: t('passportNote') }),
  ]);
  const fields = el('div', { class: 'fields' });
  for (const f of world.passport.list()) {
    const card = el('div', { class: fieldClass(f.key), id: 'pf-' + f.key }, [
      el('div', { class: 'frow' }, [el('span', { class: 'dot ' + f.sensitivity }), el('span', { class: 'lab', text: f.label })]),
      el('div', { class: 'k', text: f.key }),
      el('div', { class: 'fstate', text: fieldStateText(f.key) }),
    ]);
    if (requested.has(f.key)) {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const toggle = () => {
        if (granted) return;
        if (selected.has(f.key)) selected.delete(f.key); else selected.add(f.key);
        updateCard(f.key);
        drawMeter();
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }
    cardEls.set(f.key, card);
    fields.append(card);
  }
  passportPanel.append(fields, el('div', { class: 'mrz', text: mrz(world.passport) }));

  const reqPanel = el('section', { class: 'panel pass', id: 'request' }, [el('h2', { text: t('requestHeading') })]);
  const requestedLabels = BENEFIT_REQUEST.fields.map((k) => world.passport.meta(k).label).join(', ');
  reqPanel.append(
    el('p', { class: 'agentline' }, [el('strong', { text: BENEFIT_REQUEST.agent }), el('span', { text: ' · ' + BENEFIT_REQUEST.task })]),
    el('p', { class: 'reqsummary' }, [el('span', { text: t('requests') + ': ' + requestedLabels }), el('span', { class: 'reqmeta', text: BENEFIT_REQUEST.purpose + ' · 30 min' })]),
    el('p', { class: 'note', text: t('chooseHint') }),
  );
  const meter = el('div', { class: 'meter' }, [el('span', { id: 'meterbar' })]);
  const meterLabel = el('p', { class: 'meterlabel', id: 'meterlabel' });
  const stamps = el('div', { class: 'stamps', id: 'stamps' });

  function drawMeter() {
    const total = world.passport.count();
    const n = granted ? grantedFields.size : selected.size;
    root.querySelector('#meterbar').style.width = Math.round((n / total) * 100) + '%';
    root.querySelector('#meterlabel').textContent = t('minimization', { n, total });
  }

  const grantBtn = el('button', { class: 'primary', id: 'grant', text: t('grant') });
  const denyBtn = el('button', { id: 'deny', text: t('deny') });
  reqPanel.append(meter, meterLabel, stamps, el('div', { class: 'controls' }, [grantBtn, denyBtn]));

  const feedPanel = el('section', { class: 'panel', id: 'receipts' }, [el('h2', { text: t('receiptsHeading') })]);
  const feed = el('div', { class: 'feed', id: 'feed' });
  const logNote = el('div', { class: 'lognote', text: t('logNote') });
  const chain = el('div', { class: 'chain', id: 'chain' });
  const revokeBtn = el('button', { class: 'danger', id: 'revoke', text: t('revoke'), disabled: 'true' });
  const proveBox = el('div', { class: 'prove', id: 'prove' });
  const honesty = el('div', { class: 'honesty', id: 'honesty' });
  feedPanel.append(feed, logNote, chain, el('div', { class: 'controls' }, [revokeBtn]), proveBox, honesty);

  async function refreshFeed() {
    feed.replaceChildren();
    for (const e of world.ledger.all()) {
      const cls = e.decision === 'ALLOW' ? 'allow' : 'deny';
      feed.append(el('div', { class: 'receipt ' + cls }, [
        el('span', { class: 'seq', text: '#' + e.seq + '  ' }),
        el('span', { text: e.actor + ' · ' + e.action + ' ' + e.field + '  ' }),
        el('span', { class: 'badge ' + cls, text: e.decision + (e.reason ? ' · ' + e.reason : '') }),
        e.decision === 'ALLOW'
          ? el('div', { class: 'val', text: '→ ' + e.redacted + '   #' + e.valueHash.slice(0, 8) })
          : el('div', { class: 'val', text: e.reason === 'out-of-scope' ? t('overAskFlag') : '' }),
      ]));
    }
    const v = await world.ledger.verifyChain();
    chain.textContent = v.ok ? '✓ ' + t('chainOk') : '✗ ' + t('chainBroken');
    feed.scrollTop = feed.scrollHeight;
  }

  grantBtn.addEventListener('click', async () => {
    if (selected.size === 0) return;
    token = await world.mintGrant([...selected], BENEFIT_REQUEST.ttlMs);
    granted = true;
    grantedFields = new Set(selected);
    for (const key of cardEls.keys()) updateCard(key);
    grantBtn.disabled = true; denyBtn.disabled = true; revokeBtn.disabled = false;
    stamps.append(stampEl('granted', t('stampGranted')));
    drawMeter();
    for (const f of BENEFIT_REQUEST.fields) {
      if (grantedFields.has(f)) await world.broker.read(token, f, BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent);
    }
    await world.broker.read(token, HELPER_OVERASK.field, HELPER_OVERASK.purpose, HELPER_OVERASK.agent);
    await refreshFeed();
  });

  revokeBtn.addEventListener('click', async () => {
    world.auth.revoke(token.id);
    revokeBtn.disabled = true;
    stamps.append(stampEl('revoked', t('stampRevoked')));
    const probe = await world.broker.read(token, 'diagnosis_code', BENEFIT_REQUEST.purpose, BENEFIT_REQUEST.agent);
    proveBox.classList.add('dead');
    proveBox.replaceChildren(
      el('strong', { text: t('proveHeading') }),
      el('div', { text: t('proveRun') }),
      el('div', { class: 'verdict', text: probe.ok ? '??' : t('proveDenied') }),
    );
    const ex = exposure(world.ledger, world.passport);
    honesty.replaceChildren(
      el('strong', { text: t('honestyHeading') }),
      ...ex.sensitiveFieldsRead.map((f) => el('div', { text: t('honestyLine', { field: world.passport.meta(f).label }) })),
      el('div', { text: t('exposureLine', { count: ex.count, minutes: 1 }) }),
    );
    await refreshFeed();
  });

  denyBtn.addEventListener('click', () => {
    grantBtn.disabled = true; denyBtn.disabled = true;
    stamps.append(stampEl('denied', t('stampDenied')));
  });

  root.append(header, el('div', { class: 'grid' }, [
    el('div', { class: 'col' }, [passportPanel]),
    el('div', { class: 'col' }, [reqPanel, feedPanel]),
  ]));
  drawMeter();
}
