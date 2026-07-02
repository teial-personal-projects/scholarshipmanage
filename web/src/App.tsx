import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
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

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <UpdateBanner />
      <Navigation />
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <AppShell><Login /></AppShell> },
  { path: '/register', element: <AppShell><Register /></AppShell> },
  { path: '/forgot-password', element: <AppShell><ForgotPassword /></AppShell> },
  { path: '/reset-password', element: <AppShell><ResetPassword /></AppShell> },
  { path: '/invite/:token', element: <AppShell><CollaboratorInvite /></AppShell> },
  { path: '/dashboard', element: <AppShell><ProtectedRoute><Dashboard /></ProtectedRoute></AppShell> },
  { path: '/applications', element: <AppShell><ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute></AppShell> },
  { path: '/applications/new', element: <AppShell><ProtectedRoute><ApplicationForm /></ProtectedRoute></AppShell> },
  { path: '/applications/:id', element: <AppShell><ProtectedRoute><ApplicationDetail /></ProtectedRoute></AppShell> },
  { path: '/collaborators', element: <AppShell><ProtectedRoute><Collaborators /></ProtectedRoute></AppShell> },
  { path: '/profile', element: <AppShell><ProtectedRoute><Profile /></ProtectedRoute></AppShell> },
  { path: '/resources', element: <AppShell><ProtectedRoute><ScholarshipResources /></ProtectedRoute></AppShell> },
  { path: '/collaborator/dashboard', element: <AppShell><ProtectedRoute><CollaboratorDashboard /></ProtectedRoute></AppShell> },
  { path: '/', element: <AppShell><Navigate to="/dashboard" replace /></AppShell> },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});

function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

export default App;
