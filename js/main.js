/* PREVIEW STUB + MOTION — renders content and drives the entrance choreography.
   (Render bits are stubs; the motion block is the real redesign behavior.) */
(function () {
  var D = window.DATA || {};
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = matchMedia("(max-width: 760px)").matches;

  /* ---------- render content ---------- */
  var skills = document.getElementById("skills");
  if (skills && D.skills) {
    skills.innerHTML = D.skills.map(function (s) {
      return '<div class="row"><span class="lab">' + s.lab + '</span><span class="val' +
        (s.dim ? ' dim' : '') + '">' + s.val + '</span></div>';
    }).join("");
  }

  var fc = document.getElementById("feat-copy");
  if (fc && D.featured) {
    var f = D.featured;
    fc.innerHTML =
      '<div class="feat-proof">Live demo · <b>real-time</b></div>' +
      '<h3 class="feat-title">' + f.title + '</h3>' +
      '<p class="feat-desc">' + f.desc + '</p>' +
      '<div class="feat-tags">' + f.tags.map(function (t) { return '<span>' + t + '</span>'; }).join("") + '</div>' +
      '<div class="feat-links">' + f.links.map(function (l) { return '<a class="link" href="' + l[1] + '">' + l[0] + '</a>'; }).join("") + '</div>' +
      '<p class="feat-run">' + f.run + '</p>';
  }

  var xp = document.getElementById("xp");
  if (xp && D.experience) {
    var e = D.experience;
    xp.innerHTML =
      '<div class="xp-top"><span class="xp-role">' + e.role + (e.org ? ' <span class="org">@ ' + e.org + '</span>' : '') + '</span>' +
      '<span class="xp-when">' + e.when + '</span></div>' +
      '<div class="xp-note">' + e.note + '</div>' +
      '<div class="xp-body"><ul>' + e.points.map(function (p) { return '<li>' + p + '</li>'; }).join("") + '</ul></div>' +
      '<div class="xp-tags">' + e.tags.map(function (t) { return '<span>' + t + '</span>'; }).join("") + '</div>';
  }

  var index = document.getElementById("index");
  if (index && D.projects) {
    index.innerHTML = D.projects.map(function (p, i) {
      return '<li class="card" style="--i:' + i + '"><a href="' + (p.href || "#") + '" target="_blank" rel="noopener">' +
        '<div class="card-top"><span class="no">' + p.no + '</span><span class="arr">\u2197</span></div>' +
        '<span class="ttl">' + p.ttl + '</span>' +
        '<span class="role">' + p.role + '</span>' +
        '<p class="desc">' + p.desc + '</p>' +
        '<div class="tags">' + p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join("") + '</div>' +
        '</a></li>';
    }).join("");
  }

  /* ---------- entrance choreography: reveal on scroll ---------- */
  var targets = [].slice.call(document.querySelectorAll("[data-anim], .index .card"));
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach(function (t) { t.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          if (en.target.hasAttribute("data-decode")) runDecode(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- pointer-tilt on project cards (transform stays on the card link only) ---------- */
  if (!reduce && !small) {
    document.querySelectorAll(".index .card a").forEach(function (a) {
      var card = a.parentElement;
      a.addEventListener("pointermove", function (ev) {
        if (!card.classList.contains("in")) return;
        var r = a.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5;
        var py = (ev.clientY - r.top) / r.height - 0.5;
        a.style.transform = "rotateY(" + (px * 7).toFixed(2) + "deg) rotateX(" + (-py * 7).toFixed(2) + "deg) translateZ(6px)";
      });
      a.addEventListener("pointerleave", function () { a.style.transform = ""; });
    });
  }

  /* ---------- redaction -> decode email (ties to the censor theme) ---------- */
  function runDecode(el) {
    var full = el.getAttribute("data-decode") || el.textContent;
    if (reduce) { el.textContent = full; return; }
    var blocks = "\u2588\u2593\u2592\u2591@#%&$".split("");
    var frame = 0, total = full.length;
    el.classList.add("decoding");
    var timer = setInterval(function () {
      frame++;
      var revealed = Math.floor(frame / 3);
      var out = "";
      for (var i = 0; i < total; i++) {
        if (full[i] === "@" || full[i] === ".") { out += full[i]; continue; }
        out += i < revealed ? full[i] : blocks[(Math.random() * blocks.length) | 0];
      }
      el.textContent = out;
      if (revealed >= total) { el.textContent = full; el.classList.remove("decoding"); clearInterval(timer); }
    }, 38);
  }

  /* ---------- magnetic email ---------- */
  var mail = document.getElementById("mail-magnet");
  if (mail && !reduce && !small) {
    mail.addEventListener("pointermove", function (ev) {
      var r = mail.getBoundingClientRect();
      var x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2);
      mail.style.transform = "translate(" + (x * 0.12).toFixed(1) + "px," + (y * 0.18).toFixed(1) + "px)";
    });
    mail.addEventListener("pointerleave", function () { mail.style.transform = ""; });
  }

  /* ---------- mount the real chess board (lazily, when #play scrolls in) ---------- */
  var chessMount = document.getElementById("chess-mount");
  if (chessMount && window.ChessGame) {
    var started = false;
    var startBoard = function () {
      if (started) return; started = true;
      window.ChessGame.mount(chessMount, { skill: 6, lichess: (D.lichess || "https://lichess.org/@/Akera_bot") })
        .then(function (ctrl) { window.__resetFeatureBoard = function () { ctrl && ctrl.reset(); }; });
    };
    window.__focusFeatureBoard = function () {
      var sec = document.getElementById("play");
      if (sec) sec.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      startBoard();
    };
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { startBoard(); cio.disconnect(); } });
    }, { threshold: 0.2 });
    cio.observe(chessMount);
  }
})();
