const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('capture emits 100 ms PCM packets, averages stereo and clamps peaks', () => {
  let Processor;
  const packets = [];
  vm.runInNewContext(fs.readFileSync('pcm-worklet.js', 'utf8'), {
    AudioWorkletProcessor: class { constructor() { this.port = {postMessage: buffer => packets.push(new Int16Array(buffer))}; } },
    registerProcessor: (name, implementation) => { Processor = implementation; }
  });
  const processor = new Processor();
  processor.process([[new Float32Array(800).fill(1), new Float32Array(800).fill(-1)]]);
  assert.equal(packets.length, 0);
  processor.process([[new Float32Array(801).fill(2)]]);
  assert.equal(packets.length, 1);
  assert.equal(packets[0].length, 1600);
  assert.equal(packets[0][0], 0);
  assert.equal(packets[0][799], 0);
  assert.equal(packets[0][800], 32767);
  processor.process([[new Float32Array(1599).fill(-2)]]);
  assert.equal(packets.length, 2);
  assert.equal(packets[1][0], 32767);
  assert.equal(packets[1][1], -32768);
});
