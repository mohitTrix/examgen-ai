import { useEffect } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Signup } from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateExam from './pages/CreateExam.jsx';
import Materials from './pages/Materials.jsx';
import PaperPreview from './pages/PaperPreview.jsx';
import ExamRoom from './pages/ExamRoom.jsx';
import Result from './pages/Result.jsx';
import ExamHistory from './pages/ExamHistory.jsx';
import { Profile, Settings } from './pages/Account.jsx';
import { ErrorBox, Skeleton } from './components/ui.jsx';

function Protected() {
  const { user, loading, bootError, restore } = useAuth();
  const location = useLocation();
  if (loading) return <div className="mx-auto max-w-3xl p-8"><Skeleton /></div>;
  if (bootError) return <div className="mx-auto max-w-xl p-8"><ErrorBox message={bootError} onRetry={restore} /></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Protected />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create" element={<CreateExam />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/papers/:id" element={<PaperPreview />} />
          <Route path="/results/:id" element={<Result />} />
          <Route path="/history" element={<ExamHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/exam/:id" element={<ExamRoom />} />
      </Route>
      <Route path="*" element={<div className="p-16 text-center"><h1 className="text-2xl font-semibold">Page not found</h1><Link className="btn btn-primary mt-4" to="/">Go home</Link></div>} />
    </Routes>
  );
}
