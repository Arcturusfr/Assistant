/* ==========================================================================
   Assistant — js/matrix.js
   Version : V003 — 2026-10-16 21:55 (heure de Paris)
   Modifs  : Correctif libellés des bulles : police calculée en pixels ÉCRAN
             (11 à 14 px, compensation de l'échelle du SVG), découpage en lignes
             qui tient dans la bulle, libellé masqué si la bulle est trop petite.
             Nouvelle étiquette flottante (titre complet) au toucher / survol /
             glisser, et infobulle <title>.
   Dépend de : config.js, state.js, helpers.js (appelle App.sheet à l'exécution)
   ========================================================================== */
(function(){
  "use strict";
  const { SVG_NS, CATEGORIES, MX, R_MIN, R_STEP } = App.config;
  const state = App.state;
  const { findTask, scopedTasks, isBlockedByDeps, subtaskCount, persist } = App.model;
  const { shade } = App.helpers;

  function scaleX(u){ // urgence 1..5 -> px
    return MX.pad + (u-1)/4 * (MX.size - MX.pad*2);
  }
  function scaleY(imp){ // importance 1..5 -> px (haut = important)
    return (MX.size - MX.pad) - (imp-1)/4 * (MX.size - MX.pad*2);
  }
  function unscaleX(px){
    let u = 1 + (px - MX.pad) / (MX.size - MX.pad*2) * 4;
    return Math.min(5, Math.max(1, u));
  }
  function unscaleY(py){
    let imp = 1 + ((MX.size - MX.pad) - py) / (MX.size - MX.pad*2) * 4;
    return Math.min(5, Math.max(1, imp));
  }
  function radiusFor(c){ return R_MIN + (c-1) * R_STEP; }

  function svgEl(tag, attrs){
    const el = document.createElementNS(SVG_NS, tag);
    for(const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Nœud <text> caché réutilisable pour mesurer précisément la largeur d'un texte
  let measureEl = null;
  function textWidth(svg, str, fontSize){
    if(!measureEl){
      // Même famille de police que le rendu réel, sinon les largeurs mesurées sont fausses
      measureEl = svgEl('text', {x:-9999, y:-9999, 'font-weight':700, style:'font-family:' + getComputedStyle(document.body).fontFamily + ';'});
      svg.appendChild(measureEl);
    } else if(measureEl.parentNode !== svg){
      svg.appendChild(measureEl);
    }
    measureEl.setAttribute('font-size', fontSize);
    measureEl.textContent = str;
    return measureEl.getComputedTextLength();
  }

  /* Échelle d'affichage : pixels écran par unité SVG (le SVG 460×460 est réduit à
     l'écran, ce qui rendait les polices illisibles). Vue masquée -> valeur de repli. */
  const LABEL_MAX_PX = 14, LABEL_MIN_PX = 10, CAPTION_PX = 13;
  function displayScale(svg){
    const w = svg.getBoundingClientRect().width;
    return w > 0 ? w / MX.size : 0.8;
  }

  // Raccourcit str avec « … » jusqu'à tenir dans maxW
  function truncateToWidth(svg, str, fontSize, maxW){
    if(textWidth(svg, str, fontSize) <= maxW) return str;
    let s = str;
    while(s.length > 1 && textWidth(svg, s + '…', fontSize) > maxW){ s = s.slice(0, -1); }
    return s.replace(/[,.;:\s]+$/, '') + '…';
  }

  // Découpe en lignes (au plus maxLines) ; widthOf(i, n) = largeur disponible de la ligne i sur n.
  // Renvoie {lines, truncated}. Si allowTruncate est faux, renvoie null quand tout ne tient pas.
  function layoutLines(svg, words, fontSize, maxLines, widthOf, allowTruncate){
    const lines = [];
    let idx = 0;
    while(idx < words.length && lines.length < maxLines){
      const w = widthOf(lines.length, maxLines);
      let current = "";
      while(idx < words.length){
        const attempt = current ? current + " " + words[idx] : words[idx];
        if(textWidth(svg, attempt, fontSize) <= w){ current = attempt; idx++; }
        else break;
      }
      if(!current){ // un seul mot plus large que la ligne
        if(!allowTruncate) return null;
        current = truncateToWidth(svg, words[idx], fontSize, w); idx++;
      }
      lines.push(current);
    }
    if(idx < words.length){
      if(!allowTruncate) return null;
      const li = lines.length - 1;
      const w = widthOf(li, maxLines);
      lines[li] = truncateToWidth(svg, lines[li] + ' ' + words.slice(idx).join(' '), fontSize, w);
      return { lines, truncated:true };
    }
    return { lines, truncated:false };
  }

  // Libellé d'une bulle : police 11–14 px à l'écran ; on prend la plus grande qui permet
  // d'afficher le titre en entier, sinon on tronque à 11 px, sinon on n'affiche rien.
  function wrapLabel(svg, title, r){
    const s = displayScale(svg);
    const words = title.split(/\s+/).filter(Boolean);
    const empty = { lines:[], fontSize:LABEL_MIN_PX/s, lineHeight:LABEL_MIN_PX/s*1.16 };
    if(!words.length) return empty;
    const chord = (fs, lh) => (i, n) => {
      const dy = Math.abs(i - (n-1)/2) * lh + lh*0.55; // bord extérieur de la ligne
      return 2 * Math.sqrt(Math.max(r*r - dy*dy, 0)) * 0.94;
    };
    for(let px = LABEL_MAX_PX; px >= LABEL_MIN_PX; px--){
      const fs = px / s, lh = fs * 1.16;
      const maxLines = Math.max(1, Math.min(3, Math.floor(r*1.5 / lh)));
      for(let n = 1; n <= maxLines; n++){
        const res = layoutLines(svg, words, fs, n, chord(fs, lh), false);
        if(res) return { lines:res.lines, fontSize:fs, lineHeight:lh };
      }
    }
    const fs = LABEL_MIN_PX / s, lh = fs * 1.16;
    const maxLines = Math.max(1, Math.min(3, Math.floor(r*1.5 / lh)));
    const res = layoutLines(svg, words, fs, maxLines, chord(fs, lh), true);
    // Dernière ligne réduite à presque rien (« la c… ») : on la remplace par « … » sur la précédente
    if(res.truncated && res.lines.length > 1 && res.lines[res.lines.length-1].replace('…','').length < 3){
      res.lines.pop();
      res.lines[res.lines.length-1] = res.lines[res.lines.length-1].replace(/[…\s]+$/, '') + '…';
    }
    const firstVisible = (res.lines[0] || '').replace('…','');
    if(firstVisible.length < 4) return empty; // bulle trop petite : voir l'étiquette flottante
    return { lines:res.lines, fontSize:fs, lineHeight:lh };
  }

  /* ---------- Étiquette flottante (titre complet) ---------- */
  function hideCaption(){
    const old = document.getElementById('bubble-caption');
    if(old) old.remove();
  }
  function showCaption(id){
    hideCaption();
    const svg = document.getElementById('matrix-svg');
    const g = svg.querySelector(`.bubble[data-id="${id}"]`);
    const t = findTask(id);
    if(!g || !t) return;
    const main = g.querySelector('[data-role="main"]');
    const cx = Number(main.getAttribute('cx')), cy = Number(main.getAttribute('cy')), r = Number(main.getAttribute('r'));
    const s = displayScale(svg);
    const fs = CAPTION_PX / s, lh = fs * 1.2, pad = 7 / s;
    const maxW = MX.size - 16 - pad*2;
    const words = t.title.split(/\s+/).filter(Boolean);
    const res = layoutLines(svg, words, fs, 2, () => maxW, true) || { lines:[t.title] };
    const textW = Math.max(...res.lines.map(l => textWidth(svg, l, fs)));
    const w = textW + pad*2, h = res.lines.length * lh + pad*2 - (lh - fs)*0.5;
    const x = Math.min(Math.max(cx - w/2, 4), MX.size - w - 4);
    let y = cy - r - 8/s - h;
    if(y < 4) y = cy + r + 8/s; // pas de place au-dessus : en dessous
    y = Math.min(y, MX.size - h - 4);

    const cap = svgEl('g', {id:'bubble-caption', class:'bubble-caption'});
    cap.appendChild(svgEl('rect', {x, y, width:w, height:h, rx:8/s, class:'bubble-caption-bg'}));
    const text = svgEl('text', {'font-size':fs, class:'bubble-caption-text'});
    res.lines.forEach((line,i)=>{
      const tspan = svgEl('tspan', {x:x+pad, y:y + pad + fs*0.85 + i*lh});
      tspan.textContent = line;
      text.appendChild(tspan);
    });
    cap.appendChild(text);
    svg.appendChild(cap);
  }

  // Garde le cercle entier de la bulle dans le canevas, même près des bords
  function clampToCanvas(cx, cy, r){
    const margin = 4;
    return {
      cx: Math.min(Math.max(cx, r+margin), MX.size - r - margin),
      cy: Math.min(Math.max(cy, r+margin), MX.size - r - margin)
    };
  }

  // Les doublons exacts (mêmes urgence/importance/complexité) seraient empilés et
  // impossibles à cliquer : on les répartit autour du point commun.
  function computeBubbleLayout(taskList){
    const groups = {};
    taskList.forEach(t=>{
      const key = `${Math.round(t.urgency)}|${Math.round(t.importance)}|${Math.round(t.complexity)}`;
      (groups[key] = groups[key] || []).push(t);
    });
    const layout = {};
    Object.values(groups).forEach(group=>{
      const baseCx = scaleX(group[0].urgency), baseCy = scaleY(group[0].importance), r = radiusFor(group[0].complexity);
      if(group.length === 1){
        const p = clampToCanvas(baseCx, baseCy, r);
        layout[group[0].id] = { cx:p.cx, cy:p.cy, r };
      } else {
        const n = group.length;
        const offsetR = r / Math.sin(Math.PI / n);
        group.forEach((t, i)=>{
          const angle = (i / n) * Math.PI * 2 - Math.PI/2;
          const p = clampToCanvas(baseCx + Math.cos(angle)*offsetR, baseCy + Math.sin(angle)*offsetR, r);
          layout[t.id] = { cx:p.cx, cy:p.cy, r };
        });
      }
    });
    return layout;
  }

  let dragState = null; // {id, mode:'move'|'resize', pointerId}

  function render(){
    const svg = document.getElementById('matrix-svg');
    svg.innerHTML = "";
    measureEl = null; // supprimé avec le reste du SVG
    svg.setAttribute('viewBox', `0 0 ${MX.size} ${MX.size}`);
    const mid = MX.pad + (MX.size - MX.pad*2)/2;

    // Defs : un dégradé radial brillant par catégorie + une ombre portée douce commune
    const defs = svgEl('defs', {});
    Object.entries(CATEGORIES).forEach(([k,c])=>{
      const grad = svgEl('radialGradient', {id:`grad-${k}`, cx:'35%', cy:'26%', r:'80%'});
      grad.appendChild(svgEl('stop', {offset:'0%', 'stop-color': shade(c.hex, 0.38)}));
      grad.appendChild(svgEl('stop', {offset:'55%', 'stop-color': c.hex}));
      grad.appendChild(svgEl('stop', {offset:'100%', 'stop-color': shade(c.hex, -0.2)}));
      defs.appendChild(grad);
    });
    const filt = svgEl('filter', {id:'bubble-shadow', x:'-60%', y:'-60%', width:'220%', height:'220%'});
    filt.appendChild(svgEl('feDropShadow', {dx:0, dy:2, stdDeviation:2.4, 'flood-color':'#12151C', 'flood-opacity':0.28}));
    defs.appendChild(filt);
    svg.appendChild(defs);

    // Fonds des quadrants
    const half = (MX.size - MX.pad*2)/2;
    svg.appendChild(svgEl('rect', {x:MX.pad, y:MX.pad, width:half, height:half, fill:'var(--q2)'})); // haut-gauche : important pas urgent
    svg.appendChild(svgEl('rect', {x:mid, y:MX.pad, width:half, height:half, fill:'var(--q1)'}));     // haut-droit : important+urgent
    svg.appendChild(svgEl('rect', {x:MX.pad, y:mid, width:half, height:half, fill:'var(--q4)'}));     // bas-gauche : ni l'un ni l'autre
    svg.appendChild(svgEl('rect', {x:mid, y:mid, width:half, height:half, fill:'var(--q3)'}));        // bas-droit : urgent pas important

    // Bordure
    svg.appendChild(svgEl('rect', {x:MX.pad, y:MX.pad, width:MX.size-MX.pad*2, height:MX.size-MX.pad*2, fill:'none', stroke:'var(--border)', 'stroke-width':1.5}));
    // Lignes centrales
    svg.appendChild(svgEl('line', {x1:mid, y1:MX.pad, x2:mid, y2:MX.size-MX.pad, stroke:'var(--border)', 'stroke-width':1, 'stroke-dasharray':'3,3'}));
    svg.appendChild(svgEl('line', {x1:MX.pad, y1:mid, x2:MX.size-MX.pad, y2:mid, stroke:'var(--border)', 'stroke-width':1, 'stroke-dasharray':'3,3'}));

    // Libellés de quadrants (dessinés après les bulles pour rester lisibles)
    const qlabel = (x,y,anchor,text) => {
      const t = svgEl('text', {x, y, 'text-anchor':anchor, class:'quad-label'});
      t.textContent = text; svg.appendChild(t);
    };

    // Libellés d'axes
    const ax1 = svgEl('text', {x:MX.size/2, y:MX.size-6, 'text-anchor':'middle', class:'axis-label'});
    ax1.textContent = 'Urgence →'; svg.appendChild(ax1);
    const ax2 = svgEl('text', {x:14, y:MX.size/2, 'text-anchor':'middle', class:'axis-label', transform:`rotate(-90 14 ${MX.size/2})`});
    ax2.textContent = 'Importance →'; svg.appendChild(ax2);

    // Bulles
    const visibleTasks = scopedTasks().filter(t => t.status !== 'done');
    const layout = computeBubbleLayout(visibleTasks);
    visibleTasks.forEach(t=>{
      const { cx, cy, r } = layout[t.id];
      const blocked = isBlockedByDeps(t);
      const g = svgEl('g', {class:'bubble', 'data-id':t.id, opacity: blocked ? '0.55' : '1'});
      const tip = svgEl('title', {}); tip.textContent = t.title; g.appendChild(tip);

      const circle = svgEl('circle', {cx, cy, r, fill:`url(#grad-${t.category in CATEGORIES ? t.category : 'autre'})`, stroke:'#fff', 'stroke-width':1.5, filter:'url(#bubble-shadow)', 'data-role':'main'});
      g.appendChild(circle);

      // Reflet brillant, comme la lumière sur une sphère de verre
      const shx = cx - r*0.32, shy = cy - r*0.38;
      const shine = svgEl('ellipse', {cx:shx, cy:shy, rx:r*0.42, ry:r*0.24, fill:'#fff', opacity:0.4, transform:`rotate(-18 ${shx} ${shy})`, style:'pointer-events:none;', 'data-role':'shine'});
      g.appendChild(shine);

      // Titre de la tâche dans la bulle
      const { lines, fontSize, lineHeight } = wrapLabel(svg, t.title, r);
      const label = svgEl('text', {x:cx, 'text-anchor':'middle', 'font-size':fontSize, 'font-weight':700, fill:'#fff', style:'pointer-events:none; paint-order:stroke; stroke:rgba(18,21,28,0.32); stroke-width:2.5px; stroke-linejoin:round;', 'data-role':'label'});
      const startY = cy - (lines.length-1)*lineHeight/2 + fontSize*0.35;
      lines.forEach((line,i)=>{
        const tspan = svgEl('tspan', {x:cx, y:startY + i*lineHeight});
        tspan.textContent = line;
        label.appendChild(tspan);
      });
      g.appendChild(label);

      if(blocked){
        const lx = cx - r*0.74, ly = cy - r*0.74;
        const lockBg = svgEl('circle', {cx:lx, cy:ly, r:Math.max(8, r*0.24), fill:'#12151C', stroke:'#fff', 'stroke-width':1.5, style:'pointer-events:none;', 'data-role':'lock-bg'});
        g.appendChild(lockBg);
        const lockIcon = svgEl('text', {x:lx, y:ly+Math.max(8,r*0.24)*0.36, 'text-anchor':'middle', 'font-size':Math.max(9,r*0.26), style:'pointer-events:none;', 'data-role':'lock-icon'});
        lockIcon.textContent = '🔒'; g.appendChild(lockIcon);
      }

      const subCount = subtaskCount(t.id);
      if(subCount > 0){
        const sx = cx + r*0.74, sy = cy - r*0.74;
        const sr = Math.max(9, r*0.26);
        const subBg = svgEl('circle', {cx:sx, cy:sy, r:sr, fill:'#fff', stroke:CATEGORIES[t.category] ? CATEGORIES[t.category].hex : '#64748B', 'stroke-width':1.5, style:'pointer-events:none;', 'data-role':'sub-bg'});
        g.appendChild(subBg);
        const subLabel = svgEl('text', {x:sx, y:sy+sr*0.35, 'text-anchor':'middle', 'font-size':Math.max(8,r*0.22), 'font-weight':700, fill:'#12151C', style:'pointer-events:none;', 'data-role':'sub-label'});
        subLabel.textContent = String(subCount); g.appendChild(subLabel);
      }

      // Cible tactile invisible plus grande (il faut un fill, même transparent, pour être touchable)
      const hit = svgEl('circle', {cx, cy, r:Math.max(r, 26), class:'bubble-hit', 'data-role':'hit'});
      g.appendChild(hit);

      // Poignée de redimensionnement (bas-droite), avec sa propre cible tactile
      const hx = cx + r*0.71, hy = cy + r*0.71;
      const resizeHit = svgEl('circle', {cx:hx, cy:hy, r:18, class:'resize-hit', 'data-role':'resize-hit'});
      g.appendChild(resizeHit);
      const handle = svgEl('circle', {cx:hx, cy:hy, r:9, class:'resize-handle', 'data-role':'resize'});
      g.appendChild(handle);

      svg.appendChild(g);
    });

    qlabel(mid+half-6, MX.pad-10, 'end', 'Faire maintenant');
    qlabel(MX.pad+6, MX.pad-10, 'start', 'Planifier');
    qlabel(mid+half-6, MX.size-MX.pad+15, 'end', 'Vite fait');
    qlabel(MX.pad+6, MX.size-MX.pad+15, 'start', 'Plus tard');

    // Légende
    const legend = document.getElementById('matrix-legend');
    legend.innerHTML = Object.entries(CATEGORIES).map(([k,c])=>
      `<span><span class="legend-dot" style="background:${c.color}"></span>${c.icon} ${c.label}</span>`
    ).join('');
  }

  // Met à jour une seule bulle sans reconstruire tout le SVG : glisser reste fluide et
  // l'élément manipulé n'est jamais détruit en cours de geste.
  function updateBubbleVisual(t){
    const svg = document.getElementById('matrix-svg');
    const g = svg.querySelector(`[data-id="${t.id}"]`);
    if(!g) return;
    const raw = { cx: scaleX(t.urgency), cy: scaleY(t.importance), r: radiusFor(t.complexity) };
    const clamped = clampToCanvas(raw.cx, raw.cy, raw.r);
    const cx = clamped.cx, cy = clamped.cy, r = raw.r;
    const main = g.querySelector('[data-role="main"]');
    const shine = g.querySelector('[data-role="shine"]');
    const label = g.querySelector('[data-role="label"]');
    const hit = g.querySelector('[data-role="hit"]');
    const handle = g.querySelector('[data-role="resize"]');
    const resizeHit = g.querySelector('[data-role="resize-hit"]');

    main.setAttribute('cx', cx); main.setAttribute('cy', cy); main.setAttribute('r', r);

    const shx = cx - r*0.32, shy = cy - r*0.38;
    shine.setAttribute('cx', shx); shine.setAttribute('cy', shy);
    shine.setAttribute('rx', r*0.42); shine.setAttribute('ry', r*0.24);
    shine.setAttribute('transform', `rotate(-18 ${shx} ${shy})`);

    const { lines, fontSize, lineHeight } = wrapLabel(svg, t.title, r);
    label.setAttribute('font-size', fontSize);
    label.innerHTML = '';
    const startY = cy - (lines.length-1)*lineHeight/2 + fontSize*0.35;
    lines.forEach((line,i)=>{
      const tspan = svgEl('tspan', {x:cx, y:startY + i*lineHeight});
      tspan.textContent = line;
      label.appendChild(tspan);
    });

    hit.setAttribute('cx', cx); hit.setAttribute('cy', cy); hit.setAttribute('r', Math.max(r, 26));
    const hx = cx + r*0.71, hy = cy + r*0.71;
    handle.setAttribute('cx', hx); handle.setAttribute('cy', hy);
    resizeHit.setAttribute('cx', hx); resizeHit.setAttribute('cy', hy);
    if(document.getElementById('bubble-caption')) showCaption(t.id);
  }

  function svgPoint(svg, clientX, clientY){
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM().inverse();
    return pt.matrixTransform(ctm);
  }

  // Le glisser est attaché une seule fois à la racine du SVG (jamais détruite) et non à
  // chaque bulle (reconstruites à chaque rendu).
  function init(){
    const svg = document.getElementById('matrix-svg');

    svg.addEventListener('pointerdown', (ev)=>{
      const bubble = ev.target.closest('.bubble');
      if(!bubble) return;
      const role = ev.target.getAttribute('data-role');
      const mode = (role === 'resize' || role === 'resize-hit') ? 'resize' : 'move';
      dragState = { id: bubble.getAttribute('data-id'), mode, pointerId: ev.pointerId, startX: ev.clientX, startY: ev.clientY, moved:false };
      bubble.classList.add('dragging');
      svg.setPointerCapture(ev.pointerId);
      ev.preventDefault();
      showCaption(dragState.id);
    });

    // Survol à la souris : afficher le titre complet
    svg.addEventListener('pointerover', (ev)=>{
      if(dragState || ev.pointerType !== 'mouse') return;
      const bubble = ev.target.closest && ev.target.closest('.bubble');
      if(bubble) showCaption(bubble.getAttribute('data-id'));
    });
    svg.addEventListener('pointerout', (ev)=>{
      if(dragState || ev.pointerType !== 'mouse') return;
      hideCaption();
    });

    svg.addEventListener('pointermove', (ev)=>{
      if(!dragState || ev.pointerId !== dragState.pointerId) return;
      if(!dragState.moved && Math.hypot(ev.clientX - dragState.startX, ev.clientY - dragState.startY) > 6){
        dragState.moved = true;
      }
      if(!dragState.moved) return;
      const t = findTask(dragState.id);
      if(!t) return;
      const pt = svgPoint(svg, ev.clientX, ev.clientY);

      if(dragState.mode === 'move'){
        t.urgency = Math.round(unscaleX(pt.x));
        t.importance = Math.round(unscaleY(pt.y));
      } else {
        const main = svg.querySelector(`[data-id="${t.id}"] [data-role="main"]`);
        const cx = main ? Number(main.getAttribute('cx')) : scaleX(t.urgency);
        const cy = main ? Number(main.getAttribute('cy')) : scaleY(t.importance);
        const dist = Math.hypot(pt.x - cx, pt.y - cy); // distance au centre ≈ rayon actuel
        const c = 1 + (dist - R_MIN) / R_STEP;
        t.complexity = Math.min(5, Math.max(1, Math.round(c)));
      }
      updateBubbleVisual(t);
    });

    const endDrag = (ev)=>{
      if(!dragState || ev.pointerId !== dragState.pointerId) return;
      const bubble = svg.querySelector(`[data-id="${dragState.id}"]`);
      if(bubble) bubble.classList.remove('dragging');
      const wasTap = !dragState.moved;
      const id = dragState.id;
      dragState = null;
      hideCaption();
      if(wasTap){
        App.sheet.open(id);
      } else {
        persist();
        render();
      }
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
  }

  /* ---------- État vide ---------- */
  function maybeShowEmpty(){
    const wrap = document.querySelector('#view-matrix .matrix-wrap');
    let empty = document.getElementById('matrix-empty');
    const count = scopedTasks().length;
    if(count === 0){
      const title = state.activeParentId ? "Aucune sous-tâche pour l'instant" : "Aucune tâche pour l'instant";
      const sub = "Ajoutez-en une pour la voir apparaître sur la matrice";
      if(!empty){
        empty = document.createElement('div');
        empty.id = 'matrix-empty';
        empty.className = 'empty-state';
        document.getElementById('view-matrix').appendChild(empty);
      }
      empty.innerHTML = `<span class="ic">🧭</span><strong>${title}</strong><span>${sub}</span><button class="empty-cta" id="empty-add-btn">${state.activeParentId ? 'Ajouter une sous-tâche' : 'Ajouter une tâche'}</button>`;
      document.getElementById('empty-add-btn').addEventListener('click', ()=> App.sheet.open(null));
      wrap.style.display = 'none';
      document.getElementById('matrix-legend').style.display = 'none';
    } else {
      if(empty) empty.remove();
      wrap.style.display = '';
      document.getElementById('matrix-legend').style.display = '';
    }
  }

  App.matrix = { init, render, maybeShowEmpty };
})();
