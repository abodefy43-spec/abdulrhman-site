// Record-then-clean mic demo. You record a clip, hit stop, and the LOCAL detector
// server (the real Whisper/Parakeet engine + the real beep-splice censor) returns
// your audio with banned words bleeped out — then you play it back.
//
// Localhost-only: a webpage can't run the model, and a hosted HTTPS page can't
// reach a local http server. So this works when opened from the running server
// (http://localhost:8000); on the hosted site it shows how to start it.
(function () {
  const btn = document.getElementById("mic-btn");
  const stateEl = document.getElementById("mic-state");
  const flash = document.getElementById("mic-flash");
  const script = document.getElementById("mic-script");
  const note = document.getElementById("mic-note");
  if (!btn) return;

  const sameOrigin = location.port === "8000";
  const API = sameOrigin ? "" : "http://localhost:8000";
  const secure = location.protocol === "https:";

  if (secure) {
    note.innerHTML = `Runs my real Python detector + censor locally. A hosted HTTPS page can't reach a local server, so to try it: clone <a class="link" href="https://github.com/abodefy43-spec/audio-censor" target="_blank" rel="noopener">audio-censor</a>, start the server, open <code>localhost:8000</code>.`;
    btn.disabled = true; stateEl.textContent = "local-only";
    return;
  }
  note.innerHTML = `Record a clip, then it transcribes with Whisper large-v3 and beeps out banned words using the real censor — play back the cleaned audio below.`;

  let ctx, stream, node, srcNode, ws_unused;
  let recording = false, frames = [], player = null, reBtn = null;

  function setFlash(t, on) { flash.textContent = t; flash.classList.toggle("on", !!on); }

  // ---- live waveform (passive analyser tap; runs only while recording) ----
  const waveCanvas = document.getElementById("mic-wave");
  let analyser = null, waveRaf = 0;
  function startWave(src) {
    if (!waveCanvas || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .8;
    src.connect(analyser); // analyser has no output → no echo
    const cx = waveCanvas.getContext("2d");
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const data = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
      const w = waveCanvas.clientWidth, h = waveCanvas.clientHeight;
      if (waveCanvas.width !== w * DPR) { waveCanvas.width = w * DPR; waveCanvas.height = h * DPR; }
      analyser.getByteFrequencyData(data);
      cx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      const col = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2dd4bf";
      const bars = 48, step = Math.floor(data.length / bars), bw = waveCanvas.width / bars;
      cx.fillStyle = col;
      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255;
        const bh = Math.max(2 * DPR, v * waveCanvas.height * .92);
        cx.fillRect(i * bw + bw * .2, (waveCanvas.height - bh) / 2, bw * .6, bh);
      }
      waveRaf = requestAnimationFrame(draw);
    }
    draw();
  }
  function stopWave() {
    cancelAnimationFrame(waveRaf); waveRaf = 0;
    if (analyser) { try { analyser.disconnect(); } catch (_) {} analyser = null; }
    if (waveCanvas) { const cx = waveCanvas.getContext("2d"); cx && cx.clearRect(0, 0, waveCanvas.width, waveCanvas.height); }
  }

  async function startRec() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } }); }
    catch (_) { stateEl.textContent = "mic denied"; return; }
    ctx = new AudioContext();
    try { await ctx.audioWorklet.addModule("js/recorder-worklet.js"); }
    catch (_) { stateEl.textContent = "audio init failed"; return; }
    srcNode = ctx.createMediaStreamSource(stream);
    node = new AudioWorkletNode(ctx, "recorder");
    srcNode.connect(node);
    startWave(srcNode);  // passive analyser tap → live bars (no output, no echo)
    frames = [];
    node.port.onmessage = (e) => frames.push(new Float32Array(e.data));
    recording = true;
    btn.innerHTML = '<span class="mic-ico"></span>Stop'; btn.classList.add("rec");
    stateEl.innerHTML = '<span class="live">● recording…</span>';
    setFlash("recording… say a banned word, then hit Stop", false);
    if (reBtn) reBtn.remove(), (reBtn = null);
    if (player) player.remove(), (player = null);
    script.textContent = "";
  }

  async function stopRec() {
    recording = false;
    stopWave();
    btn.innerHTML = '<span class="mic-ico"></span>Record'; btn.classList.remove("rec"); btn.disabled = true;
    stateEl.textContent = "cleaning…"; setFlash("processing with large-v3…", false);
    try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { await ctx.close(); } catch (_) {}

    // concat all float32 frames -> one buffer -> POST raw bytes
    const total = frames.reduce((n, f) => n + f.length, 0);
    const all = new Float32Array(total);
    let off = 0; for (const f of frames) { all.set(f, off); off += f.length; }

    let res;
    try {
      res = await fetch(API + "/censor", { method: "POST", body: all.buffer,
        headers: { "Content-Type": "application/octet-stream" } }).then((r) => r.json());
    } catch (_) {
      stateEl.textContent = "no local server — start it first"; setFlash("— couldn't reach the server —", false);
      btn.disabled = false; return;
    }

    stateEl.textContent = "done";
    const n = (res.hits || []).length;
    setFlash(n ? `⛔  beeped ${n} word${n > 1 ? "s" : ""}: ${res.hits.map((h) => h.term).join(", ")}` : "✓ nothing flagged", n > 0);

    // transcript with caught words marked
    let t = res.transcript || "(no speech detected)";
    for (const h of (res.hits || [])) {
      const re = new RegExp("\\b" + h.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "ig");
      t = t.replace(re, (m) => `«${m}»`);
    }
    script.textContent = t;

    // play the cleaned audio
    player = document.createElement("audio");
    player.controls = true; player.src = res.wav; player.className = "mic-player";
    flash.insertAdjacentElement("afterend", player);

    // re-record button
    reBtn = document.createElement("button");
    reBtn.className = "mic-btn ghost"; reBtn.textContent = "Re-record";
    reBtn.onclick = () => { reBtn.remove(); reBtn = null; if (player) player.remove(), (player = null); btn.disabled = false; startRec(); };
    btn.insertAdjacentElement("afterend", reBtn);
    btn.disabled = false;
  }

  btn.onclick = () => { if (!recording) startRec(); else stopRec(); };
})();
