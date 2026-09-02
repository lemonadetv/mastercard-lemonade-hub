"use client";

const profiles = [
  { duration: 0.42, start: 1720, end: 540, gain: 0.2, q: 0.82, settle: 76 },
  { duration: 0.52, start: 1380, end: 390, gain: 0.23, q: 0.68, settle: 68 },
  { duration: 0.61, start: 1120, end: 310, gain: 0.19, q: 0.58, settle: 58 },
];

export function playPageTurnSound(variant = 0) {
  if (typeof AudioContext === "undefined") return;
  const profile = profiles[Math.abs(variant) % profiles.length];
  const context = new AudioContext();
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * profile.duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < channel.length; index += 1) {
    const progress = index / channel.length;
    const raw = Math.random() * 2 - 1;
    previous = previous * 0.34 + raw * 0.66;
    const lift = Math.min(1, progress / 0.045);
    const fall = Math.pow(1 - progress, 0.72);
    const ripple = 0.83 + Math.sin(progress * Math.PI * (7 + variant)) * 0.17;
    channel[index] = previous * lift * fall * ripple * 0.48;
  }

  const rustle = context.createBufferSource();
  const paperFilter = context.createBiquadFilter();
  const paperGain = context.createGain();
  paperFilter.type = "bandpass";
  paperFilter.frequency.setValueAtTime(profile.start, context.currentTime);
  paperFilter.frequency.exponentialRampToValueAtTime(profile.end, context.currentTime + profile.duration);
  paperFilter.Q.value = profile.q;
  paperGain.gain.setValueAtTime(0.0001, context.currentTime);
  paperGain.gain.exponentialRampToValueAtTime(profile.gain, context.currentTime + 0.025);
  paperGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + profile.duration);
  rustle.buffer = buffer;
  rustle.connect(paperFilter).connect(paperGain).connect(context.destination);

  const settle = context.createOscillator();
  const settleGain = context.createGain();
  const settleAt = context.currentTime + profile.duration * 0.72;
  settle.type = "triangle";
  settle.frequency.setValueAtTime(profile.settle, settleAt);
  settle.frequency.exponentialRampToValueAtTime(38, context.currentTime + profile.duration);
  settleGain.gain.setValueAtTime(0.0001, context.currentTime);
  settleGain.gain.setValueAtTime(0.0001, settleAt);
  settleGain.gain.exponentialRampToValueAtTime(0.045, settleAt + 0.018);
  settleGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + profile.duration);
  settle.connect(settleGain).connect(context.destination);

  rustle.start();
  settle.start();
  settle.stop(context.currentTime + profile.duration);
  rustle.addEventListener("ended", () => void context.close(), { once: true });
}
