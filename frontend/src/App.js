import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Entretiens from './pages/Entretiens';
import NewEntretien from './pages/NewEntretien';
import EntretienNotes from './pages/EntretienNotes';
import EntretienObjectifs from './pages/EntretienObjectifs';
import ObjectifsLibrary from './pages/ObjectifsLibrary';
import './App.css';

// Composant pour protéger les routes
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-screen">Chargement...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/" />;
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/employees" 
          element={
            <PrivateRoute>
              <Employees />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/entretiens" 
          element={
            <PrivateRoute>
              <Entretiens />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/entretiens/new" 
          element={
            <PrivateRoute>
              <NewEntretien />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/entretiens/:id/notes" 
          element={
            <PrivateRoute>
              <EntretienNotes />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/entretiens/:id/objectifs" 
          element={
            <PrivateRoute>
              <EntretienObjectifs />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/objectifs-library" 
          element={
            <PrivateRoute>
              <ObjectifsLibrary />
            </PrivateRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;