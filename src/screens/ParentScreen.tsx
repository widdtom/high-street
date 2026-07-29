import { useState } from 'react';
import { formatMoney } from '../engine';
import { ALL_COIN_VALUES } from '../engine/coins';
import { exportSave, importSave } from '../state/save';
import { useGame } from '../state/GameContext';

/**
 * The grown-ups' area. iPadOS can evict PWA storage under storage pressure,
 * so export is the backup route — there is no cloud, no account, and no sync.
 */
export default function ParentScreen() {
  const { state, dispatch } = useGame();
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const json = exportSave(state.save);
  const attempts = state.save.transactionLog.length;
  const correct = state.save.transactionLog.filter((t) => t.correct).length;

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `high-street-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on the next tick so Safari has time to start the download.
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
        <section className="rounded-xl bg-white p-3 shadow-sm">
          <h2 className="mb-2 font-bold">Progress</h2>
          <p>
            Stage {state.save.stage} &middot; purse {formatMoney(
              state.save.purse.reduce<number>((s, c) => s + c, 0),
              state.save.stage,
            )} in {state.save.purse.length} coins
          </p>
          <p>
            {attempts} payment {attempts === 1 ? 'attempt' : 'attempts'}, {correct} completed.
          </p>
          <h3 className="mt-3 mb-1 font-semibold">Coins involved in short payments</h3>
          <ul className="flex flex-wrap gap-2">
            {ALL_COIN_VALUES.map((value) => (
              <li key={value} className="rounded bg-stone-100 px-2 py-1 tabular-nums">
                {formatMoney(value, 1)}: {state.save.coinErrors[value]}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-500">
            This is a hint about which coins are still unfamiliar. She is never shown it, and
            nothing in the game penalises a short payment.
          </p>
        </section>

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
