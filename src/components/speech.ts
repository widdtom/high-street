/* =============================================================================
 * SPEECH — the boss and the customers say their lines out loud.
 *
 * She is six and still learning to read, so everything a character says is
 * spoken as well as shown, and tapping a speech bubble says it again.
 *
 * ZERO NETWORK REQUESTS. This uses the browser's own speechSynthesis and ONLY
 * voices with `localService: true` — voices that run on the device. On an iPad
 * every voice is on-device. Some desktop browsers also offer cloud voices
 * (Chrome's "Google UK English", for one); those are never chosen. If there is
 * no on-device English voice, nothing is spoken and the game carries on.
 *
 * The on/off switch lives in localStorage under its own key, deliberately
 * outside the save: it is a setting for whoever holds the iPad, not part of
 * her game.
 * ============================================================================= */

import { useCallback, useEffect, useState } from 'react';

const VOICE_KEY = 'highstreet.voice';

/** How a character sounds. Pitch and rate as speechSynthesis understands them. */
export interface VoiceStyle {
  pitch: number;
  rate: number;
}

const DEFAULT_STYLE: VoiceStyle = { pitch: 1, rate: 0.92 };

/** Voices for the CAST (by look index) and the boss. Kept here, not in engine/. */
export const CAST_VOICES: readonly VoiceStyle[] = [
  { pitch: 1.15, rate: 0.82 }, // Granny Jo
  { pitch: 0.75, rate: 0.9 }, // Captain Nia
  { pitch: 0.95, rate: 0.98 }, // Postman Pete
  { pitch: 1.6, rate: 1.0 }, // Little Sam
  { pitch: 0.9, rate: 0.9 }, // Chef Remy
  { pitch: 0.7, rate: 0.85 }, // Mr Bloom
];
export const BOSS_VOICE: VoiceStyle = { pitch: 1.1, rate: 0.92 };

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

/** The best on-device English voice: British first. Never a cloud voice. */
function localVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (s === null) return null;
  const voices = s.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith('en'));
  return (
    voices.find((v) => v.lang === 'en-GB' && v.default) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null
  );
}

export function voiceIsOn(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Say `text`, cutting off anything already being said. Silent if voice is off. */
export function speak(text: string, style: VoiceStyle = DEFAULT_STYLE): void {
  const s = synth();
  if (s === null || !voiceIsOn() || text.trim() === '') return;
  const voice = localVoice();
  if (voice === null) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.pitch = style.pitch;
    u.rate = style.rate;
    s.speak(u);
  } catch {
    /* Speech is a nicety. Never let it break the game. */
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    /* nothing to do */
  }
}

/**
 * iPad Safari only lets speech start from inside a tap. Call this from the tap
 * that opens the bakery so that lines spoken a moment later are allowed too.
 */
export function unlockSpeech(): void {
  const s = synth();
  if (s === null) return;
  try {
    s.getVoices();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    s.speak(u);
  } catch {
    /* ignore */
  }
}

/** The voice on/off switch, for the speaker button. */
export function useVoiceSwitch(): [boolean, () => void] {
  const [on, setOn] = useState(voiceIsOn);
  const toggle = useCallback(() => {
    setOn((was) => {
      const next = !was;
      try {
        localStorage.setItem(VOICE_KEY, next ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      if (!next) stopSpeaking();
      return next;
    });
  }, []);
  return [on, toggle];
}

/**
 * Say `text` whenever it changes (a new customer, a new reply). Voices load
 * asynchronously in some browsers, so it waits for them once if needed.
 */
export function useSpeakOnChange(text: string, style: VoiceStyle): void {
  useEffect(() => {
    const s = synth();
    if (s === null) return undefined;
    // Give the walk-in a moment so the voice arrives with the character.
    const t = setTimeout(() => speak(text, style), 450);
    const onVoices = () => speak(text, style);
    if (s.getVoices().length === 0) s.addEventListener('voiceschanged', onVoices, { once: true });
    return () => {
      clearTimeout(t);
      s.removeEventListener('voiceschanged', onVoices);
    };
    // style is a stable constant per character; speak again only for new text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Stop talking when the screen goes away.
  useEffect(() => stopSpeaking, []);
}
