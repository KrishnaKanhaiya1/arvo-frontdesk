import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useHealth } from './hooks/useTickets';
import { WakeUpScreen } from './components/WakeUpScreen';
import { LoginPage } from './pages/LoginPage';
import { AgentWorkspace } from './pages/AgentWorkspace';
import { CustomerView } from './components/CustomerView';
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

const App: React.FC = () => {
  const health = useHealth();

  // Show wake-up screen while backend is starting up
  if (!health.data || health.data.status !== 'ok') {
    return <WakeUpScreen />;
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/tickets" element={<AgentWorkspace />} />
        <Route path="/tickets/:ticketKey" element={<AgentWorkspace />} />
        <Route path="/customer" element={<CustomerView />} />
        <Route path="/customer/tickets/:ticketKey" element={<CustomerView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
