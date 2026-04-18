import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import ApplicationForm from './components/ApplicationForm';
import Collaborators from './pages/Collaborators';
import CollaboratorDashboard from './pages/CollaboratorDashboard';
import CollaboratorInvite from './pages/CollaboratorInvite';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ScholarshipResources from './pages/ScholarshipResources';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import './App.css';

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/invite/:token" element={<CollaboratorInvite />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
          <Route path="/applications/new" element={<ProtectedRoute><ApplicationForm /></ProtectedRoute>} />
          <Route path="/applications/:id" element={<ProtectedRoute><ApplicationDetail /></ProtectedRoute>} />
          <Route path="/applications/:id/edit" element={<ProtectedRoute><ApplicationForm /></ProtectedRoute>} />
          <Route path="/collaborators" element={<ProtectedRoute><Collaborators /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ScholarshipResources /></ProtectedRoute>} />
          <Route path="/collaborator/dashboard" element={<ProtectedRoute><CollaboratorDashboard /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
