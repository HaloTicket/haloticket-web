import type { CheckinTone } from "./checkinResult";

const VIBRATION: Record<CheckinTone, number | number[]> = {
  success: 80,
  warning: [120, 80, 120],
  error: [250, 100, 250],
};
const BEEP: Record<CheckinTone, Array<{ freq: number; ms: number }>> = {
  success: [{ freq: 880, ms: 120 }],
  warning: [{ freq: 520, ms: 130 }, { freq: 520, ms: 130 }],
  error: [{ freq: 220, ms: 380 }],
};

let audioContext: AudioContext | null = null;

function beep(tone: CheckinTone): void {
  const Ctor = typeof window === "undefined" ? undefined : (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return;
  try {
    audioContext = audioContext ?? new Ctor();
    const ctx = audioContext;
    if (ctx.state === "suspended") void ctx.resume();
    let at = ctx.currentTime;
    for (const note of BEEP[tone]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = note.freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + note.ms / 1000 + 0.02);
      at += note.ms / 1000 + 0.06;
    }
  } catch {
    // sound is a convenience: a browser that refuses audio must not break the scan
  }
}

/** Short vibration and beep for a scan result, only where the browser supports them. */
export function giveCheckinFeedback(tone: CheckinTone): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(VIBRATION[tone]);
  } catch {
    // ignore
  }
  beep(tone);
}
