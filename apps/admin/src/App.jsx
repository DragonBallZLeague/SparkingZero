import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import SubmissionDetail from './components/SubmissionDetail';
import { verifyAuth } from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = sessionStorage.getItem('gh_admin_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await verifyAuth(token);
      if (result.authorized) {
        setIsAuthenticated(true);
        setUser(result.user);
      } else {
        sessionStorage.removeItem('gh_admin_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      sessionStorage.removeItem('gh_admin_token');
    }
    setIsLoading(false);
  };

  const handleLogin = async (token) => {
    sessionStorage.setItem('gh_admin_token', token);
    await checkAuth();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('gh_admin_token');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter basename="/SparkingZero/admin">
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/" replace /> : 
              <LoginPage onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
              <Dashboard user={user} onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="/submission/:prNumber" 
          element={
            isAuthenticated ? 
              <SubmissionDetail user={user} onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
