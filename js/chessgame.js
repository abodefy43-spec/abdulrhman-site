// Real chess for a static site (works from file:// and GitHub Pages, no headers):
//   chess.js@0.10.3  — last UMD build, exposes window.Chess via a plain <script>
//   stockfish.js@10.0.0/stockfish.js — pure asm.js, no .wasm, no SharedArrayBuffer
//   loaded as a Blob-URL Worker so it isn't blocked cross-origin on file://.
(function () {
  const GLYPH = { p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚" };
  const CHESSJS = "https://cdn.jsdelivr.net/npm/chess.js@0.10.3/chess.js";
  const SF = "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.0/stockfish.js";

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
          const pc = cell ? `<span class="cg-pc ${cell.color}">${GLYPH[cell.type]}</span>` : "";
          h += `<div class="${cls}" data-sq="${name}">${pc}</div>`;
        }
        boardEl.innerHTML = h;
        boardEl.querySelectorAll(".cg-sq").forEach((el) => el.addEventListener("click", () => onClick(el.dataset.sq)));
      }

      function onClick(name) {
        if (busy || game.game_over() || game.turn() !== "w") return;
        if (sel) {
          const mv = game.move({ from: sel, to: name, promotion: "q" });
          sel = null;
          if (mv) { last = { from: mv.from, to: mv.to }; render(); afterHuman(); return; }
        }
        const moves = game.moves({ square: name, verbose: true });
        sel = moves.length ? name : null;
        render();
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
