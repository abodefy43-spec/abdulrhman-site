(function () {
  const D = window.DATA;
  const out = document.getElementById("output");
  const term = document.getElementById("term");
  const hidden = document.getElementById("hidden");
  const typedEl = document.getElementById("typed");
  const ghostEl = document.getElementById("ghost");
  const caret = document.getElementById("caret");
  if (!term || !hidden) return;
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

  let buffer = "", booted = false;
  const history = []; let histIdx = -1;
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const print = (html, cls) => { const d=document.createElement("div"); d.className="line"+(cls?" "+cls:""); d.innerHTML=html; out.appendChild(d); scroll(); return d; };
  const blank = () => print("&nbsp;");
  const scroll = () => { term.scrollTop = term.scrollHeight; };

  const ALL = ["help","whoami","about","ls","cat","play","open","theme","grpc","clear","github","contact"];
  const CAT = {
    chess: "Ripper — C++20 chess engine. Bitboards, Lazy SMP, ~55M nps, ~2000–2200 Elo on Lichess. Try: play",
    recsys: "Q Bundle Recommender — gRPC service, 21 bundles/user over 9,000+ products, GCP Cloud Run. Try: grpc bench",
    vision: "Warehouse vision pipeline — detection cascade + CLIP verifier + VLM ensemble, on rented GPU.",
    "audio-censor": "Real-time audio censor — reconstructs words from ASR tokens, bleeps before you hear it. 3-thread VAD-gated engine.",
    ar: "dar_nakheel — Flutter + native Kotlin ARCore furniture-placement app.",
  };

  const C = {
    help() {
      print(`<span class="t-dim">commands — click or type:</span>`);
      const items = [["help","this list"],["whoami","one-liner"],["about","longer"],["ls","list projects"],
        ["cat <x>","project detail"],["play","play my chess engine"],["grpc bench","recsys latency"],
        ["open lichess","my bot"],["theme","toggle look"],["clear","clear"]];
      let h = `<div class="cmds">`; items.forEach(([c,d])=>h+=`<span class="c t-clk" data-cmd="${c.split(" ")[0]==="cat"?"cat chess":c.split(" ")[0]==="open"?"open lichess":c.split(" ")[0]}">${c}</span><span class="d">${esc(d)}</span>`);
      print(h+`</div>`);
      print(`<span class="t-dim">TAB completes · ↑/↓ history · every command also has a click target on the page.</span>`);
    },
    whoami(){ print(`<span class="t-grn">abdulrhman</span> <span class="t-dim">— ML &amp; systems engineer, Jeddah. ships recsys, CV, real-time audio, a C++ chess engine.</span>`); },
    about(){ blank(); print(`I design ML &amp; systems software and ship it. Day job: ML engineer at <span class="t-yel">QEU</span>.`);
      print(`Off the clock: a C++ chess engine (<span class="t-clk" data-cmd="play">play</span>), a real-time audio censor, a mobile AR app.`); },
    ls(){ print(`<span class="t-b">projects/</span>`);
      Object.keys(CAT).forEach((k)=>print(`  <span class="t-clk" data-cmd="cat ${k}">${k}</span>`)); },
    cat(a){ const k=(a[0]||"").toLowerCase(); if(CAT[k]) print(esc(CAT[k]).replace("play",`<span class="t-clk" data-cmd="play">play</span>`).replace("grpc bench",`<span class="t-clk" data-cmd="grpc bench">grpc bench</span>`));
      else print(`<span class="t-red">cat: no project '${esc(k)}'.</span> try <span class="t-clk" data-cmd="ls">ls</span>`); },
    play(){ print(`<span class="t-grn">opening the board…</span> <span class="t-dim">(scroll down — you're white)</span>`);
      if (window.__resetFeatureBoard) window.__resetFeatureBoard();
      if (window.__focusFeatureBoard) window.__focusFeatureBoard(); },
    grpc(a){ if((a[0]||"")!=="bench"){ print(`<span class="t-dim">usage: grpc bench</span>`); return; }
      print(`<span class="t-dim">GetRecommendations(user_id) — in-memory artifact, served per request:</span>`);
      print(`  p50  <span class="t-b">0.8 ms</span>   p95  <span class="t-b">2.1 ms</span>   p99  <span class="t-b">4.6 ms</span>`);
      print(`<span class="t-dim">artifact: 21 bundles/user · 9,000+ products · OOS patched live via webhook</span>`); },
    open(a){ if((a[0]||"")==="lichess"){ print(`<a class="t-link" href="${D.lichess}" target="_blank" rel="noopener">@${esc(D.lichessHandle)} ↗</a>`); window.open(D.lichess,"_blank","noopener"); }
      else print(`<span class="t-dim">usage: open lichess</span>`); },
    github(){ print(`<a class="t-link" href="${D.github}" target="_blank" rel="noopener">${esc(D.github)} ↗</a>`); },
    contact(){ print(`<a class="t-link" href="mailto:${D.email}">${esc(D.email)}</a> · <a class="t-link" href="${D.github}" target="_blank" rel="noopener">github ↗</a>`); },
    theme(){ document.body.classList.toggle("alt"); print(`<span class="t-dim">theme toggled.</span>`); },
    clear(){ out.innerHTML=""; },
  };
  const ALIAS = { "?":"help", info:"about", work:"ls", projects:"ls", cls:"clear", chess:"play" };

  function run(raw){
    const line = raw.trim();
    print(`<span class="ps1" style="display:inline">$</span> <span class="t-cmd">${esc(raw)}</span>`);
    if (line){ history.push(line); histIdx=history.length; }
    if (!line) return;
    const parts=line.split(/\s+/); let n=parts[0].toLowerCase(); n=ALIAS[n]||n;
    const fn=C[n];
    if (fn){ try{ fn(parts.slice(1)); }catch(e){ print(`<span class="t-red">err: ${esc(e)}</span>`); } }
    else print(`<span class="t-red">not found: ${esc(parts[0])}</span> — <span class="t-clk" data-cmd="help">help</span>`);
  }

  // completion / input
  const comps = (p)=>[...new Set([...ALL,...Object.keys(ALIAS)])].filter((k)=>k.startsWith(p)&&k!==p).sort();
  const ghostFor = (b)=>{ if(!b||/\s/.test(b))return ""; const c=comps(b); return c.length?c[0].slice(b.length):""; };
  const renderInput = ()=>{ typedEl.textContent=buffer; ghostEl.textContent=ghostFor(buffer); };

  hidden.addEventListener("input", ()=>{ buffer=hidden.value; renderInput(); });
  hidden.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){ e.preventDefault(); const v=hidden.value; hidden.value=""; buffer=""; renderInput(); run(v); }
    else if(e.key==="Tab"){ e.preventDefault(); const g=ghostFor(buffer); if(g){buffer+=g;hidden.value=buffer;renderInput();}
      else{const c=comps(buffer); if(c.length>1)print(`<span class="t-dim">${c.join("   ")}</span>`);} }
    else if(e.key==="ArrowUp"){ e.preventDefault(); if(histIdx>0){histIdx--;buffer=history[histIdx];hidden.value=buffer;renderInput();} }
    else if(e.key==="ArrowDown"){ e.preventDefault(); if(histIdx<history.length-1){histIdx++;buffer=history[histIdx];}else{histIdx=history.length;buffer="";} hidden.value=buffer; renderInput(); }
    else if((e.key==="l"||e.key==="L")&&e.ctrlKey){ e.preventDefault(); out.innerHTML=""; }
  });
  const focus = ()=>hidden.focus({preventScroll:true});
  term.addEventListener("click",(e)=>{ const clk=e.target.closest("[data-cmd]");
    if(clk){ e.preventDefault(); run(clk.getAttribute("data-cmd")); focus(); return; }
    if(e.target.closest("a"))return; focus(); });
  hidden.addEventListener("blur",()=>caret.classList.add("hide"));
  hidden.addEventListener("focus",()=>caret.classList.remove("hide"));
  caret.classList.add("hide");
  renderInput();

  // boot once, lazily (when terminal scrolls into view)
  function boot(){
    if (booted) return; booted = true;
    const lines = [
      `<span class="t-dim">booting abdulrhman.dev…</span>`,
      `<span class="t-dim">loaded:</span> chess-engine · recsys · cv-pipeline · audio-censor`,
      `<span class="t-grn">✓ ready.</span> <span class="t-dim">type</span> <span class="t-clk" data-cmd="help">help</span> <span class="t-dim">or</span> <span class="t-clk" data-cmd="play">play</span>`,
    ];
    if (reduce){ lines.forEach((l)=>print(l)); return; }
    let i=0; (function step(){ if(i>=lines.length) return; print(lines[i++]); setTimeout(step, 360); })();
  }
  const bw = document.getElementById("term-window");
  if (bw){ const io=new IntersectionObserver((en)=>{ en.forEach((x)=>{ if(x.isIntersecting){ boot(); io.disconnect(); } }); },{threshold:.3}); io.observe(bw); }
  else boot();
})();
