import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useHealth } from './hooks/useTickets';
import { usePersona } from './hooks/usePersona';
import { WakeUpScreen } from './components/WakeUpScreen';
import { AgentWorkspace } from './pages/AgentWorkspace';
import { CustomerView } from './components/CustomerView';

const App: React.FC = () => {
  const health = useHealth();
  const { mode } = usePersona();

  // Show wake-up screen while backend is starting up
  if (!health.data || health.data.status !== 'ok') {
    return <WakeUpScreen />;
  }

  if (mode === 'customer') {
    return (
      <Routes>
        <Route path="/customer" element={<CustomerView />} />
        <Route path="/customer/tickets/:ticketKey" element={<CustomerView />} />
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AgentWorkspace />} />
      <Route path="/tickets/:ticketKey" element={<AgentWorkspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
