(function () {
  const D = window.DATA;
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;

  // ---- skills ----
  const sk = document.getElementById("skills");
  if (sk) sk.innerHTML =
    `<div class="row"><span class="lab">What I build</span><span class="val">${esc((D.skillsBuild||[]).join("  ·  "))}</span></div>` +
    `<div class="row"><span class="lab">Languages</span><span class="val">${esc(D.skillsCore.join("  ·  "))}</span></div>` +
    `<div class="row"><span class="lab">Comfortable in</span><span class="val dim">${esc(D.skillsComfortable.join("  ·  "))}</span></div>` +
    `<p class="note">Once you've shipped a C++ engine and a gRPC service, a new language is a weekend, not a wall.</p>`;

  // ---- experience ----
  const xp = document.getElementById("xp");
  if (xp) {
    const e = D.experience;
    xp.innerHTML =
      `<div class="xp-top"><div class="xp-role">${esc(e.role)} · <span class="org">${esc(e.org)}</span></div>
        <div class="xp-when">${esc(e.when)}</div></div>
       <div class="xp-note">${esc(e.orgNote)}</div>
       <div class="xp-body"><p>${esc(e.body)}</p>
         <ul>${e.points.map((p)=>`<li>${esc(p)}</li>`).join("")}</ul>
         <div class="xp-tags">${e.tags.map((t)=>`<span>${esc(t)}</span>`).join("")}</div>
       </div>`;
  }

  // ---- featured project (audio censor) ----
  const feat = document.getElementById("feature");
  if (feat) {
    const f = D.featured;
    feat.innerHTML = `
      <div>
        <div class="feat-proof"><b>${esc(f.proof)}</b></div>
        <h3 class="feat-title">${esc(f.name)}</h3>
        <p class="feat-desc">${esc(f.desc)}</p>
        <div class="feat-tags">${f.tags.map((t)=>`<span>${esc(t)}</span>`).join("")}</div>
        <div class="feat-links">
          <a class="link" href="${f.repo}" target="_blank" rel="noopener">Source ↗</a>
          <a class="link accent" href="http://localhost:8000" target="_blank" rel="noopener">Live mic demo ↗</a>
        </div>
        <p class="feat-run">Run it on your mic: start the local server, then open <code>localhost:8000</code> and talk.</p>
      </div>
      <div class="feat-visual" aria-hidden="true">
        <div class="wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="wave-label">speech&nbsp;→&nbsp;<span class="accent">[ beep ]</span>&nbsp;→&nbsp;out</div>
      </div>`;
  }

  // ---- chess play panel (its own small interactive feature) ----
  const chessMount = document.getElementById("chess-mount");
  if (chessMount) {
    let started = false;
    const startBoard = () => {
      if (started || !window.ChessGame) return; started = true;
      window.ChessGame.mount(chessMount, { skill: 6, lichess: D.lichess }).then((ctrl) => {
        window.__resetFeatureBoard = () => ctrl && ctrl.reset();
      });
    };
    window.__focusFeatureBoard = () => {
      const sec = document.getElementById("play");
      if (sec) sec.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      startBoard();
    };
    const bio = new IntersectionObserver((en) => { en.forEach((x) => { if (x.isIntersecting) { startBoard(); bio.disconnect(); } }); }, { threshold: .25 });
    bio.observe(chessMount);
  }

  // ---- project index ----
  const idx = document.getElementById("index");
  if (idx) {
    idx.innerHTML = D.projects.map((p, i) => `
      <li><a href="${p.repo}" target="_blank" rel="noopener">
        <span class="no">0${i + 2}</span>
        <span class="meta">
          <span class="ttl">${esc(p.name)} <span class="arr">↗</span></span>
          <span class="role">${esc(p.role)}</span>
          <span class="desc">${esc(p.desc)}</span>
        </span>
        <span class="tags">${p.tags.join(" · ")}</span>
      </a></li>`).join("");
  }


  // ---- scroll reveal w/ stagger ----
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  if (reduce) { reveals.forEach((el) => el.classList.add("is-visible")); }
  else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const sibs = Array.from(en.target.parentElement.children).filter((c)=>c.classList.contains("reveal"));
          const pos = sibs.indexOf(en.target);
          en.target.style.transitionDelay = Math.min(pos, 5) * 70 + "ms";
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  // ---- one magnetic element: the contact email ----
  const mag = document.getElementById("mail-magnet");
  if (mag && finePointer && !reduce) {
    mag.addEventListener("mousemove", (e) => {
      const r = mag.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width/2)) * 0.3;
      const y = (e.clientY - (r.top + r.height/2)) * 0.3;
      mag.style.transform = `translate(${Math.max(-10,Math.min(10,x))}px,${Math.max(-10,Math.min(10,y))}px)`;
    });
    mag.addEventListener("mouseleave", () => {
      mag.style.transition = "transform .35s var(--ease,cubic-bezier(.22,1,.36,1))";
      mag.style.transform = "translate(0,0)";
      setTimeout(() => (mag.style.transition = ""), 350);
    });
    mag.addEventListener("mouseenter", () => (mag.style.transition = ""));
  }
})();
