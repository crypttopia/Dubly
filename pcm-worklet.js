// The input AudioContext runs at 16 kHz. Emit exactly 100 ms per packet.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.packet = new Int16Array(1600); this.offset = 0; }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i] / channels.length;
      value = Math.max(-1, Math.min(1, value));
      this.packet[this.offset++] = Math.round(value * (value < 0 ? 32768 : 32767));
      if (this.offset === 1600) {
        this.port.postMessage(this.packet.buffer, [this.packet.buffer]);
        this.packet = new Int16Array(1600); this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PCMProcessor);
