import MeterBar from './components/MeterBar';
import RotateOverlay from './components/RotateOverlay';
import BakeryScreen from './screens/BakeryScreen';
import BedroomScreen from './screens/BedroomScreen';
import CharityScreen from './screens/CharityScreen';
import GreengrocerScreen from './screens/GreengrocerScreen';
import ParentScreen from './screens/ParentScreen';
import PurseScreen from './screens/PurseScreen';
import SaturdayScreen from './screens/SaturdayScreen';
import ShiftScreen from './screens/ShiftScreen';
import StreetScreen from './screens/StreetScreen';
import ToyshopScreen from './screens/ToyshopScreen';
import WeekSummaryScreen from './screens/WeekSummaryScreen';
import type { Screen } from './state/gameReducer';
import { GameProvider, useGame } from './state/GameContext';

/**
 * Saturday and the week summary are whole-screen moments, and the grown-ups'
 * area is not part of the game. Everywhere else keeps the meters in view.
 */
const SCREENS_WITHOUT_METERS: readonly Screen[] = ['saturday', 'weekSummary', 'parent'];

function CurrentScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'saturday':
      return <SaturdayScreen />;
    case 'bakery':
      return <BakeryScreen />;
    case 'greengrocer':
      return <GreengrocerScreen />;
    case 'toyshop':
      return <ToyshopScreen />;
    case 'charity':
      return <CharityScreen />;
    case 'purse':
      return <PurseScreen />;
    case 'bedroom':
      return <BedroomScreen />;
    case 'weekSummary':
      return <WeekSummaryScreen />;
    case 'parent':
      return <ParentScreen />;
    case 'shift':
      return <ShiftScreen />;
    case 'street':
    default:
      return <StreetScreen />;
  }
}

function Game() {
  const { state } = useGame();
  const showMeters = !SCREENS_WITHOUT_METERS.includes(state.screen);

  return (
    <div className="game-surface safe-inset flex flex-col">
      {showMeters && <MeterBar />}
      <div className="min-h-0 flex-1">
        <CurrentScreen screen={state.screen} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
      <RotateOverlay />
    </GameProvider>
  );
}
