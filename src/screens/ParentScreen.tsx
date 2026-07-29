import { useState } from 'react';
import { canMakeExactlyFrom, formatMoney } from '../engine';
import { ALL_COIN_VALUES } from '../engine/coins';
import { recentAttempts, shouldAdvanceStage } from '../engine/week';
import type { Stage } from '../engine/types';
import { itemById } from '../data/economy';
import { allMoneyTotal, moneyBoxTotal, purseTotal } from '../state/gameReducer';
import { exportSave, importSave } from '../state/save';
import { useGame } from '../state/GameContext';

const STAGES: Stage[] = [1, 2, 3, 4];

const STAGE_COINS: Record<Stage, string> = {
  1: '1p, 2p, 5p, 10p',
  2: '+ 20p',
  3: '+ 50p',
  4: '+ £1, £2',
};

/**
 * The grown-ups' area. iPadOS can evict PWA storage under storage pressure, so
 * export is the backup route — there is no cloud, no account and no sync.
 */
export default function ParentScreen() {
  const { state, dispatch } = useGame();
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const { save } = state;
  const json = exportSave(save);
  const last10 = recentAttempts(save.transactionLog, 10);
  const firstTime = last10.filter((t) => t.attempts === 1).length;
  const allThisStage = last10.length === 10 && last10.every((t) => t.stage === save.stage);
  const ready = shouldAdvanceStage(save.transactionLog, save.stage);

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `high-street-save-week${save.week}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Save file downloaded.');
  };

  const doImport = () => {
    const result = importSave(pasted);
    if (result.ok) {
      dispatch({ type: 'importSave', data: result.data });
      setPasted('');
      setMessage('Save imported.');
    } else {
      setMessage(result.error);
    }
  };

  const goalItem = save.savingGoal === null ? undefined : itemById(save.savingGoal);

  return (
    <div className="flex h-full flex-col bg-stone-100 text-stone-800">
      <div className="flex shrink-0 items-center gap-3 border-b-2 border-stone-300 bg-stone-700 px-3 py-1.5 text-white">
        <button
          type="button"
          onClick={() => dispatch({ type: 'go', screen: 'street' })}
          aria-label="Close"
          className="tappable rounded-full bg-white/20 p-1 active:scale-90"
        >
          <svg viewBox="0 0 32 32" className="h-7 w-7" role="presentation">
            <path d="M9 9 L23 23 M23 9 L9 23" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Grown-ups</h1>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        {/* ---------------- Stage ---------------- */}
        <section className="rounded-xl bg-white p-3 shadow-sm">
          <h2 className="mb-1 font-bold">Stage {save.stage}</h2>
          <p className="mb-2 text-stone-600">
            Coins in play: {STAGE_COINS[save.stage]}.{' '}
            {save.stage < 4
              ? 'A stage advances only when the last 10 purchases were all at this stage and at least 8 went through on the first press of Pay. Never on time played, money spent or items owned, and never backwards on its own.'
              : 'This is the last stage.'}
          </p>

          <div className="mb-3 rounded-lg bg-stone-50 p-2">
            <p className="font-semibold">
              Last {last10.length} purchase{last10.length === 1 ? '' : 's'} —{' '}
              {firstTime} of {last10.length} first time
              {save.stage < 4 && (
                <span className={ready ? 'text-emerald-700' : 'text-stone-500'}>
                  {ready ? ' — ready to advance' : ' — not yet'}
                </span>
              )}
            </p>
            {last10.length < 10 && save.stage < 4 && (
              <p className="text-xs text-stone-500">
                Needs 10 purchases at this stage; {10 - last10.length} to go.
              </p>
            )}
            {last10.length === 10 && !allThisStage && (
              <p className="text-xs text-stone-500">
                Some of these were made at an earlier stage, so they don&rsquo;t count yet.
              </p>
            )}
            <ul className="mt-2 flex flex-wrap gap-1" data-testid="attempt-history">
              {last10.length === 0 && <li className="text-xs text-stone-400">Nothing bought yet.</li>}
              {last10.map((t, i) => (
                <li
                  key={`${t.ts}-${i}`}
                  title={`${t.price}p, stage ${t.stage}, ${t.attempts} attempt(s)`}
                  className={[
                    'rounded px-2 py-0.5 text-xs font-semibold tabular-nums',
                    t.attempts === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                    t.stage === save.stage ? '' : 'opacity-40',
                  ].join(' ')}
                >
                  {t.price}p ×{t.attempts}
                </li>
              ))}
            </ul>
          </div>

          <p className="mb-1 font-semibold">Set the stage by hand</p>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => dispatch({ type: 'setStage', stage: s })}
                aria-pressed={s === save.stage}
                className={[
                  'tappable rounded-lg border-2 px-4 py-2 font-semibold active:scale-95',
                  s === save.stage
                    ? 'border-stone-700 bg-stone-700 text-white'
                    : 'border-stone-300 bg-white',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* ---------------- Where she is ---------------- */}
        <section className="rounded-xl bg-white p-3 shadow-sm">
          <h2 className="mb-2 font-bold">Week {save.week}</h2>
          <ul className="space-y-0.5">
            <li>
              Purse {formatMoney(purseTotal(save), save.stage)} in {save.purse.length} coins;
              money box {formatMoney(moneyBoxTotal(save), save.stage)} in {save.moneyBox.length};
              total {formatMoney(allMoneyTotal(save), save.stage)}
            </li>
            <li>
              Food {save.foodMeter} of 3 &middot; lights {save.electricityDays > 0 ? 'on' : 'off'}
            </li>
            <li>
              {save.bag.length} thing{save.bag.length === 1 ? '' : 's'} bought,{' '}
              {save.bedroom.length} on the shelf
            </li>
            <li>
              Saving for:{' '}
              {goalItem === undefined
                ? 'nothing yet'
                : `${goalItem.name} (${formatMoney(goalItem.price, save.stage)})`}
            </li>
          </ul>
        </section>

        {/* ---------------- Coins ---------------- */}
        <section className="rounded-xl bg-white p-3 shadow-sm">
          <h2 className="mb-1 font-bold">Coins</h2>
          <p className="mb-2 text-xs text-stone-500">
            Counts of how often each coin was in a payment that came up short. She is never
            shown this, and nothing in the game penalises a short payment.
          </p>
          <ul className="flex flex-wrap gap-2">
            {ALL_COIN_VALUES.map((value) => (
              <li key={value} className="rounded bg-stone-100 px-2 py-1 tabular-nums">
                {formatMoney(value, 1)}: {save.coinErrors[value]}
              </li>
            ))}
          </ul>

          <h3 className="mb-1 mt-3 font-semibold">Can she pay exactly with what she is holding?</h3>
          <p className="mb-2 text-xs text-stone-500">
            Having the money but not the right coins is a real situation, not a bug. She is
            never warned about it in advance — she discovers it by trying, and the shopkeeper
            gives change.
          </p>
          <ul className="flex flex-wrap gap-1" data-testid="exact-payability">
            {[2, 3, 5, 8, 10, 12, 14, 15, 20, 25, 30, 40].map((price) => {
              const ok = canMakeExactlyFrom(price, save.purse);
              return (
                <li
                  key={price}
                  className={[
                    'rounded px-2 py-0.5 text-xs font-semibold tabular-nums',
                    ok ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500',
                  ].join(' ')}
                >
                  {price}p {ok ? 'yes' : 'no'}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------- Backup ---------------- */}
        <section className="rounded-xl bg-white p-3 shadow-sm">
          <h2 className="mb-2 font-bold">Back up the save</h2>
          <p className="mb-2 text-stone-600">
            Everything is stored only on this device. iPadOS can clear that storage when the
            device runs low on space, so keep a copy.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={download}
              className="tappable rounded-lg bg-stone-700 px-4 py-2 font-semibold text-white active:scale-95"
            >
              Download save file
            </button>
            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="tappable rounded-lg border-2 border-stone-300 px-4 py-2 font-semibold active:scale-95"
            >
              {showJson ? 'Hide' : 'Show'} save text
            </button>
          </div>
          {showJson && (
            <textarea
              readOnly
              value={json}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-2 h-32 w-full rounded-lg border-2 border-stone-200 p-2 font-mono text-xs"
            />
          )}
        </section>

        <section className="rounded-xl bg-white p-3 shadow-sm">
          <h2 className="mb-2 font-bold">Restore a save</h2>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the contents of a save file here"
            className="h-24 w-full rounded-lg border-2 border-stone-200 p-2 font-mono text-xs"
          />
          <button
            type="button"
            disabled={pasted.trim() === ''}
            onClick={doImport}
            className="tappable mt-2 rounded-lg bg-stone-700 px-4 py-2 font-semibold text-white disabled:bg-stone-300 active:scale-95"
          >
            Restore
          </button>
        </section>

        {message !== null && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 font-medium text-amber-900">{message}</p>
        )}

        <p className="pb-2 text-xs text-stone-500">
          This app makes no network requests, has no accounts, and collects nothing.
        </p>
      </div>
    </div>
  );
}
