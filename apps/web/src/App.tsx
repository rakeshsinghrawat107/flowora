import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';

// The editor (React Flow + export libs) loads on demand; the dashboard
// stays a small initial chunk.
const Editor = lazy(() => import('./components/Editor'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route
        path="/d/:id"
        element={
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
                Loading editor…
              </div>
            }
          >
            <Editor />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
