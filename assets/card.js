/* RatelyPH card page.
   URL /k7x2m -> asks Supabase for card "k7x2m" (rpc get_card) -> renders it.
   All text is inserted with textContent, never innerHTML, so customer data can't inject markup. */
(function () {
  'use strict';

  var cfg = window.RATELY || {};
  var root = document.documentElement;
  var app = document.getElementById('app');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── tiny helpers ───────── */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== '') n.textContent = text;
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  var ICON = {
    arrow: 'M5 12h14M13 6l6 6-6 6',
    up: 'M7 17L17 7M8 7h9v9',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    copy: 'M8 3h8v4H8zM16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    text: 'M4 5h16v11H9l-5 4z',
    mail: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
    pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z',
    addUser: 'M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6',
    // socials
    facebook: 'M9 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM3 19a6 6 0 0 1 12 0M17 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM16 14.5a5 5 0 0 1 5 4.5',
    instagram: 'M6 7h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3zM12 10a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM8.5 7l1.2-2.5h4.6L15.5 7',
    tiktok: 'M9 18V6l10-2v12M7 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM17 13.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
    messenger: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM8.5 12h.01M12 12h.01M15.5 12h.01',
    whatsapp: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z',
    viber: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z',
    telegram: 'M21 4L3 11l6 2.5L11 20l3-4.5 4.5 3.5zM9 13.5L21 4',
    youtube: 'M5 6h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zM10 9.5v5l4.5-2.5z',
    x: 'M5 5l14 14M19 5L5 19',
    linkedin: 'M4 4h16v16H4zM8 10v7M8 7h.01M12 17v-7M12 13a3 3 0 0 1 6 0v4',
    website: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
  };
  var SOCIAL_LABEL = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', messenger: 'Messenger', whatsapp: 'WhatsApp', viber: 'Viber', telegram: 'Telegram', youtube: 'YouTube', x: 'X', linkedin: 'LinkedIn', website: 'Website', other: 'Link' };

  function icon(name, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'i' + (cls ? ' ' + cls : ''));
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICON[name] || ICON.link);
    s.appendChild(p);
    return s;
  }
  function lead(name) { return add(el('span', 'lead'), icon(name)); }

  /* Only http(s) links are allowed from customer data. */
  function safeUrl(u) {
    if (!u) return null;
    u = String(u).trim();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    try {
      var x = new URL(u);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null;
    } catch (e) { return null; }
  }
  /* "0917 123 4567" -> "+639171234567" (PH-first, accepts +country numbers as typed). */
  function e164(raw) {
    var s = String(raw || '').trim();
    var plus = s.charAt(0) === '+';
    var d = s.replace(/\D/g, '');
    if (!d) return '';
    if (plus) return '+' + d;
    if (d.indexOf('00') === 0) return '+' + d.slice(2);
    if (d.charAt(0) === '0') return '+63' + d.slice(1);
    if (d.indexOf('63') === 0) return '+' + d;
    if (d.length === 10 && d.charAt(0) === '9') return '+63' + d;
    return '+' + d;
  }
  function initialsOf(name) {
    var w = String(name || '').trim().split(/\s+/).filter(Boolean);
    return ((w[0] || '?').charAt(0) + (w.length > 1 ? w[1].charAt(0) : '')).toUpperCase();
  }

  /* ───────── toast + copy ───────── */
  var toast = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  var toastTimer;
  function say(msg) {
    toastText.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('on'); }, 1100);
  }
  function fallbackCopy(text) {
    try {
      var t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t);
      t.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(t);
      return ok;
    } catch (e) { return false; }
  }
  function mark(node) {
    node.classList.remove('copied');
    void node.offsetWidth;
    node.classList.add('copied');
    clearTimeout(node._t);
    node._t = setTimeout(function () { node.classList.remove('copied'); }, 1100);
  }
  function copy(text, node) {
    function done(ok) { if (ok) { mark(node); say('Copied'); } else { say('Could not copy'); } }
    if (fallbackCopy(text)) { done(true); return; }
    try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); }
    catch (e) { done(false); }
  }
  /* One tap copies right away; tel: / mailto: links still open afterwards. */
  document.addEventListener('click', function (e) {
    var n = e.target.closest('[data-copy]');
    if (n) copy(n.getAttribute('data-copy'), n);
  });
  if (!reduce) {
    document.addEventListener('pointerdown', function (e) {
      var host = e.target.closest('.rip');
      if (!host) return;
      var r = host.getBoundingClientRect();
      var s = el('span', 'ripple');
      s.style.left = (e.clientX - r.left) + 'px';
      s.style.top = (e.clientY - r.top) + 'px';
      host.appendChild(s);
      s.addEventListener('animationend', function () { s.remove(); });
    });
  }
  document.addEventListener('pointermove', function (e) {
    var g = e.target.closest('.glass');
    if (g) {
      var r = g.getBoundingClientRect();
      g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      g.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
    if (!reduce) {
      root.style.setProperty('--px', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty('--py', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    }
  });

  /* ───────── vCard (.vcf) ───────── */
  function vEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
  function vFold(line) {
    var out = [];
    while (line.length > 60) { out.push(line.slice(0, 60)); line = ' ' + line.slice(60); }
    out.push(line);
    return out.join('\r\n');
  }
  function buildVcf(p) {
    var L = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vEsc(p.name), 'N:' + vEsc(p.name) + ';;;;', 'ORG:' + vEsc(p.name), 'X-ABShowAs:COMPANY'];
    if (p.phone) L.push('TEL;TYPE=CELL,VOICE:' + e164(p.phone));
    if (p.email) L.push('EMAIL;TYPE=INTERNET:' + vEsc(p.email));
    if (p.location) L.push('ADR;TYPE=WORK:;;;' + vEsc(p.location) + ';;;');
    if (p.tagline) L.push('NOTE:' + vEsc(p.tagline));
    L.push('URL:' + vEsc(location.href.split('#')[0]));
    (p.socials || []).forEach(function (s) {
      var u = safeUrl(s && s.url);
      if (u) L.push('URL;TYPE=' + vEsc((s.label || SOCIAL_LABEL[s.type] || 'Link')).replace(/[^A-Za-z0-9-]/g, '') + ':' + vEsc(u));
    });
    L.push('END:VCARD');
    return L.map(vFold).join('\r\n') + '\r\n';
  }
  function downloadVcf(p) {
    var blob = new Blob([buildVcf(p)], { type: 'text/vcard;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'contact') + '.vcf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    say('Contact downloaded');
  }

  /* ───────── theme ───────── */
  function pick(v, allowed, fallback) { return allowed.indexOf(v) > -1 ? v : fallback; }
  function applyTheme(t) {
    t = t || {};
    var scheme = pick(t.scheme, ['auto', 'dark', 'light', 'contrast', 'paper'], 'auto');
    root.setAttribute('data-scheme', scheme);
    root.setAttribute('data-font', pick(t.font, ['grotesk', 'serif', 'mono'], 'grotesk'));
    root.setAttribute('data-bg', pick(t.bg, ['orbs', 'grid', 'none'], 'orbs'));
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-ink');
    if (/^#[0-9a-f]{6}$/i.test(t.accent || '')) {
      var n = parseInt(t.accent.slice(1), 16);
      var lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      root.style.setProperty('--accent', t.accent);
      root.style.setProperty('--accent-ink', lum > 0.6 ? '#0b0b0b' : '#ffffff');
    }
  }

  /* ───────── views ───────── */
  var WAVE = '<circle cx="12" cy="18" r="1" style="fill:var(--fg)"/><path d="M8.5 14.5a5 5 0 0 1 7 0"/><path d="M5.5 11.5a9 9 0 0 1 13 0"/><path d="M2.5 8.5a13 13 0 0 1 19 0"/>';
  var WAVE_CHIP = '<circle cx="12" cy="18" r="1.3" style="fill:var(--accent-ink);stroke:none"/><path d="M8.5 14.5a5 5 0 0 1 7 0"/><path d="M5.5 11.5a9 9 0 0 1 13 0"/><path d="M2.5 8.5a13 13 0 0 1 19 0"/>';
  function waveMark() {
    var m = el('span', 'mark');
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = '<svg viewBox="0 0 24 24">' + WAVE + '</svg>'; // static markup only
    return m;
  }
  function stateView(title, msg, loading) {
    app.textContent = '';
    var box = el('div', 'glass');
    add(box, waveMark(), el('h1', '', title), msg ? el('p', '', msg) : null);
    var wrap = add(el('main', 'page state' + (loading ? ' skeleton' : '')), box);
    app.appendChild(wrap);
  }

  function rowLink(o) {
    var wrap = el('div', 'row');
    var a = el(o.href ? 'a' : 'button', 'row-main rip');
    if (o.href) {
      a.href = o.href;
      if (o.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    } else { a.type = 'button'; }
    if (o.copy) a.setAttribute('data-copy', o.copy);
    var tail = el('span', 'tail');
    if (o.copy) add(tail, icon('copy', 'a'), icon('check', 'c'));
    else add(tail, icon(o.external ? 'up' : 'arrow', 'a' + (o.external ? ' up' : '')));
    add(a, lead(o.icon), add(el('span', 'txt'), el('span', 't', o.title), el('span', 's' + (o.mono ? ' mono' : ''), o.sub)), tail);
    if (o.onclick) a.addEventListener('click', o.onclick);
    wrap.appendChild(a);
    return wrap;
  }

  function cardView(p) {
    app.textContent = '';
    document.title = p.name + ' · RatelyPH';
    var n = 0;
    function step(node) { node.classList.add('in'); node.style.setProperty('--i', n++); return node; }

    var page = el('main', 'page');

    /* top bar */
    var top = step(el('div', 'top'));
    var pill = el('span', 'pill glass');
    var chip = el('span', 'nfc');
    chip.setAttribute('aria-hidden', 'true');
    chip.innerHTML = '<svg viewBox="0 0 24 24">' + WAVE_CHIP + '</svg>'; // static markup only
    add(pill, chip, el('span', 'pill-text', 'Digital card'));
    top.appendChild(pill);
    page.appendChild(top);

    /* hero */
    var hero = el('header', 'hero');
    var av = step(el('div', 'avatar-wrap'));
    av.setAttribute('aria-hidden', 'true');
    var avatar = el('div', 'avatar');
    var photo = safeUrl(p.photo_url);
    if (photo) {
      var img = el('img');
      img.src = photo; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); avatar.textContent = p.initials || initialsOf(p.name); });
      avatar.appendChild(img);
    } else { avatar.textContent = (p.initials || initialsOf(p.name)).toUpperCase(); }
    add(av, el('span', 'pulse'), el('span', 'pulse p2'), el('span', 'ring'), avatar);
    hero.appendChild(av);
    hero.appendChild(step(el('h1', '', p.name)));
    if (p.handle || p.location) {
      var meta = step(el('div', 'meta'));
      if (p.handle) meta.appendChild(el('span', '', p.handle));
      if (p.location) meta.appendChild(el('span', '', p.location));
      hero.appendChild(meta);
    }
    if (p.tagline) hero.appendChild(step(el('p', 'tagline', p.tagline)));
    page.appendChild(hero);

    /* actions */
    var actions = el('section', 'actions');
    actions.setAttribute('aria-label', 'Contact actions');
    var tel = e164(p.phone);
    if (tel) {
      var cw = step(el('div'));
      var call = el('a', 'call-main rip');
      call.href = 'tel:' + tel;
      call.setAttribute('data-copy', p.phone);
      add(call, lead('phone'),
        add(el('span', 'call-text'), el('span', 'k', 'Call'), el('span', 'n', p.phone)),
        add(el('span', 'tail'), icon('arrow', 'a'), icon('check', 'c')));
      cw.appendChild(call);
      actions.appendChild(cw);
    }
    var list = step(el('div', 'list glass'));
    if (tel) list.appendChild(rowLink({ href: 'sms:' + tel, icon: 'text', title: 'Send a text', sub: 'Send an SMS' }));
    if (p.email) list.appendChild(rowLink({ href: 'mailto:' + p.email, copy: p.email, icon: 'mail', title: 'Email', sub: p.email, mono: true }));
    var maps = safeUrl(p.maps_url);
    if (maps) list.appendChild(rowLink({ href: maps, external: true, icon: 'pin', title: 'Get directions', sub: 'Find us on Google Maps' }));
    var review = safeUrl(p.review_url);
    if (review) list.appendChild(rowLink({ href: review, external: true, icon: 'star', title: 'Leave a review', sub: 'Rate us on Google in one tap' }));
    list.appendChild(rowLink({ icon: 'addUser', title: 'Save contact', sub: 'Download to your phone contacts', onclick: function () { downloadVcf(p); } }));
    actions.appendChild(list);
    page.appendChild(actions);

    /* socials */
    var socials = (Array.isArray(p.socials) ? p.socials : []).filter(function (s) { return s && safeUrl(s.url); });
    if (socials.length) {
      var sec = el('section', 'in reveal');
      sec.setAttribute('aria-labelledby', 'follow-label');
      var h = el('h2', 'label', 'Follow'); h.id = 'follow-label';
      var grid = el('div', 'social');
      socials.forEach(function (s) {
        var type = SOCIAL_LABEL[s.type] ? s.type : 'other';
        var a = el('a', 'soc glass rip');
        a.href = safeUrl(s.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
        add(a, lead(type), add(el('span', 'txt'), el('span', 't', s.label || SOCIAL_LABEL[type]), s.handle ? el('span', 's', s.handle) : null));
        grid.appendChild(a);
      });
      add(sec, h, grid);
      page.appendChild(sec);
    }

    /* services */
    var services = (Array.isArray(p.services) ? p.services : []).filter(function (s) { return s && s.title; });
    if (services.length) {
      var ss = el('section', 'in reveal');
      ss.setAttribute('aria-labelledby', 'svc-label');
      var h2 = el('h2', 'label', 'Services'); h2.id = 'svc-label';
      var ul = el('ul', 'services');
      services.forEach(function (s) {
        ul.appendChild(add(el('li', 'svc glass'), el('span', 't', s.title), s.desc ? el('span', 's', s.desc) : null));
      });
      add(ss, h2, ul);
      page.appendChild(ss);
    }

    /* footer */
    var foot = el('footer', 'foot in reveal');
    var ticker = el('div', 'ticker'); ticker.setAttribute('aria-hidden', 'true');
    var track = el('div', 'track');
    for (var k = 0; k < 8; k++) track.appendChild(el('span', '', 'TAP · RATE · CONNECT ·'));
    ticker.appendChild(track);
    add(foot, ticker, el('b', '', 'RatelyPH'));
    page.appendChild(foot);

    app.appendChild(page);
  }

  /* ───────── boot ───────── */
  var RESERVED = ['admin'];
  function currentCode() {
    var q = new URLSearchParams(location.search).get('c'); // handy for local testing: /?c=k7x2m
    var c = (q || location.pathname).replace(/^\/+|\/+$/g, '').toLowerCase();
    return c;
  }

  function load() {
    var code = currentCode();
    if (!code) { stateView('RatelyPH', 'Tap an NFC card to open a profile.'); return; }
    if (!/^[a-z0-9]{5}$/.test(code) || RESERVED.indexOf(code) > -1) { stateView('Card not found', 'This link doesn’t match any RatelyPH card.'); return; }
    if (!cfg.SUPABASE_URL || /YOUR-PROJECT/.test(cfg.SUPABASE_URL)) { stateView('Not configured', 'Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/config.js.'); return; }

    stateView('Loading…', '', true);
    fetch(cfg.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/get_card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ p_code: code })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      if (!d) { stateView('Card not found', 'This card doesn’t exist or has been switched off.'); return; }
      if (d.status === 'unassigned') { stateView('Card not activated yet', 'This RatelyPH card hasn’t been assigned to anyone yet.'); return; }
      applyTheme(d.theme);
      cardView(d.profile);
    }).catch(function () {
      stateView('Can’t load this card', 'Check your connection and try again.');
    });
  }
  load();
})();
