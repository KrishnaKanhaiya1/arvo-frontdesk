import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAgents } from './useTickets';
import type { Agent } from '../types/contracts';

export type PersonaMode = 'agent' | 'customer';

export interface PersonaState {
  mode: PersonaMode;
  agentId: string | null;
  agentName: string | null;
  customerId: string | null;
  agents: Agent[];
}

interface PersonaContextValue extends PersonaState {
  setAgentPersona: (agentId: string) => void;
  setCustomerPersona: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { data: agents = [] } = useAgents();
  const [state, setState] = useState<PersonaState>({
    mode: 'agent',
    agentId: 'agent-meera',
    agentName: 'Meera (Lead)',
    customerId: null,
    agents: [],
  });

  useEffect(() => {
    if (agents.length > 0 && !state.agentId) {
      const meera = agents.find(a => a.id === 'agent-meera') || agents[0];
      setState(s => ({ ...s, agentId: meera.id, agentName: meera.name, agents }));
    } else if (agents.length > 0) {
      setState(s => ({ ...s, agents }));
    }
  }, [agents]);

  const setAgentPersona = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setState({
      mode: 'agent',
      agentId,
      agentName: agent?.name || agentId,
      customerId: null,
      agents,
    });
  };

  const setCustomerPersona = () => {
    setState(s => ({
      ...s,
      mode: 'customer',
      agentId: null,
      agentName: null,
      customerId: 'cust-acme',
    }));
  };

  return (
    <PersonaContext.Provider value={{ ...state, setAgentPersona, setCustomerPersona }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}
