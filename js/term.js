/* A little shell in the browser. Real (explore-only): ls, cd, cat, pwd, clear,
   help over a seeded portfolio filesystem. Everything else returns a gimmick.
   100% vanilla JS. */
(function () {
  const out = document.getElementById("output");
  const term = document.getElementById("term");
  const hidden = document.getElementById("hidden");
  const typedEl = document.getElementById("typed");
  const ghostEl = document.getElementById("ghost");
  const caret = document.getElementById("caret");
  const ps1El = document.getElementById("ps1");
  if (!term || !hidden) return;

  const USER = "abdulrhman", HOST = "web", KEY = "shell.fs.v1";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ---------- virtual filesystem ----------
  // node: {type:'dir', children:{name:node}} | {type:'file', content:string}
  function seed() {
    return { type: "dir", children: {
      "about.txt": { type: "file", content:
        "Abdulrhman — ML & systems engineer, Jeddah.\n" +
        "I build machine-learning and backend systems and ship them to production.\n" +
        "Day job: ML engineer at QEU (q-commerce grocery).\n" },
      "projects": { type: "dir", children: {
        "audio-censor.md": { type: "file", content: "Real-time speech moderation — catches flagged words live and removes them before you hear them.\ngithub.com/abodefy43-spec/audio-censor\n" },
        "recommendation-engine.md": { type: "file", content: "Personalizes what customers see across a live q-commerce platform, in real time.\ngithub.com/abodefy43-spec/bundling-system\n" },
        "ripper-chess.md": { type: "file", content: "Chess engine built from scratch, plays on Lichess ~2000-2200 (@Akera_bot).\ngithub.com/abodefy43-spec/chess\n" },
        "dar_nakheel.md": { type: "file", content: "Augmented-reality app — place furniture in your real room from your phone.\ngithub.com/abodefy43-spec/dar-nakheel\n" },
      } },
      "contact.txt": { type: "file", content: "email   abodefy43@gmail.com\ngithub  github.com/abodefy43-spec\nlichess lichess.org/@/Akera_bot\n" },
      "readme.txt": { type: "file", content: "Look around: ls, cd projects, cat about.txt, cat contact.txt.\nCommands: ls, cd, cat, pwd, clear, help.\n" },
    } };
  }
  let root, cwd; // cwd = array of path segments
  function load() { root = seed(); cwd = []; }   // explore-only: always a fresh tree
  function save() {}

  function nodeAt(segs) { let n = root; for (const s of segs) { if (!n || n.type !== "dir" || !n.children[s]) return null; n = n.children[s]; } return n; }
  function resolve(path) {
    // -> array of segments (absolute)
    let segs = path.startsWith("/") ? [] : cwd.slice();
    for (const part of path.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") { if (segs.length) segs.pop(); }
      else segs.push(part);
    }
    return segs;
  }
  const parentOf = (segs) => segs.slice(0, -1);
  const baseOf = (segs) => segs[segs.length - 1];
  const pathStr = (segs) => "/" + segs.join("/");
  const cwdShort = () => "~" + (cwd.length ? "/" + cwd.join("/") : "");

  // ---------- output ----------
  function print(html, cls) { const d = document.createElement("div"); d.className = "line" + (cls ? " " + cls : ""); d.innerHTML = html; out.appendChild(d); scroll(); return d; }
  const blank = () => print("&nbsp;");
  const scroll = () => { term.scrollTop = term.scrollHeight; };
  function promptHTML() {
    return `<span class="p-user">${USER}@${HOST}</span><span class="p-c">:</span><span class="p-path">${esc(cwdShort())}</span><span class="p-c">$</span>`;
  }
  function setPrompt() { ps1El.innerHTML = promptHTML(); }

  // ---------- commands ----------
  const CMD = {
    help() {
      const rows = [
        ["ls [path]", "list a directory"], ["cd <dir>", "change directory"],
        ["cat <file>", "show a file"], ["pwd", "print working dir"],
        ["clear", "clear the screen"], ["help", "this list"],
      ];
      blank();
      rows.forEach(([c, d]) => print(`  <span class="t-cmd cmd-name">${esc(c)}</span><span class="t-dim cmd-desc">${esc(d)}</span>`));
      blank();
      blank();
    },
    pwd() { print(esc(pathStr(cwd) === "/" ? "/" : pathStr(cwd))); },
    clear() { out.innerHTML = ""; },

    ls(args) {
      const target = args.find((a) => !a.startsWith("-")) || ".";
      const segs = resolve(target); const n = nodeAt(segs);
      if (!n) return err(`ls: ${target}: no such file or directory`);
      if (n.type === "file") return print(esc(baseOf(segs)));
      const names = Object.keys(n.children).sort();
      if (!names.length) return;
      print(names.map((nm) => n.children[nm].type === "dir"
        ? `<span class="t-dir t-clk" data-run="cd ${esc(joinDisp(target, nm))}">${esc(nm)}/</span>`
        : `<span class="t-file">${esc(nm)}</span>`).join("   "));
    },
    cd(args) {
      const t = args[0] || "";
      if (!t || t === "~") { cwd = []; return setPrompt(); }
      const segs = resolve(t); const n = nodeAt(segs);
      if (!n) return err(`cd: ${t}: no such file or directory`);
      if (n.type !== "dir") return err(`cd: ${t}: not a directory`);
      cwd = segs; setPrompt();
    },
    cat(args) {
      if (!args[0]) return err("cat: missing file");
      for (const a of args) {
        const n = nodeAt(resolve(a));
        if (!n) { err(`cat: ${a}: no such file or directory`); continue; }
        if (n.type === "dir") { err(`cat: ${a}: is a directory`); continue; }
        n.content.split("\n").forEach((l) => print(esc(l) || "&nbsp;"));
      }
    },
  };
  const ALIAS = { dir: "ls", cls: "clear", man: "help", "?": "help" };

  function joinDisp(base, name) { return base === "." ? name : base.replace(/\/$/, "") + "/" + name; }
  function err(msg) { print(`<span class="t-red">${esc(msg)}</span>`); }

  // ---------- hidden easter egg ----------
  function maybeEgg(raw) {
    const c = raw.replace(/\s+/g, " ").trim().toLowerCase();
    if (/^sudo\s+rm\s+-rf?\s+(\/\*?|\/|\*|~|\.)/.test(c) || c === "rm -rf /" || c === "rm -rf /*") {
      let pct = 0;
      const d = print(`<span class="t-red">deleting everything… 0%</span>`);
      const iv = setInterval(() => {
        pct += Math.floor(Math.random() * 18) + 7;
        if (pct >= 100) {
          clearInterval(iv);
          d.innerHTML = `<span class="t-red">deleting everything… 100%</span>`;
          print(`<span class="t-grn">just kidding — it's all still here.</span> <span class="t-dim">(your files are safe in localStorage)</span>`);
          setPrompt();
        } else d.innerHTML = `<span class="t-red">deleting everything… ${pct}%</span>`;
      }, 140);
      return true;
    }
    if (c === "sudo" || c.startsWith("sudo ")) { print(`<span class="t-yel">nice try.</span> <span class="t-dim">there is no root here, only vibes.</span>`); return true; }
    return false;
  }

  // funny responses for real commands people try that I didn't implement,
  // plus a witty fallback for anything unknown.
  const JOKES = {
    vim: "vim opened. just kidding — you're trapped forever now. (jk, type anything)",
    vi: "vim opened. just kidding — you're trapped forever now. (jk, type anything)",
    nano: "nano? in MY terminal? use 'write <file>' like a civilized person.",
    emacs: "emacs is a great operating system, lacking only a decent text editor. try 'write'.",
    git: "no repos here — but my real code is at github.com/abodefy43-spec",
    npm: "npm install… 4,000 dependencies for a left-pad. not today.",
    python: "python: this shell is 100% hand-written JS. no snakes allowed.",
    python3: "python: this shell is 100% hand-written JS. no snakes allowed.",
    node: "you're already running JS, friend. it's turtles all the way down.",
    exit: "you can't leave. (scroll up — the rest of the site is right there.)",
    ssh: "connecting to prod… connection refused. good. stay away from prod.",
    curl: "curl: (7) couldn't connect — this little shell has no internet, only files.",
    wget: "wget: nothing to fetch in a browser sandbox. try 'cat readme.txt'.",
    apt: "apt: are you on the right machine? this is a portfolio, not Debian.",
    "apt-get": "apt: are you on the right machine? this is a portfolio, not Debian.",
    brew: "brew install coffee… ☕ done. productivity +10.",
    docker: "docker: cannot connect to the Docker daemon. (there isn't one.)",
    kubectl: "kubectl: 0 clusters. blessed are the ones without kubernetes.",
    ping: "ping localhost… 64 bytes from yourself: it me.",
    cd: "cd to where? you're already living your best life here.",
    htop: "CPU: vibes. RAM: a couple of files. LOAD: chill.",
    neofetch: "OS: a portfolio · Shell: handwritten JS · Uptime: as long as this tab · Pieces: yes",
    cowsay: "the cow is on break. try 'help'.",
    hack: "you're now in. (you were always in. it's a public website.)",
    rm: "rm? this is a look-but-don't-touch shell. nothing to delete, friend.",
    mkdir: "no building permits issued here — this shell is read-only. try 'ls'.",
    touch: "can't touch this. 🎶 (read-only shell — try 'cat <file>'.)",
    mv: "everything's exactly where it should be. nothing to move.",
    cp: "copy that. (just kidding — read-only. try 'cat'.)",
    write: "no writing here, only reading. try 'cat about.txt'.",
    tree: "the forest is just: about.txt, projects/, contact.txt, readme.txt. type 'ls'.",
    whoami: "you're a visitor with great taste. I'm abdulrhman — 'cat about.txt'.",
    history: "history is written by the winners. yours isn't saved here.",
    chmod: "permissions are vibes-based here. everyone's an admin of nothing.",
    kill: "no processes to kill — just a calm little shell.",
    ps: "no running processes. it's very zen in here.",
  };

  // ---------- run ----------
  const hist = []; let hi = -1; let buffer = ""; let busy = false;
  function run(raw) {
    print(`${promptHTML()} <span class="t-input">${esc(raw)}</span>`, "echo");
    const line = raw.trim();
    if (line) { hist.push(line); hi = hist.length; }
    if (!line) return;
    if (maybeEgg(line)) return;
    const parts = line.match(/"[^"]*"|'[^']*'|\S+/g) || [];
    let name = (parts[0] || "").toLowerCase(); name = ALIAS[name] || name;
    const fn = CMD[name];

    // small delay so it feels like a real shell working, not instant.
    busy = true; caret.classList.add("hide");
    const work = () => {
      busy = false; if (document.activeElement === hidden) caret.classList.remove("hide");
      if (fn) { try { fn(parts.slice(1), line); } catch (e) { err("error: " + e); } }
      else if (JOKES[name]) print(`<span class="t-dim">${esc(JOKES[name])}</span>`);
      else print(`<span class="t-red">${esc(parts[0])}: command not found.</span> <span class="t-dim">${esc(witty(name))}</span>`);
    };
    setTimeout(work, 120 + Math.random() * 220);
  }
  const WITTY = [
    "(this shell only knows the basics — try help)",
    "(bold of you to assume that exists)",
    "(have you tried turning it into a real command? type help)",
    "(404: command had better things to do)",
    "(my terminal, my rules — see help)",
    "(that's not a thing here, but I admire the confidence)",
  ];
  let wittyN = 0;
  function witty() { return WITTY[(wittyN++) % WITTY.length]; }

  // ---------- completion ----------
  function complete(buf) {
    const parts = buf.split(/\s+/);
    if (parts.length === 1) {
      const names = Object.keys(CMD).concat(Object.keys(ALIAS));
      return [...new Set(names)].filter((k) => k.startsWith(parts[0]) && k !== parts[0]).sort();
    }
    const frag = parts[parts.length - 1];
    const slash = frag.lastIndexOf("/");
    const dirPart = slash >= 0 ? frag.slice(0, slash + 1) : "";
    const namePart = slash >= 0 ? frag.slice(slash + 1) : frag;
    const dirNode = nodeAt(resolve(dirPart || "."));
    if (!dirNode || dirNode.type !== "dir") return [];
    return Object.keys(dirNode.children).filter((nm) => nm.startsWith(namePart) && nm !== namePart)
      .map((nm) => dirPart + nm + (dirNode.children[nm].type === "dir" ? "/" : "")).sort();
  }
  function ghostFor(buf) {
    if (!buf) return "";
    const c = complete(buf);
    if (!c.length) return "";
    const parts = buf.split(/\s+/), lastLen = parts[parts.length - 1].length;
    return c[0].slice(lastLen);
  }
  function renderInput() { typedEl.textContent = buffer; ghostEl.textContent = ghostFor(buffer); }

  hidden.addEventListener("input", () => { buffer = hidden.value; renderInput(); });
  hidden.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); if (busy) return; const v = hidden.value; hidden.value = ""; buffer = ""; renderInput(); run(v); }
    else if (e.key === "Tab") { e.preventDefault(); const g = ghostFor(buffer); if (g) { buffer += g; hidden.value = buffer; renderInput(); } else { const c = complete(buffer); if (c.length > 1) print(`<span class="t-dim">${c.map(esc).join("   ")}</span>`); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) { hi--; buffer = hist[hi]; hidden.value = buffer; renderInput(); } }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (hi < hist.length - 1) { hi++; buffer = hist[hi]; } else { hi = hist.length; buffer = ""; } hidden.value = buffer; renderInput(); }
    else if ((e.key === "l" || e.key === "L") && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
    else if (e.key === "c" && e.ctrlKey) { e.preventDefault(); print(`${promptHTML()} <span class="t-input">${esc(buffer)}</span>^C`, "echo"); hidden.value = ""; buffer = ""; renderInput(); }
  });

  const focus = () => hidden.focus({ preventScroll: true });
  term.addEventListener("click", (e) => {
    const clk = e.target.closest("[data-run]");
    if (clk) { e.preventDefault(); run(clk.getAttribute("data-run")); focus(); return; }
    if (e.target.closest("a")) return;
    focus();
  });
  hidden.addEventListener("blur", () => caret.classList.add("hide"));
  hidden.addEventListener("focus", () => caret.classList.remove("hide"));
  caret.classList.add("hide");

  // keep wheel scrolling INSIDE the terminal — scroll its log, and only let the
  // page scroll once the terminal hits its top/bottom edge.
  term.addEventListener("wheel", (e) => {
    const canScroll = term.scrollHeight > term.clientHeight;
    if (!canScroll) return;
    const atTop = term.scrollTop <= 0, atBottom = term.scrollTop + term.clientHeight >= term.scrollHeight - 1;
    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return; // let page take over at the edges
    term.scrollTop += e.deltaY;
    e.preventDefault(); // consume it so the page doesn't also scroll
  }, { passive: false });

  // ---------- boot ----------
  load(); setPrompt(); renderInput();
  print(`<span class="t-dim">${USER}@${HOST}</span>`);
  print(`<span class="t-dim">type</span> <span class="t-clk" data-run="help">help</span> <span class="t-dim">or</span> <span class="t-clk" data-run="ls">ls</span> <span class="t-dim">to look around.</span>`);
  blank();
})();
