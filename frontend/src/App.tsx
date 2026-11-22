import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useHealth } from './hooks/useTickets';
import { WakeUpScreen } from './components/WakeUpScreen';
import { LoginPage } from './pages/LoginPage';
import { AgentWorkspace } from './pages/AgentWorkspace';
import { CustomerView } from './components/CustomerView';
import { NotFoundPage } from './pages/NotFoundPage';
import { ThemeProvider } from './hooks/useTheme';
import { usePersona } from './hooks/usePersona';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, role } = usePersona();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'customer') {
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to="/tickets/ARV-101" replace />;
};

const ProtectedAgentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role } = usePersona();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role === 'customer') {
    return <Navigate to="/customer" replace />;
  }

  return <>{children}</>;
};

const ProtectedCustomerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = usePersona();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const health = useHealth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Only display WakeUpScreen on workspace routes while backend cold-starts
  if (!isLoginPage && (!health.data || health.data.status !== 'ok')) {
    return <WakeUpScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/tickets"
        element={
          <ProtectedAgentRoute>
            <AgentWorkspace />
          </ProtectedAgentRoute>
        }
      />
      <Route
        path="/tickets/:ticketKey"
        element={
          <ProtectedAgentRoute>
            <AgentWorkspace />
          </ProtectedAgentRoute>
        }
      />
      <Route
        path="/customer"
        element={
          <ProtectedCustomerRoute>
            <CustomerView />
          </ProtectedCustomerRoute>
        }
      />
      <Route
        path="/customer/tickets/:ticketKey"
        element={
          <ProtectedCustomerRoute>
            <CustomerView />
          </ProtectedCustomerRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
