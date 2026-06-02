// Audio render thread: downsample mic to 16k mono float32 and post ~80ms frames.
class Recorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inRate = sampleRate;   // usually 44100 / 48000
    this.outRate = 16000;
    this.buf = [];
    this.target = 1280;         // 80 ms @ 16k — matches the Python FRAME
  }
  process(inputs) {
    const ch = inputs[0][0];
    if (!ch) return true;
    const ratio = this.inRate / this.outRate;
    for (let i = 0; i < ch.length / ratio; i++) {
      const idx = i * ratio;
      const lo = Math.floor(idx), hi = Math.min(lo + 1, ch.length - 1);
      const frac = idx - lo;
      this.buf.push(ch[lo] * (1 - frac) + ch[hi] * frac);
    }
    while (this.buf.length >= this.target) {
      const frame = Float32Array.from(this.buf.splice(0, this.target));
      this.port.postMessage(frame, [frame.buffer]);
    }
    return true;
  }
}
registerProcessor("recorder", Recorder);
