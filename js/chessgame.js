// Real chess for a static site (works from file:// and GitHub Pages, no headers):
//   chess.js@0.10.3  — last UMD build, exposes window.Chess via a plain <script>
//   stockfish.js@10.0.0/stockfish.js — pure asm.js, no .wasm, no SharedArrayBuffer
//   loaded as a Blob-URL Worker so it isn't blocked cross-origin on file://.
(function () {
  const GLYPH = { p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚" };
  const CHESSJS = "https://cdn.jsdelivr.net/npm/chess.js@0.10.3/chess.js";
  const SF = "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.0/stockfish.js";
  // cburnett piece set (the classic lichess/chess.com "wikipedia" style), served
  // from jsdelivr's GitHub mirror of lichess. Verified all 12 codes return 200.
  // codes are {color}{TYPE}, e.g. wK, bP. type letters from chess.js are p/n/b/r/q/k.
  const PIECES = "https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/cburnett";
  const pieceUrl = (cell) => `${PIECES}/${cell.color}${cell.type.toUpperCase()}.svg`;

  function loadScript(url) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = url; s.onload = res; s.onerror = () => rej(new Error("load " + url));
      document.head.appendChild(s);
    });
  }

  window.ChessGame = {
    async mount(host, opts = {}) {
      host.innerHTML = `<div class="cg-loading">loading the board…</div>`;
      // 1) chess.js (rules) — UMD global
      try {
        if (typeof window.Chess !== "function") await loadScript(CHESSJS);
        if (typeof window.Chess !== "function") throw new Error("no global Chess");
      } catch (e) {
        host.innerHTML = `<div class="cg-fallback">Couldn't load the board.
          <a class="link accent" href="${opts.lichess || "https://lichess.org"}" target="_blank" rel="noopener">Play on Lichess ↗</a></div>`;
        return null;
      }
      const Chess = window.Chess;

      // 2) Stockfish via Blob-URL worker (file:// + Pages safe). Falls back to a
      //    tiny built-in negamax if the engine can't be fetched (offline).
      let engine = null, useBuiltin = false;
      try {
        const code = await fetch(SF).then((r) => { if (!r.ok) throw 0; return r.text(); });
        const url = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
        engine = new Worker(url);
        engine.postMessage("uci");
        engine.postMessage("isready");
      } catch (_) { useBuiltin = true; }

      const game = new Chess();
      let sel = null, last = null, flipped = false, busy = false;

      host.innerHTML = `
        <div class="cg-board" id="cg-board"></div>
        <div class="cg-bar">
          <button class="cg-btn" data-act="new">New game</button>
          <button class="cg-btn" data-act="undo">Undo</button>
          <button class="cg-btn" data-act="resign">Resign</button>
          <button class="cg-btn" data-act="flip">Flip</button>
        </div>
        <div class="cg-status" id="cg-status"></div>`;
      const boardEl = host.querySelector("#cg-board");
      const statusEl = host.querySelector("#cg-status");
      host.querySelectorAll(".cg-btn").forEach((b) => b.addEventListener("click", () => act(b.dataset.act)));
      const setStatus = (t) => { statusEl.textContent = t; };

      function render() {
        const b = game.board();
        let h = "";
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          const rr = flipped ? 7 - r : r, cc = flipped ? 7 - c : c;
          const cell = b[rr][cc];
          const name = "abcdefgh"[cc] + (8 - rr);
          let cls = "cg-sq " + (((rr + cc) % 2) ? "dk" : "lt");
          if (sel === name) cls += " sel";
          if (last && (last.from === name || last.to === name)) cls += " last";
          if (sel) { const ms = game.moves({ square: sel, verbose: true });
            if (ms.some((m) => m.to === name)) cls += (cell ? " cap" : " mv"); }
          // piece graphic from CDN; on load error swap to a unicode glyph so a
          // square is never empty when offline / the image 404s.
          const pc = cell
            ? `<img class="cg-pc" alt="${cell.color}${cell.type}" draggable="false" src="${pieceUrl(cell)}"
                 onerror="this.outerHTML='&lt;span class=&quot;cg-pc cg-glyph ${cell.color}&quot;&gt;${GLYPH[cell.type]}&lt;/span&gt;'">`
            : "";
          // chess.com-style edge coordinates: files on the bottom row, ranks on the left col
          let coord = "";
          if (c === 0) coord += `<span class="cg-coord rank">${8 - rr}</span>`;
          if (r === 7) coord += `<span class="cg-coord file">${"abcdefgh"[cc]}</span>`;
          h += `<div class="${cls}" data-sq="${name}">${coord}${pc}</div>`;
        }
        boardEl.innerHTML = h;
        boardEl.querySelectorAll(".cg-sq").forEach((el) => {
          el.addEventListener("click", () => onClick(el.dataset.sq));
          el.addEventListener("pointerdown", (e) => onPointerDown(e, el));
        });
      }

      // attempt a human move; returns true if it was legal
      function tryMove(from, to) {
        if (busy || game.game_over() || game.turn() !== "w" || from === to) return false;
        const mv = game.move({ from, to, promotion: "q" });
        if (!mv) return false;
        last = { from: mv.from, to: mv.to }; sel = null; render(); afterHuman(); return true;
      }

      function onClick(name) {
        if (justDragged) { justDragged = false; return; } // the drag already handled this square
        if (dragging) return;
        if (busy || game.game_over() || game.turn() !== "w") return;
        if (sel && tryMove(sel, name)) return;
        const moves = game.moves({ square: name, verbose: true });
        sel = moves.length ? name : null;
        render();
      }

      // ---- drag & drop ----
      let dragging = null, justDragged = false;
      function onPointerDown(e, el) {
        if (busy || game.game_over() || game.turn() !== "w") return;
        const from = el.dataset.sq, piece = game.get(from);
        if (!piece || piece.color !== "w") return;          // only drag your own pieces
        e.preventDefault();
        sel = from;                                          // show legal-move dots
        render();
        const img = boardEl.querySelector(`.cg-sq[data-sq="${from}"] .cg-pc`);
        const rect = (img || el).getBoundingClientRect();
        const ghost = (img ? img.cloneNode(true) : document.createElement("div"));
        ghost.className = "cg-drag";
        ghost.style.width = rect.width + "px"; ghost.style.height = rect.height + "px";
        document.body.appendChild(ghost);
        if (img) img.style.visibility = "hidden";
        dragging = { from, ghost, fromEl: el, img };
        moveGhost(e.clientX, e.clientY);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp, { once: true });
      }
      function moveGhost(x, y) {
        const g = dragging.ghost;
        g.style.left = x + "px"; g.style.top = y + "px";
      }
      function squareAt(x, y) {
        const el = document.elementFromPoint(x, y);
        const sq = el && el.closest && el.closest(".cg-sq");
        return sq ? sq.dataset.sq : null;
      }
      function onPointerMove(e) {
        if (!dragging) return;
        moveGhost(e.clientX, e.clientY);
        // hover highlight
        const over = squareAt(e.clientX, e.clientY);
        boardEl.querySelectorAll(".cg-sq.hover").forEach((s) => s.classList.remove("hover"));
        if (over) { const s = boardEl.querySelector(`.cg-sq[data-sq="${over}"]`); if (s) s.classList.add("hover"); }
      }
      function onPointerUp(e) {
        if (!dragging) return;
        const to = squareAt(e.clientX, e.clientY), from = dragging.from;
        dragging.ghost.remove();
        if (dragging.img) dragging.img.style.visibility = "";
        const d = dragging; dragging = null;
        window.removeEventListener("pointermove", onPointerMove);
        boardEl.querySelectorAll(".cg-sq.hover").forEach((s) => s.classList.remove("hover"));
        justDragged = true; // suppress the click that fires right after pointerup
        if (to && to !== from) { if (!tryMove(from, to)) render(); }
        else render();
      }
      function afterHuman() { if (checkEnd()) return; setStatus("thinking…"); busy = true; setTimeout(aiMove, 150); }

      function aiMove() {
        if (game.game_over()) { busy = false; return; }
        if (engine && !useBuiltin) {
          engine.onmessage = (e) => {
            const line = typeof e.data === "string" ? e.data : (e.data && e.data.line) || "";
            const m = line.match(/^bestmove\s+(\w{2})(\w{2})(\w)?/);
            if (m) {
              game.move({ from: m[1], to: m[2], promotion: m[3] || "q" });
              last = { from: m[1], to: m[2] }; busy = false; render(); checkEnd();
            }
          };
          engine.postMessage("position fen " + game.fen());
          engine.postMessage("go movetime 700");
        } else {
          const mv = bestMove(game, 2);
          if (mv) { game.move(mv); last = { from: mv.from, to: mv.to }; }
          busy = false; render(); checkEnd();
        }
      }

      function checkEnd() {
        if (!game.game_over()) { setStatus(game.in_check() ? "check — your move" : "your move"); return false; }
        if (game.in_checkmate()) setStatus(game.turn() === "w" ? "checkmate — engine wins. gg." : "checkmate — you win!");
        else if (game.in_stalemate()) setStatus("stalemate — draw");
        else if (game.in_draw()) setStatus("draw");
        else setStatus("game over");
        return true;
      }

      function act(a) {
        if (a === "new") { game.reset(); sel = null; last = null; busy = false; render(); setStatus("your move — you're white"); }
        else if (a === "undo") { if (busy) return; game.undo(); game.undo(); sel = null; last = null; render(); checkEnd(); }
        else if (a === "resign") { if (!game.game_over()) setStatus("you resigned — New game to rematch"); }
        else if (a === "flip") { flipped = !flipped; render(); }
      }

      // tiny negamax — used only if Stockfish can't load (offline)
      const VAL = { p:1, n:3, b:3.2, r:5, q:9, k:0 };
      function evalBoard(g) { let s = 0; for (const row of g.board()) for (const c of row) if (c) s += (c.color === "w" ? 1 : -1) * VAL[c.type]; return s; }
      function bestMove(g, depth) {
        let best = null, bestScore = Infinity;
        for (const m of g.moves({ verbose: true })) { g.move(m); const sc = nega(g, depth - 1); g.undo();
          if (sc < bestScore) { bestScore = sc; best = m; } }
        return best;
      }
      function nega(g, d) {
        if (d === 0 || g.game_over()) return evalBoard(g);
        const w = g.turn() === "w"; let best = w ? -Infinity : Infinity;
        for (const m of g.moves()) { g.move(m); const sc = nega(g, d - 1); g.undo();
          best = w ? Math.max(best, sc) : Math.min(best, sc); }
        return best;
      }

      render();
      setStatus(useBuiltin ? "your move (offline opponent — connect for the strong engine)" : "your move — you're white");
      return { reset: () => act("new") };
    },
  };
})();
