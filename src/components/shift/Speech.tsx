import type { ReactNode } from 'react';
import { speak, useSpeakOnChange, type VoiceStyle } from '../speech';

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" role="presentation">
      <path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" fill="#b45309" />
      <path d="M15.5 8.5 Q18 12 15.5 15.5" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M18 6 Q22 12 18 18" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A speech bubble that SAYS what it shows. It speaks when the words change,
 * and tapping it anywhere says them again — she can't read yet, so hearing it
 * twice is the whole point. Pictures (the order, the job) go in `children`.
 */
export default function Speech({
  name,
  text,
  voice,
  children,
}: {
  name: string;
  text: string;
  voice: VoiceStyle;
  children?: ReactNode;
}) {
  useSpeakOnChange(text, voice);

  return (
    <div className="flex flex-col gap-1">
      <span className="ml-3 text-lg font-black text-amber-900/70">{name}</span>
      <button
        type="button"
        onClick={() => speak(text, voice)}
        aria-label={`${name} says: ${text} Tap to hear it again.`}
        data-testid="speech"
        data-text={text}
        className="tappable relative flex min-w-[16rem] max-w-[46rem] flex-col items-start gap-2 rounded-3xl border-4 border-amber-900/15 bg-white px-5 py-3 text-left shadow-lg active:scale-[0.99]"
      >
        {/* Tail pointing at whoever is talking, on the left */}
        <span className="absolute -left-4 top-8 h-0 w-0 border-y-[12px] border-r-[16px] border-y-transparent border-r-white" />
        <span className="flex w-full items-start gap-3">
          <span className="flex-1 text-2xl font-bold leading-snug text-amber-950">{text}</span>
          <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 p-1" aria-hidden="true">
            <SpeakerIcon />
          </span>
        </span>
        {children}
      </button>
    </div>
  );
}
