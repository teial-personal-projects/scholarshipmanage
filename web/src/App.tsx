import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { UpdateBanner } from './components/UpdateBanner';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'));
const ApplicationForm = lazy(() => import('./components/ApplicationForm'));
const Collaborators = lazy(() => import('./pages/Collaborators'));
const CollaboratorDashboard = lazy(() => import('./pages/CollaboratorDashboard'));
const CollaboratorInvite = lazy(() => import('./pages/CollaboratorInvite'));
const Profile = lazy(() => import('./pages/Profile'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ScholarshipResources = lazy(() => import('./pages/ScholarshipResources'));

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="app">
        <UpdateBanner />
        <Navigation />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/:token" element={<CollaboratorInvite />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
            <Route path="/applications/new" element={<ProtectedRoute><ApplicationForm /></ProtectedRoute>} />
            <Route path="/applications/:id" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
            <Route path="/collaborators" element={<ProtectedRoute><Collaborators /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><ScholarshipResources /></ProtectedRoute>} />
            <Route path="/collaborator/dashboard" element={<ProtectedRoute><CollaboratorDashboard /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
