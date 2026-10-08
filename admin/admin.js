/* RatelyPH admin: login (Supabase Auth), customers (profiles) and NFC tags.
   Security lives in the database (RLS + is_admin()), not here: even if someone
   edits this file in their browser, they can't read or write without an admin session. */
(function () {
  'use strict';

  var cfg = window.RATELY || {};
  var app = document.getElementById('app');
  if (!cfg.SUPABASE_URL || /YOUR-PROJECT/.test(cfg.SUPABASE_URL)) {
    app.innerHTML = '<div class="glass card login"><h2>Not configured</h2><p class="muted">Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/config.js.</p></div>';
    return;
  }
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  var SOCIAL_TYPES = ['facebook', 'instagram', 'tiktok', 'messenger', 'whatsapp', 'viber', 'telegram', 'youtube', 'x', 'linkedin', 'website', 'other'];
  var THEME_OPTS = {
    scheme: [['auto', 'Auto (follows phone)'], ['dark', 'Dark'], ['light', 'Light'], ['contrast', 'High contrast B/W'], ['paper', 'Paper']],
    font: [['grotesk', 'Grotesk (modern)'], ['serif', 'Serif (elegant)'], ['mono', 'Mono (techy)']],
    layout: [['left', 'Left aligned'], ['center', 'Centered']],
    bg: [['orbs', 'Floating orbs'], ['grid', 'Moving grid'], ['none', 'Plain']]
  };

  var S = { user: null, profiles: [], tags: [], view: 'customers', draft: null, busy: false };

  /* ───────── helpers ───────── */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || app).querySelectorAll(sel)); }
  var toastTimer;
  function say(msg, bad) {
    var t = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, bad ? 3500 : 1400);
  }
  function fail(e) { console.error(e); say((e && e.message) || 'Something went wrong', true); }
  function tagUrl(code) { return location.origin + '/' + code; }
  function profileName(id) { var p = S.profiles.filter(function (x) { return x.id === id; })[0]; return p ? p.name : ''; }
  function tagsOf(pid) { return S.tags.filter(function (t) { return t.profile_id === pid; }); }
  function copyText(text) {
    function ok() { say('Copied'); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function () { say('Could not copy', true); });
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); ok(); }
  }
  function opts(list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }

  /* ───────── data ───────── */
  function loadAll() {
    return Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('nfc_tags').select('*').order('created_at', { ascending: false })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      if (r[1].error) throw r[1].error;
      S.profiles = r[0].data; S.tags = r[1].data;
    });
  }
  function reload() { return loadAll().then(render); }

  /* ───────── boot / auth ───────── */
  function boot() {
    sb.auth.getSession().then(function (r) {
      if (r.data.session) return enter(r.data.session.user);
      renderLogin();
    });
  }
  function enter(user) {
    return sb.rpc('is_admin').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) {
        return sb.auth.signOut().then(function () { renderLogin('This account is not an admin.'); });
      }
      S.user = user;
      return loadAll().then(render);
    }).catch(function (e) { fail(e); renderLogin(e.message); });
  }

  function renderLogin(msg) {
    S.user = null;
    app.innerHTML =
      '<form class="glass card login" id="login" autocomplete="on">' +
      '<h1>RatelyPH Admin</h1><p class="muted">Sign in to manage customers and NFC cards.</p>' +
      '<label class="f">Email<input type="email" name="email" autocomplete="username" required></label>' +
      '<label class="f">Password<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<div class="err" id="login-err" role="alert">' + esc(msg || '') + '</div>' +
      '<button class="btn primary" type="submit">Sign in</button></form>';
    $('#login').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = $('button', f);
      btn.disabled = true;
      sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value }).then(function (r) {
        if (r.error) { $('#login-err').textContent = r.error.message; btn.disabled = false; return; }
        return enter(r.data.user);
      });
    });
  }

  /* ───────── shell ───────── */
  function shell(inner) {
    return '<div class="bar"><div class="who"><h1>RatelyPH Admin</h1></div>' +
      '<div class="who"><span class="muted">' + esc(S.user && S.user.email) + '</span><button class="btn sm" data-act="logout">Sign out</button></div></div>' +
      (S.draft ? '' : '<div class="tabs glass" role="tablist">' +
        '<button class="tab" role="tab" data-act="tab" data-v="customers" aria-selected="' + (S.view === 'customers') + '">Customers (' + S.profiles.length + ')</button>' +
        '<button class="tab" role="tab" data-act="tab" data-v="tags" aria-selected="' + (S.view === 'tags') + '">NFC tags (' + S.tags.length + ')</button></div>') +
      inner;
  }
  function render() {
    if (S.draft) return renderEditor();
    app.innerHTML = shell(S.view === 'tags' ? tagsHtml() : customersHtml());
  }

  /* ───────── customers list ───────── */
  function customersHtml() {
    var h = '<div class="bar"><h2>Customers</h2><button class="btn primary" data-act="new">+ New customer</button></div>';
    if (!S.profiles.length) return h + '<div class="glass empty">No customers yet. Add your first one.</div>';
    return h + S.profiles.map(function (p) {
      var chips = tagsOf(p.id).map(function (t) {
        return '<a class="chip' + (t.active ? '' : ' off') + '" href="' + esc(tagUrl(t.code)) + '" target="_blank" rel="noopener">/' + esc(t.code) + '</a>';
      }).join('') || '<span class="muted">no NFC tag assigned</span>';
      return '<div class="glass item"><div class="grow"><strong>' + esc(p.name) + '</strong><span class="muted">' + esc(p.handle || '') + ' ' + esc(p.location || '') + '</span></div>' +
        '<div class="chips">' + chips + '</div>' +
        '<button class="btn sm" data-act="edit" data-id="' + esc(p.id) + '">Edit</button></div>';
    }).join('');
  }

  /* ───────── editor ───────── */
  function blankProfile() {
    return { id: null, name: '', handle: '', location: '', tagline: '', initials: '', photo_url: '', phone: '', email: '', maps_url: '', review_url: '', notes: '',
      socials: [], services: [], theme: { scheme: 'auto', font: 'grotesk', layout: 'left', bg: 'orbs' } };
  }
  function socialRow(s) {
    return '<div class="rep-row soc-row">' +
      '<select data-k="type">' + opts(SOCIAL_TYPES.map(function (t) { return [t, t]; }), s.type) + '</select>' +
      '<input data-k="label" placeholder="Label (optional)" value="' + esc(s.label) + '">' +
      '<input data-k="handle" placeholder="@handle" value="' + esc(s.handle) + '">' +
      '<input data-k="url" placeholder="https://…" value="' + esc(s.url) + '">' +
      '<button type="button" class="btn sm danger" data-act="rm-row" aria-label="Remove">✕</button></div>';
  }
  function serviceRow(s) {
    return '<div class="rep-row two svc-row">' +
      '<input data-k="title" placeholder="Service name" value="' + esc(s.title) + '">' +
      '<input data-k="desc" placeholder="Short description" value="' + esc(s.desc) + '">' +
      '<button type="button" class="btn sm danger" data-act="rm-row" aria-label="Remove">✕</button></div>';
  }
  function field(label, name, val, extra) {
    return '<label class="f">' + label + '<input name="' + name + '" value="' + esc(val) + '" ' + (extra || '') + '></label>';
  }
  function renderEditor() {
    var d = S.draft, th = d.theme || {};
    var assigned = d.id ? tagsOf(d.id) : [];
    var free = S.tags.filter(function (t) { return !t.profile_id; });
    var tagBlock = '';
    if (d.id) {
      tagBlock = '<section class="glass card"><h3>NFC cards for this customer</h3>' +
        (assigned.length ? assigned.map(function (t) {
          return '<div class="tagrow glass" style="padding:10px 14px"><a class="code" href="' + esc(tagUrl(t.code)) + '" target="_blank" rel="noopener">/' + esc(t.code) + '</a>' +
            '<span class="meta2">' + t.scan_count + ' scans' + (t.active ? '' : ' · OFF') + '</span><span class="muted">' + esc(t.label || '') + '</span><span></span>' +
            '<span class="acts"><button type="button" class="btn sm" data-act="copy-url" data-code="' + esc(t.code) + '">Copy link</button>' +
            '<button type="button" class="btn sm" data-act="unassign" data-code="' + esc(t.code) + '">Unassign</button></span></div>';
        }).join('') : '<p class="muted">No NFC card assigned yet.</p>') +
        '<div class="bar"><button type="button" class="btn" data-act="add-tag">+ Generate new tag</button>' +
        (free.length ? '<span class="sw"><select id="free-tag" style="width:auto">' + free.map(function (t) { return '<option>' + esc(t.code) + '</option>'; }).join('') + '</select>' +
          '<button type="button" class="btn" data-act="assign-free">Assign existing tag</button></span>' : '') + '</div></section>';
    } else {
      tagBlock = '<section class="glass card"><label class="sw"><input type="checkbox" id="mk-tag" checked> Generate an NFC tag (random code) for this customer when saving</label></section>';
    }

    app.innerHTML = shell(
      '<div class="bar"><h2>' + (d.id ? 'Edit customer' : 'New customer') + '</h2><button class="btn" data-act="back">← Back</button></div>' +
      '<form id="editor" class="admin" style="gap:18px" novalidate>' +
      '<section class="glass card"><h3>Profile</h3><div class="grid2">' +
      field('Name / business *', 'name', d.name, 'required maxlength="120"') + field('Handle', 'handle', d.handle, 'placeholder="@maritesbakes"') +
      field('Location', 'location', d.location) + field('Initials (avatar)', 'initials', d.initials, 'maxlength="3" placeholder="auto"') +
      field('Mobile number', 'phone', d.phone, 'inputmode="tel" placeholder="0917 123 4567"') + field('Email', 'email', d.email, 'type="email"') +
      field('Google Maps link', 'maps_url', d.maps_url, 'placeholder="https://maps.app.goo.gl/…"') + field('Review link', 'review_url', d.review_url, 'placeholder="https://g.page/r/…/review"') +
      field('Photo URL (optional)', 'photo_url', d.photo_url, 'placeholder="https://…"') +
      '<label class="f">Tagline<input name="tagline" value="' + esc(d.tagline) + '"></label></div></section>' +

      '<section class="glass card"><h3>Socials</h3><div class="rep" id="socials">' + d.socials.map(socialRow).join('') + '</div>' +
      '<div><button type="button" class="btn sm" data-act="add-social">+ Add social</button></div></section>' +

      '<section class="glass card"><h3>Services</h3><div class="rep" id="services">' + d.services.map(serviceRow).join('') + '</div>' +
      '<div><button type="button" class="btn sm" data-act="add-service">+ Add service</button></div></section>' +

      '<section class="glass card"><h3>Look of this page</h3><div class="grid4">' +
      '<label class="f">Colors<select name="scheme">' + opts(THEME_OPTS.scheme, th.scheme || 'auto') + '</select></label>' +
      '<label class="f">Font<select name="font">' + opts(THEME_OPTS.font, th.font || 'grotesk') + '</select></label>' +
      '<label class="f">Layout<select name="layout">' + opts(THEME_OPTS.layout, th.layout || 'left') + '</select></label>' +
      '<label class="f">Background<select name="bg">' + opts(THEME_OPTS.bg, th.bg || 'orbs') + '</select></label></div>' +
      '<div class="sw"><input type="checkbox" id="use-accent"' + (th.accent ? ' checked' : '') + '> Custom accent color ' +
      '<input type="color" name="accent" value="' + esc(th.accent || '#ffffff') + '"> <span class="muted">(leave off for pure black &amp; white)</span></div></section>' +

      tagBlock +

      '<section class="glass card"><h3>Internal notes (not shown on the card)</h3><textarea name="notes">' + esc(d.notes) + '</textarea></section>' +
      '<div class="bar"><div>' + (d.id ? '<button type="button" class="btn danger" data-act="del-profile">Delete customer</button>' : '') + '</div>' +
      '<button class="btn primary" type="submit">' + (d.id ? 'Save changes' : 'Create customer') + '</button></div></form>'
    );
    $('#editor').addEventListener('submit', function (e) { e.preventDefault(); saveProfile(); });
  }

  /* Read the form back into S.draft (so re-rendering never loses typing). */
  function readForm() {
    var f = $('#editor');
    if (!f) return S.draft;
    var d = S.draft, v = function (n) { return f.elements[n].value.trim(); };
    ['name', 'handle', 'location', 'initials', 'phone', 'email', 'maps_url', 'review_url', 'photo_url', 'tagline', 'notes'].forEach(function (k) { d[k] = v(k); });
    d.socials = $$('.soc-row', f).map(function (r) { var o = {}; $$('[data-k]', r).forEach(function (i) { o[i.getAttribute('data-k')] = i.value.trim(); }); return o; });
    d.services = $$('.svc-row', f).map(function (r) { var o = {}; $$('[data-k]', r).forEach(function (i) { o[i.getAttribute('data-k')] = i.value.trim(); }); return o; });
    d.theme = { scheme: v('scheme'), font: v('font'), layout: v('layout'), bg: v('bg') };
    if ($('#use-accent', f).checked) d.theme.accent = f.elements.accent.value;
    return d;
  }

  function saveProfile() {
    var d = readForm();
    if (!d.name) { say('Name is required', true); return; }
    var row = {
      name: d.name, handle: d.handle || null, location: d.location || null, tagline: d.tagline || null,
      initials: d.initials ? d.initials.toUpperCase() : null, photo_url: d.photo_url || null, phone: d.phone || null, email: d.email || null,
      maps_url: d.maps_url || null, review_url: d.review_url || null, notes: d.notes || null,
      socials: d.socials.filter(function (s) { return s.url; }),
      services: d.services.filter(function (s) { return s.title; }),
      theme: d.theme
    };
    var mkTag = !d.id && $('#mk-tag') && $('#mk-tag').checked;
    var btn = $('#editor button[type=submit]'); btn.disabled = true;
    var q = d.id ? sb.from('profiles').update(row).eq('id', d.id).select().single() : sb.from('profiles').insert(row).select().single();
    q.then(function (r) {
      if (r.error) throw r.error;
      if (!mkTag) return r;
      return sb.from('nfc_tags').insert({ profile_id: r.data.id, label: r.data.name }).then(function (t) { if (t.error) throw t.error; return r; });
    }).then(function () {
      S.draft = null; say('Saved'); return reload();
    }).catch(function (e) { btn.disabled = false; fail(e); });
  }

  /* ───────── NFC tags view ───────── */
  function tagsHtml() {
    var profOpts = '<option value="">— unassigned —</option>' + S.profiles.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
    var h = '<div class="bar"><h2>NFC tags</h2></div>' +
      '<div class="glass card"><h3>Generate tags</h3><div class="bar" style="justify-content:flex-start">' +
      '<label class="f" style="width:90px">How many<input id="gen-n" type="number" min="1" max="50" value="1"></label>' +
      '<label class="f" style="min-width:200px;flex:1">Assign to<select id="gen-p">' + profOpts + '</select></label>' +
      '<button class="btn primary" data-act="gen-tags" style="align-self:flex-end">Generate</button></div>' +
      '<p class="muted">Each tag gets a random 5-character code. Write the link <code>' + esc(location.origin) + '/&lt;code&gt;</code> to the NFC card, then assign it to a customer now or later.</p></div>';
    if (!S.tags.length) return h + '<div class="glass empty">No tags yet.</div>';
    return h + S.tags.map(function (t) {
      return '<div class="glass tagrow" data-code="' + esc(t.code) + '">' +
        '<a class="code" href="' + esc(tagUrl(t.code)) + '" target="_blank" rel="noopener">/' + esc(t.code) + '</a>' +
        '<input data-f="label" value="' + esc(t.label || '') + '" placeholder="Label (e.g. Card #3)" aria-label="Label">' +
        '<select data-f="profile" aria-label="Assigned to">' + profOpts.replace('value="' + esc(t.profile_id || '') + '"', 'value="' + esc(t.profile_id || '') + '" selected') + '</select>' +
        '<span class="meta2">' + t.scan_count + ' scans' + (t.last_scan_at ? '<br>' + esc(new Date(t.last_scan_at).toLocaleDateString()) : '') + '</span>' +
        '<span class="acts"><label class="sw"><input type="checkbox" data-f="active"' + (t.active ? ' checked' : '') + '> on</label>' +
        '<button class="btn sm" data-act="copy-url" data-code="' + esc(t.code) + '">Copy</button>' +
        '<button class="btn sm danger" data-act="del-tag" data-code="' + esc(t.code) + '">Delete</button></span></div>';
    }).join('');
  }

  function updateTag(code, patch) {
    return sb.from('nfc_tags').update(patch).eq('code', code).then(function (r) { if (r.error) throw r.error; });
  }

  /* ───────── events ───────── */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), code = b.getAttribute('data-code');
    switch (act) {
      case 'logout': sb.auth.signOut().then(function () { S.draft = null; renderLogin(); }); break;
      case 'tab': S.view = b.getAttribute('data-v'); render(); break;
      case 'new': S.draft = blankProfile(); render(); break;
      case 'edit':
        var p = S.profiles.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        S.draft = JSON.parse(JSON.stringify(p));
        ['handle', 'location', 'tagline', 'initials', 'photo_url', 'phone', 'email', 'maps_url', 'review_url', 'notes'].forEach(function (k) { if (S.draft[k] == null) S.draft[k] = ''; });
        render(); break;
      case 'back': S.draft = null; render(); break;
      case 'add-social': readForm(); S.draft.socials.push({ type: 'facebook', label: '', handle: '', url: '' }); render(); break;
      case 'add-service': readForm(); S.draft.services.push({ title: '', desc: '' }); render(); break;
      case 'rm-row': b.parentNode.remove(); break;
      case 'copy-url': copyText(tagUrl(code)); break;
      case 'add-tag':
        readForm();
        sb.from('nfc_tags').insert({ profile_id: S.draft.id, label: S.draft.name }).then(function (r) { if (r.error) throw r.error; return loadAll(); }).then(function () { render(); say('Tag created'); }).catch(fail);
        break;
      case 'assign-free':
        readForm();
        updateTag($('#free-tag').value, { profile_id: S.draft.id }).then(loadAll).then(function () { render(); say('Assigned'); }).catch(fail);
        break;
      case 'unassign':
        readForm();
        updateTag(code, { profile_id: null }).then(loadAll).then(function () { render(); say('Unassigned'); }).catch(fail);
        break;
      case 'del-profile':
        if (!confirm('Delete "' + S.draft.name + '"? Its NFC tags stay but become unassigned.')) return;
        sb.from('profiles').delete().eq('id', S.draft.id).then(function (r) { if (r.error) throw r.error; S.draft = null; say('Deleted'); return reload(); }).catch(fail);
        break;
      case 'gen-tags':
        var n = Math.max(1, Math.min(50, parseInt($('#gen-n').value, 10) || 1)), pid = $('#gen-p').value || null, rows = [];
        for (var i = 0; i < n; i++) rows.push({ profile_id: pid, label: pid ? profileName(pid) : null });
        b.disabled = true;
        sb.from('nfc_tags').insert(rows).then(function (r) { if (r.error) throw r.error; say(n + ' tag' + (n > 1 ? 's' : '') + ' created'); return reload(); }).catch(function (er) { b.disabled = false; fail(er); });
        break;
      case 'del-tag':
        if (!confirm('Delete tag /' + code + '? Any NFC card already written with this link will stop working.')) return;
        sb.from('nfc_tags').delete().eq('code', code).then(function (r) { if (r.error) throw r.error; say('Deleted'); return reload(); }).catch(fail);
        break;
    }
  });

  /* inline edits on the Tags tab */
  app.addEventListener('change', function (e) {
    var row = e.target.closest('.tagrow[data-code]'), f = e.target.getAttribute('data-f');
    if (!row || !f) return;
    var code = row.getAttribute('data-code'), patch = {};
    if (f === 'label') patch.label = e.target.value.trim() || null;
    if (f === 'profile') patch.profile_id = e.target.value || null;
    if (f === 'active') patch.active = e.target.checked;
    updateTag(code, patch).then(function () { say('Saved'); return loadAll(); }).catch(function (er) { fail(er); reload(); });
  });

  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { S.user = null; S.draft = null; } });
  boot();
})();
