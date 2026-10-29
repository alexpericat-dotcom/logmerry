# Scripts de l'audit d'accessibilité

Écrits pour l'audit du 29 octobre 2026 (`docs/audit-accessibilite.md`). À coller dans la console du navigateur, sur une page de l'application **connectée au compte de démo A**, sur un build de production local (`npm run build && npm run start`). Les pages sont chargées dans des cadres invisibles de même origine. Thème : `localStorage.setItem('theme', 'light' | 'dark')`. Aucun script externe n'est chargé.

## 1. Contraste du texte (clair ou sombre, toutes pages listées)

Pour chaque texte visible : couleur du texte contre le fond réel (couches semi-transparentes composées, pire point d'un dégradé). Seuil 4,5:1, ou 3:1 pour un texte de 24 px ou de 18,66 px en gras. Renvoie, par page, le nombre de textes mesurés et les échecs.

```js
async () => {
  const pages = ['/aujourd-hui','/calendrier','/clients','/notes','/missions','/factures','/plafonds','/profil','/regles','/a-faire'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2], p.length>3 ? p[3] : 1]; };
  const over = (fg, bg) => [0,1,2].map(i => Math.round(fg[i]*fg[3] + bg[i]*(1-fg[3])));
  const ratioOf = (a,b) => { const L1=lum(a), L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
  const out = [];
  for (const p of pages) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;opacity:0;pointer-events:none;border:0';
    f.src = p; document.body.appendChild(f);
    await new Promise(r => { f.onload = r; setTimeout(r, 8000); }); await sleep(1200);
    const d = f.contentDocument, w = f.contentWindow, fails = []; let n = 0;
    const walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), seen = new Set();
    while (walker.nextNode()) {
      const txt = walker.currentNode.textContent.trim(); const el = walker.currentNode.parentElement;
      if (!txt || !el || seen.has(el)) continue; seen.add(el);
      const cs = w.getComputedStyle(el); const rect = el.getBoundingClientRect();
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || !rect.width || !rect.height || el.closest('[aria-hidden="true"], .sr-only')) continue;
      const fg = parse(cs.color); if (!fg) continue;
      let node = el, layers = [], stops = null;
      while (node && node.nodeType === 1) {
        const s = w.getComputedStyle(node), c = parse(s.backgroundColor);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
        if (s.backgroundImage && s.backgroundImage !== 'none') { stops = (s.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); break; }
        node = node.parentElement;
      }
      let base = [255,255,255,1]; const root = parse(w.getComputedStyle(d.body).backgroundColor); if (root && root[3] > 0) base = root;
      const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700, need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
      const compose = start => { let cur = start; for (let i = layers.length-1; i >= 0; i--) { const o = over(layers[i], [cur[0],cur[1],cur[2],1]); cur = [o[0],o[1],o[2]]; } return cur; };
      const candidates = stops && stops.length ? stops.map(sc => over(sc, base)) : [base.slice(0,3)];
      let worst = 99; for (const c of candidates) { const bg = compose(c); worst = Math.min(worst, ratioOf(over(fg, bg), bg)); }
      n++; if (worst < need) fails.push({ txt: txt.slice(0,34), ratio: +worst.toFixed(2), need, tag: el.tagName.toLowerCase() });
    }
    out.push({ page: p, n, nFail: fails.length, ex: fails.slice(0,4) }); f.remove();
  }
  return out;
}
```

## 2. Focus visible (page courante, après une vraie touche Tab)

Presser Tab une fois (le navigateur passe en modalité clavier), puis exécuter. Renvoie les éléments tabulables sans contour ni anneau, et ceux dont le contour a moins de 3:1. Les éléments dans un `<details>` replié sont exclus (non focalisables).

```js
() => {
  const sel = 'a[href],button,input,select,textarea,summary,[tabindex],[role=button]';
  const all = [...document.querySelectorAll(sel)].filter(e => !e.disabled && e.tabIndex >= 0 && !e.closest('[hidden],[inert]') && !(e.closest('details') && !e.closest('details').open && e.tagName !== 'SUMMARY') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(/[ ,\/]+/).filter(Boolean).map(Number) : null; };
  const lum = ([r,g,b]) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const bgOf = e => { let n = e; while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c && (c[3] === undefined || c[3] >= 0.95)) return c; n = n.parentElement; } return [255,255,255]; };
  const noRing = [], weak = [];
  for (const e of all) {
    e.focus({ preventScroll: true }); const cs = getComputedStyle(e);
    const label = (e.getAttribute('aria-label') || e.textContent || e.name || '').trim().slice(0, 30);
    if (!e.matches(':focus-visible')) { noRing.push('pas focus-visible : ' + e.tagName + ' ' + label); continue; }
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, shadow = cs.boxShadow && cs.boxShadow !== 'none' && /rgb/.test(cs.boxShadow);
    if (!outline && !shadow) { noRing.push(e.tagName + ' ' + label); continue; }
    if (outline) { const oc = parse(cs.outlineColor), bg = bgOf(e); if (oc) { const a = lum(oc), b = lum(bg), r = (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); if (r < 3) weak.push(e.tagName + ' ' + label + ' ' + r.toFixed(2)); } }
  }
  document.activeElement.blur();
  return { page: location.pathname, theme: document.documentElement.className, tabbables: all.length, noRing, weak };
}
```

Faux positif connu : un contour `rgba(0,0,0,0)` (mode contrastes forcés) avec un anneau en `box-shadow` est signalé « faible » ; lire alors `getComputedStyle(el).boxShadow`.

## 3. Où tombe le focus à l'ouverture d'un formulaire

Pour chaque bouton de la liste : focus, clic, puis élément actif après 0,8 s. `BODY` = focus perdu.

```js
async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const M = '/missions/<id d\'une mission>', C = '/clients/<id d\'un client>';
  const targets = [['/factures', /^Nouvelle facture$/], [C, /^Nouveau devis$/], [C, /^Ajouter un contact$/], [M, /^Ajouter un sprint$/], ['/calendrier', /^Nouvelle échéance$/], ['/regles', /^Nouvelle version$/]];
  const out = [];
  for (const [p, re] of targets) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;opacity:0;pointer-events:none;border:0';
    f.src = p; document.body.appendChild(f);
    await new Promise(r => { f.onload = r; setTimeout(r, 8000); }); await sleep(1300);
    const d = f.contentDocument, b = [...d.querySelectorAll('main button, main a')].find(x => re.test(x.textContent.trim()));
    if (!b) { out.push('absent ' + re); f.remove(); continue; }
    b.focus(); b.click(); await sleep(800);
    const a = d.activeElement; out.push((a === d.body ? 'PERDU ' : 'ok ') + p + ' ' + re + ' -> ' + (a === d.body ? 'BODY' : a.tagName + ' ' + (a.name || a.textContent || '').trim().slice(0, 24)));
    f.remove();
  }
  return out;
}
```
