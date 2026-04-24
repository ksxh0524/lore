import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorldPage } from './pages/WorldPage';
import { HomePage } from './pages/HomePage';
import { InitPage } from './pages/InitPage';
import { SettingsPage } from './pages/SettingsPage';
import { useWorldStore } from './stores/worldStore';

function RequireWorld({ children }: { children: React.ReactNode }) {
  const worldId = useWorldStore((s) => s.worldId);
  if (!worldId) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new" element={<InitPage />} />
      <Route
        path="/world"
        element={
          <RequireWorld>
            <WorldPage />
          </RequireWorld>
        }
      />
      <Route path="/settings/*" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
