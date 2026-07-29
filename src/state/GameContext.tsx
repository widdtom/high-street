import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { flushSave, loadSave, saveDebounced } from './save';
import { gameReducer, initialState, type GameAction, type GameState } from './gameReducer';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => initialState(loadSave()));

  // Debounced persistence: this fires when the saved slice changes, not on
  // every render, and the 300ms debounce coalesces rapid taps.
  useEffect(() => {
    saveDebounced(state.save);
  }, [state.save]);

  // iPadOS can suspend or discard the tab without a beforeunload, so flush on
  // the first hint the app is going away.
  useEffect(() => {
    const flush = () => flushSave();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flushSave();
    };
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (ctx === null) throw new Error('useGame must be used inside a GameProvider');
  return ctx;
}
