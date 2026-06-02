/* WORLDS — scroll-linked color. The page background is interpolated continuously
   from the scroll position (gamma-correct blend) so worlds melt smoothly as you
   scroll, with no lurchy stepped flip. Also: rail, hero cursor glow, dot-field,
   scroll-progress. (World-swap behavior is the real redesign; render is stubbed.) */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = matchMedia("(max-width: 760px)").matches;

  /* palette per world — [r,g,b] or [r,g,b,a]; must match the CSS html[data-world] blocks */
  var PAL = {
    hero:    {bg:[244,238,226], bg2:[234,224,206], ink:[27,26,23],    muted:[111,103,87],  accent:[180,82,45],   line:[216,204,182],          glow:[180,82,45,.26]},
    study:   {bg:[21,18,13],    bg2:[31,25,19],    ink:[244,236,222], muted:[169,156,133], accent:[216,133,75],  line:[255,255,255,.12],      glow:[216,133,75,.30]},
    studio:  {bg:[7,17,15],      bg2:[13,28,27],    ink:[233,246,242], muted:[122,155,151], accent:[52,224,200],  line:[255,255,255,.11],      glow:[52,224,200,.34]},
    lab:     {bg:[12,11,21],    bg2:[22,19,44],    ink:[242,237,250], muted:[144,133,168], accent:[180,140,255], line:[255,255,255,.11],      glow:[180,140,255,.32]},
    board:   {bg:[14,20,16],    bg2:[28,38,24],    ink:[240,243,233], muted:[148,160,124], accent:[134,171,99],  line:[255,255,255,.10],      glow:[134,171,99,.32]},
    signoff: {bg:[17,13,10],    bg2:[31,22,18],    ink:[248,241,232], muted:[164,147,125], accent:[236,176,102], line:[255,255,255,.11],      glow:[236,176,102,.34]}
  };
  var KEYS = ["bg","bg2","ink","muted","accent","line","glow"];

  /* gamma-correct channel blend (avoids muddy mid-tone on light<->dark) */
  function toLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
  function toSrgb(l){l=l<=0.0031308?l*12.92:1.055*Math.pow(l,1/2.4)-0.055;return Math.round(Math.min(1,Math.max(0,l))*255);}
  function lerpCh(a,b,t){return toSrgb(toLin(a)+(toLin(b)-toLin(a))*t);}
  function lerpCol(A,B,t){
    var r=lerpCh(A[0],B[0],t),g=lerpCh(A[1],B[1],t),b=lerpCh(A[2],B[2],t);
    var aA=A[3]==null?1:A[3], aB=B[3]==null?1:B[3], al=aA+(aB-aA)*t;
    return al>=0.999 ? "rgb("+r+","+g+","+b+")" : "rgba("+r+","+g+","+b+","+al.toFixed(3)+")";
  }

  /* sections + their top boundaries */
  var sections = [].slice.call(document.querySelectorAll("[data-world]"));
  var rail = [].slice.call(document.querySelectorAll(".rail a"));
  var BAND = 0.18;            // crossfade happens within ±(BAND*viewport) of a boundary; smaller = snappier
  var tops = [], worlds = [];
  function measure(){
    tops = []; worlds = [];
    sections.forEach(function(s){
      tops.push(s.getBoundingClientRect().top + window.scrollY);
      worlds.push(s.getAttribute("data-world"));
    });
  }

  var lastWorld = null;
  function setWorld(w){
    if (w === lastWorld) return;
    lastWorld = w;
    root.setAttribute("data-world", w);
    var id = null;
    sections.some(function(s){ if (s.getAttribute("data-world") === w){ id = s.id; return true; } });
    rail.forEach(function(a){ a.classList.toggle("on", a.getAttribute("href") === "#" + id); });
  }

  function apply(A, B, t){
    for (var i=0;i<KEYS.length;i++){ var k=KEYS[i]; root.style.setProperty("--"+k, lerpCol(A[k],B[k],t)); }
  }

  function update(){
    if (!tops.length) return;
    var n = tops.length;
    var y = window.scrollY + window.innerHeight * 0.5;
    var H = window.innerHeight * BAND;
    // active section = last one whose top is at/above the center line
    var i = 0;
    for (var k = 0; k < n; k++){ if (tops[k] <= y) i = k; else break; }
    var da = y - tops[i];                 // distance below this section's top boundary
    var db = (i < n-1) ? tops[i+1] - y : Infinity;  // distance above next boundary
    var canIn  = i > 0 && da < H;
    var canOut = i < n-1 && db < H;
    var A, B, t;
    if (canIn && (!canOut || da <= db)) {        // finishing the blend from the previous world
      A = worlds[i-1]; B = worlds[i]; t = 0.5 + da / (2*H);
    } else if (canOut) {                          // starting the blend toward the next world
      A = worlds[i]; B = worlds[i+1]; t = (H - db) / (2*H);
    } else {                                      // committed, solid world
      A = B = worlds[i]; t = 0;
    }
    if (reduce) t = t < 0.5 ? 0 : 1;
    apply(PAL[A], PAL[B], t);
    setWorld(t < 0.5 ? A : B);
  }

  /* rAF-throttled scroll loop */
  var ticking = false;
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(function(){ update(); ticking = false; }); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function(){ measure(); update(); });
  measure(); update();

  /* hero cursor glow */
  if (!reduce && !small) {
    window.addEventListener("pointermove", function (e) {
      root.style.setProperty("--mx", (e.clientX / innerWidth * 100).toFixed(1) + "%");
      root.style.setProperty("--my", (e.clientY / innerHeight * 100).toFixed(1) + "%");
    }, { passive: true });
  }

  /* dot-field constellation behind #work */
  var canvas = document.getElementById("dotfield");
  if (canvas && !reduce && !small) {
    var ctx = canvas.getContext("2d");
    var pts = [], W, H;
    function dfResize() {
      var host = canvas.parentElement;
      W = canvas.width = host.offsetWidth;
      H = canvas.height = host.offsetHeight;
      pts = [];
      var n = Math.min(70, Math.round(W * H / 22000));
      for (var i = 0; i < n; i++) pts.push({ x: Math.random()*W, y: Math.random()*H, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25 });
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      var acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#b48cff";
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dx = p.x-q.x, dy = p.y-q.y, d = Math.hypot(dx, dy);
          if (d < 120) { ctx.globalAlpha = (1 - d/120) * .18; ctx.strokeStyle = acc; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); }
        }
        ctx.globalAlpha = .5; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 7); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    dfResize(); tick(); addEventListener("resize", dfResize);
  }
})();
