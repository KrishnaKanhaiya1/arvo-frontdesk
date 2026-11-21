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
  const [state, setState] = useState<PersonaState>(() => {
    const savedRole = localStorage.getItem('arvo_actor_role') as PersonaMode || 'agent';
    const savedAgentId = localStorage.getItem('arvo_actor_id') || 'agent-meera';
    const savedCustomerId = savedRole === 'customer' ? (localStorage.getItem('arvo_actor_id') || 'cust-acme') : null;

    if (!localStorage.getItem('arvo_actor_role')) {
      localStorage.setItem('arvo_actor_role', 'agent');
      localStorage.setItem('arvo_actor_id', 'agent-meera');
    }

    return {
      mode: savedRole,
      agentId: savedRole === 'agent' ? savedAgentId : null,
      agentName: savedRole === 'agent' ? 'Meera (Lead)' : null,
      customerId: savedCustomerId,
      agents: [],
    };
  });

  useEffect(() => {
    if (agents.length > 0 && !state.agentId && state.mode === 'agent') {
      const meera = agents.find(a => a.id === 'agent-meera') || agents[0];
      setState(s => ({ ...s, agentId: meera.id, agentName: meera.name, agents }));
      localStorage.setItem('arvo_actor_role', 'agent');
      localStorage.setItem('arvo_actor_id', meera.id);
    } else if (agents.length > 0) {
      setState(s => ({ ...s, agents }));
    }
  }, [agents]);

  const setAgentPersona = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    localStorage.setItem('arvo_actor_role', 'agent');
    localStorage.setItem('arvo_actor_id', agentId);
    setState({
      mode: 'agent',
      agentId,
      agentName: agent?.name || agentId,
      customerId: null,
      agents,
    });
  };

  const setCustomerPersona = (customerId: string = 'cust-acme') => {
    localStorage.setItem('arvo_actor_role', 'customer');
    localStorage.setItem('arvo_actor_id', customerId);
    setState(s => ({
      ...s,
      mode: 'customer',
      agentId: null,
      agentName: null,
      customerId,
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
