/* Money Legos: DOM wiring for the toy-brick redesign. Depends on logic.js (MoneyLegos). */
(function () {
  var M = MoneyLegos;
  var MAX = 4;
  var board = [];
  var focusId = 'b20';
  var lastResult = null;
  var dropping = [];      /* ids that should play the drop-and-snap animation on next render */
  var building = false;   /* play the build animation on next render */
  var timers = [];
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* 24px line icons, one per Lego. Drawn with stroke="currentColor". */
  var ICONS = {
    b20: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    payments: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
    financing: '<path d="M5 20V14"/><path d="M10 20V10"/><path d="M15 20V6"/><path d="M20 20V3"/>',
    validity: '<path d="M4 8h14"/><path d="M14 4l4 4-4 4"/><path d="M20 16H6"/><path d="M10 12l-4 4 4 4"/>',
    speed: '<path d="M13 2L5 13.5h6L10 22l8-11.5h-6z"/>',
    swaps: '<path d="M20 11a8 8 0 0 0-14.3-4.9"/><path d="M5 3v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9"/><path d="M19 21v-4h-4"/>',
    stocks: '<path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/>',
    verify: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    builder: '<path d="M8 7l-5 5 5 5"/><path d="M16 7l5 5-5 5"/><path d="M13.5 4l-3 16"/>',
    memos: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7"/><path d="M9 16h5"/>',
    subscriptions: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
    escrow: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="M12 15v2"/>',
    refunds: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'
  };

  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function later(fn, ms) { var t = window.setTimeout(fn, ms); timers.push(t); return t; }
  function icon(id, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'brick-icon' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.innerHTML = ICONS[id] || '';
    return s;
  }
  function studs(count) {
    var s = el('span', 'studs');
    s.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < count; i++) s.appendChild(el('span', 'stud'));
    return s;
  }
  function docLink(d) {
    var a = el('a', 'doc-link t-label-medium');
    a.href = d.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.appendChild(document.createTextNode(d.label));
    var arrow = el('span', 'ext', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    a.appendChild(arrow);
    a.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
    return a;
  }
  function statusPill(lego) {
    var s = el('span', 'status status-' + lego.statusKind + ' t-label-medium');
    var dot = el('span', 'status-dot');
    dot.setAttribute('aria-hidden', 'true');
    s.appendChild(dot);
    s.appendChild(document.createTextNode(lego.status));
    return s;
  }
  function announce(msg) {
    var live = $('#live');
    live.textContent = '';
    later(function () { live.textContent = msg; }, 30);
  }
  var noteMsg = '';
  function note(msg) { noteMsg = msg || ''; }
  function renderNote() {
    var n = $('#board-note');
    n.classList.toggle('is-warn', !!noteMsg);
    if (noteMsg) n.textContent = noteMsg;
    else if (board.length < 2) n.textContent = 'Add two to four Legos, then press Generate. Drag works too.';
    else if (!lastResult) n.textContent = 'Ready. Press Generate to name the app these Legos make.';
    else n.textContent = 'Change a Lego to try another app.';
  }

  /* Tray */
  function renderTray() {
    var featured = $('#tray-featured');
    var secondary = $('#tray-secondary');
    M.LEGOS.forEach(function (lego) {
      var big = lego.tier === 'featured';
      var b = el('button', 'lego lego-' + lego.tier + ' c-' + lego.id);
      b.type = 'button';
      b.dataset.id = lego.id;
      b.draggable = true;
      b.setAttribute('aria-pressed', 'false');
      var brick = el('span', 'brick');
      brick.appendChild(studs(big ? 4 : 2));
      var face = el('span', 'brick-face');
      face.appendChild(icon(lego.id));
      var text = el('span', 'brick-text');
      if (big) {
        text.appendChild(el('span', 'brick-kicker t-brick-kicker', lego.kicker));
        text.appendChild(el('span', 'brick-title t-brick-title', lego.title));
      } else {
        text.appendChild(el('span', 'brick-title t-brick-title-sm', lego.title));
      }
      face.appendChild(text);
      brick.appendChild(face);
      var check = el('span', 'brick-check');
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      brick.appendChild(check);
      b.appendChild(brick);
      var cap = el('span', 'lego-caption');
      if (big) cap.appendChild(el('span', 'lego-blurb t-label', lego.blurb));
      else cap.appendChild(el('span', 'lego-kicker t-eyebrow', lego.kicker));
      cap.appendChild(el('span', 'lego-state t-eyebrow'));
      b.appendChild(cap);
      b.addEventListener('click', function () { toggle(lego.id); });
      b.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', lego.id);
        e.dataTransfer.effectAllowed = 'copy';
        document.body.classList.add('is-dragging');
      });
      b.addEventListener('dragend', function () { document.body.classList.remove('is-dragging'); });
      (big ? featured : secondary).appendChild(b);
    });
  }

  function renderRecipes() {
    var shelf = $('#recipes');
    M.RECIPES.forEach(function (r) {
      var b = el('button', 'recipe t-label-medium');
      b.type = 'button';
      b.setAttribute('aria-describedby', 'recipes-hint');
      var dots = el('span', 'recipe-dots');
      dots.setAttribute('aria-hidden', 'true');
      M.flowOrder(r.ids).forEach(function (id) { dots.appendChild(el('span', 'recipe-dot c-' + id)); });
      b.appendChild(dots);
      b.appendChild(document.createTextNode(r.recipe));
      b.addEventListener('click', function () {
        board = M.flowOrder(r.ids);
        focusId = board[0];
        dropping = board.slice();
        runGenerate();
      });
      shelf.appendChild(b);
    });
  }

  function syncTray() {
    var nodes = document.querySelectorAll('.lego');
    for (var i = 0; i < nodes.length; i++) {
      var on = board.indexOf(nodes[i].dataset.id) !== -1;
      nodes[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      nodes[i].querySelector('.lego-state').textContent = on ? 'On board' : '';
      nodes[i].classList.toggle('is-focus', nodes[i].dataset.id === focusId);
    }
  }

  /* Board: a tower of bricks, first Lego at the bottom */
  function renderBoard() {
    var slots = $('#slots');
    slots.textContent = '';
    board.forEach(function (id, i) {
      var lego = M.BY_ID[id];
      var li = el('li', 'slot');
      var b = el('button', 'placed c-' + id);
      b.type = 'button';
      b.setAttribute('aria-label', 'Remove ' + lego.title + ' from board');
      b.appendChild(studs(4));
      var face = el('span', 'brick-face');
      face.appendChild(icon(id));
      var body = el('span', 'brick-text');
      body.appendChild(el('span', 'brick-kicker t-brick-kicker', lego.kicker));
      body.appendChild(el('span', 'brick-title t-brick-title', lego.title));
      face.appendChild(body);
      var x = el('span', 'placed-x t-eyebrow', 'Remove');
      x.setAttribute('aria-hidden', 'true');
      face.appendChild(x);
      b.appendChild(face);
      if (!reduceMotion.matches) {
        var d = dropping.indexOf(id);
        if (d !== -1) {
          li.classList.add('is-dropping', 'delay-' + d);
        } else if (building) {
          li.classList.add('is-building', 'delay-' + i);
        }
      }
      b.addEventListener('click', function () { toggle(id); });
      li.appendChild(b);
      slots.appendChild(li);
    });
    $('#ghost').hidden = board.length >= MAX;
    $('#baseplate').classList.toggle('is-empty', board.length === 0);
    $('#board-count').textContent = board.length + ' of ' + MAX + ' Legos';
    var dots = document.querySelectorAll('#count-dots i');
    for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('is-on', k < board.length);
    if (dropping.length && !reduceMotion.matches) {
      var plate = $('#baseplate');
      plate.classList.remove('is-thump');
      void plate.offsetWidth;
      plate.classList.add('is-thump');
    }
    dropping = [];
  }

  function toggle(id) {
    var i = board.indexOf(id);
    focusId = id;
    if (i !== -1) {
      board.splice(i, 1);
      note('');
      announce(M.BY_ID[id].title + ' removed from board.');
    } else if (board.length >= MAX) {
      note('The board holds up to four Legos. Remove one to add ' + M.BY_ID[id].title + '.');
      announce('Board is full.');
    } else {
      board.push(id);
      dropping = [id];
      note('');
      announce(M.BY_ID[id].title + ' added to board.');
    }
    if (lastResult && M.keyOf(lastResult.ids) !== M.keyOf(board)) lastResult = null;
    renderAll();
  }

  /* Detail card */
  function renderDetail() {
    var lego = M.BY_ID[focusId];
    var card = $('#panel');
    card.textContent = '';
    card.className = 'panel-box card panel detail';
    card.setAttribute('aria-label', 'Lego details');
    var head = el('div', 'detail-head');
    var chip = el('span', 'mini-chip c-' + lego.id);
    chip.appendChild(icon(lego.id));
    head.appendChild(chip);
    var titles = el('div', 'detail-titles');
    titles.appendChild(el('span', 't-eyebrow muted', lego.kicker));
    titles.appendChild(el('h2', 't-title-2', lego.title));
    head.appendChild(titles);
    card.appendChild(head);
    card.appendChild(statusPill(lego));
    card.appendChild(el('p', 'detail-what t-body', lego.what));
    var ex = el('div', 'detail-block');
    ex.appendChild(el('h3', 't-eyebrow muted', 'Example'));
    ex.appendChild(el('p', 't-body', lego.example));
    card.appendChild(ex);
    if (lego.id === 'b20') card.appendChild(traction());
    var docs = el('div', 'detail-block');
    docs.appendChild(el('h3', 't-eyebrow muted', 'Docs'));
    var ul = el('ul', 'doc-list');
    lego.docs.forEach(function (d) { var li = el('li'); li.appendChild(docLink(M.DOCS[d])); ul.appendChild(li); });
    docs.appendChild(ul);
    card.appendChild(docs);
  }

  function traction() {
    var box = el('div', 'detail-block traction');
    var head = el('div', 'traction-head');
    head.appendChild(el('h3', 't-eyebrow muted', 'B20 so far (Dune)'));
    head.appendChild(el('span', 'badge t-eyebrow', 'Refresh on the morning of the workshop'));
    box.appendChild(head);
    var stats = [
      ['~$4.5B', 'cumulative DEX volume since mainnet launch'],
      ['~70,200', 'B20 tokens active in the last 90 days'],
      ['10.8M', 'token transfers']
    ];
    var dl = el('dl', 'stats');
    stats.forEach(function (s) {
      var d = el('div', 'stat');
      d.appendChild(el('dt', 'stat-num t-stat', s[0]));
      d.appendChild(el('dd', 't-label muted', s[1]));
      dl.appendChild(d);
    });
    box.appendChild(dl);
    box.appendChild(el('p', 't-label muted', 'Active tokens: 69,681 asset and 526 stablecoin. Tokenized stocks are about 69% of B20 DEX volume (~$3.1B), and 12 of the top 16 B20s are Coinbase Tokenized Stocks. DEX volume passed $200M on Jul 24 and $1B on Sep 3.'));
    return box;
  }

  /* Result */
  function renderResult() {
    var panel = $('#panel');
    panel.textContent = '';
    panel.className = 'panel-box card panel result' + (building && !reduceMotion.matches ? ' is-revealing' : '');
    panel.setAttribute('aria-label', 'Generated app');
    var r = lastResult;
    var head = el('div', 'result-head reveal');
    var top = el('div', 'result-top');
    top.appendChild(el('span', 't-eyebrow muted', r.curated ? 'Named combo' : 'Composed from your Legos'));
    var ready = el('span', 'ready t-eyebrow');
    var rd = el('span', 'status-dot');
    rd.setAttribute('aria-hidden', 'true');
    ready.appendChild(rd);
    ready.appendChild(document.createTextNode('Ready to build'));
    top.appendChild(ready);
    head.appendChild(top);
    var h = el('h2', 't-title-1 result-name', r.name);
    h.id = 'result-name';
    h.tabIndex = -1;
    head.appendChild(h);
    head.appendChild(el('p', 't-lede result-pitch', r.pitch));
    panel.appendChild(head);

    var flowBlock = el('div', 'result-block reveal');
    flowBlock.appendChild(el('h3', 't-eyebrow muted', 'Flow'));
    var flow = el('ol', 'flow');
    flow.setAttribute('aria-label', 'Flow');
    r.steps.forEach(function (s, i) {
      var li = el('li', 'flow-step');
      var chip = el('span', 'flow-chip t-label-medium c-' + s.lego.id);
      chip.appendChild(el('span', 'flow-studs'));
      chip.appendChild(document.createTextNode(s.lego.title));
      li.appendChild(chip);
      if (i < r.steps.length - 1) {
        var arrow = el('span', 'flow-arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        li.appendChild(arrow);
      }
      flow.appendChild(li);
    });
    flowBlock.appendChild(flow);
    panel.appendChild(flowBlock);

    var why = el('div', 'result-block reveal');
    why.appendChild(el('h3', 't-eyebrow muted', 'Why each Lego matters here'));
    var ul = el('ul', 'why-list');
    r.steps.forEach(function (s) {
      var li = el('li', 'why c-' + s.lego.id);
      li.appendChild(el('span', 'why-title t-headline', s.lego.title));
      li.appendChild(el('p', 't-body', s.why));
      var links = el('div', 'why-docs');
      s.docs.forEach(function (d) { links.appendChild(docLink(d)); });
      li.appendChild(links);
      ul.appendChild(li);
    });
    why.appendChild(ul);
    panel.appendChild(why);

    var copy = el('div', 'result-block prompt-block reveal');
    var row = el('div', 'prompt-row');
    var copyHead = el('div');
    copyHead.appendChild(el('h3', 't-headline', 'Build it with your coding agent'));
    copyHead.appendChild(el('p', 't-label muted', 'A ready-to-paste prompt with the docs above, Base Sepolia and Vibenet for testing, and the Base docs MCP.'));
    row.appendChild(copyHead);
    var btn = el('button', 'btn btn-primary', 'Copy prompt');
    btn.type = 'button';
    btn.id = 'copy';
    btn.addEventListener('click', function () { copyPrompt(r.prompt, btn); });
    row.appendChild(btn);
    copy.appendChild(row);
    var det = el('details', 'prompt-details');
    det.appendChild(el('summary', 't-label-medium', 'Show prompt'));
    det.appendChild(el('pre', 'prompt t-mono', r.prompt));
    copy.appendChild(det);
    panel.appendChild(copy);
  }

  function copyPrompt(text, btn) {
    function done(ok) {
      btn.textContent = ok ? 'Copied' : 'Copy failed';
      if (!ok) {
        var det = document.querySelector('.prompt-details');
        var pre = document.querySelector('.prompt');
        if (det && pre) {
          det.open = true;
          var range = document.createRange();
          range.selectNodeContents(pre);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      announce(ok ? 'Prompt copied to clipboard.' : 'Copy failed. The prompt is shown and selected; press Command or Control plus C to copy it.');
      later(function () { btn.textContent = 'Copy prompt'; }, 2000);
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'offscreen';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      btn.focus();
      done(ok);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function runGenerate() {
    if (board.length < 2) {
      note('Add at least two Legos to generate an app.');
      renderAll();
      announce('Add at least two Legos to generate an app.');
      return false;
    }
    lastResult = M.generate(board);
    note('');
    try { history.replaceState(null, '', '#' + lastResult.ids.join(',')); } catch (e) { /* file:// in some browsers */ }
    building = true;
    renderAll();
    building = false;
    announce('Generated: ' + lastResult.name + '.');
    return true;
  }

  function renderAll() {
    renderBoard();
    syncTray();
    renderNote();
    if (lastResult) renderResult(); else renderDetail();
  }

  function revealResult() {
    var h = $('#result-name');
    if (!h) return;
    h.focus({ preventScroll: true });
    var box = $('#panel').getBoundingClientRect();
    if (box.top > window.innerHeight - 120) {
      $('#panel').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function init() {
    renderTray();
    renderRecipes();
    $('#generate').addEventListener('click', function () {
      if (runGenerate()) revealResult();
    });
    $('#surprise').addEventListener('click', function () {
      board = M.surprise(board);
      focusId = board[0];
      dropping = board.slice();
      if (runGenerate()) revealResult();
    });
    $('#clear').addEventListener('click', function () {
      board = [];
      lastResult = null;
      note('');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
      renderAll();
      announce('Board cleared.');
    });
    var drop = $('#board');
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', function (e) { if (!drop.contains(e.relatedTarget)) drop.classList.remove('is-over'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('is-over');
      document.body.classList.remove('is-dragging');
      var id = e.dataTransfer.getData('text/plain');
      if (M.BY_ID[id] && board.indexOf(id) === -1) toggle(id);
    });

    var fromHash = M.parseHash(location.hash);
    if (fromHash.length) {
      board = fromHash;
      focusId = board[0];
      if (board.length >= 2) { lastResult = M.generate(board); }
    }
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
