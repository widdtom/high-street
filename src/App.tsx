import RotateOverlay from './components/RotateOverlay';
import BakeryScreen from './screens/BakeryScreen';
import ParentScreen from './screens/ParentScreen';
import PurseScreen from './screens/PurseScreen';
import StreetScreen from './screens/StreetScreen';
import { GameProvider, useGame } from './state/GameContext';

function CurrentScreen() {
  const { state } = useGame();
  switch (state.screen) {
    case 'bakery':
      return <BakeryScreen />;
    case 'purse':
      return <PurseScreen />;
    case 'parent':
      return <ParentScreen />;
    case 'street':
    default:
      return <StreetScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <div className="game-surface safe-inset">
        <CurrentScreen />
      </div>
      <RotateOverlay />
    </GameProvider>
  );
}
