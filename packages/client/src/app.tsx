import { WorldPage } from './pages/WorldPage';
import { InitPage } from './pages/InitPage';
import { useWorldStore } from './stores/worldStore';

export function App() {
  const worldId = useWorldStore((s) => s.worldId);

  // If no world is created, show init page
  if (!worldId) {
    return <InitPage />;
  }

  // Otherwise show the main world page
  return <WorldPage />;
}
