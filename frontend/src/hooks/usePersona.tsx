import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgents } from './useTickets';
import type { Agent } from '../types/contracts';
import { loginDemoPersona, fetchCurrentSession, logoutPersona, loginWithCredentials } from '../lib/api';

export type PersonaMode = 'agent' | 'customer';

export interface PersonaState {
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  mode: PersonaMode;
  role: 'lead' | 'agent' | 'customer';
  isLead: boolean;
  actorId: string;
  actorName: string;
  agentId: string | null;
  agentName: string | null;
  agentInitials: string;
  agentColor: string;
  customerId: string | null;
  customerName: string;
  customerCompany: string;
  agents: Agent[];
}

interface PersonaContextValue extends PersonaState {
  setAgentPersona: (agentId: string) => Promise<void>;
  setCustomerPersona: (customerId?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: agents = [] } = useAgents();

  const [state, setState] = useState<PersonaState>(() => {
    const isAuth = localStorage.getItem('arvo_authenticated') === 'true';
    const savedRole = (localStorage.getItem('arvo_actor_role') as PersonaMode) || 'agent';
    const savedId = localStorage.getItem('arvo_actor_id') || 'agent-meera';

    return {
      isAuthenticated: isAuth,
      isLoadingSession: true,
      mode: savedRole === 'customer' ? 'customer' : 'agent',
      role: savedRole === 'customer' ? 'customer' : (savedId === 'agent-meera' ? 'lead' : 'agent'),
      isLead: savedRole !== 'customer' && savedId === 'agent-meera',
      actorId: isAuth ? savedId : '',
      actorName: savedId === 'agent-meera' ? 'Meera Krishnan' : savedId === 'agent-rahul' ? 'Rahul Sharma' : savedId === 'agent-priya' ? 'Priya Patel' : 'Vikram Patel',
      agentId: isAuth && savedRole === 'agent' ? savedId : null,
      agentName: isAuth && savedRole === 'agent' ? (savedId === 'agent-meera' ? 'Meera Krishnan' : 'Support Agent') : null,
      agentInitials: savedId === 'agent-meera' ? 'MK' : savedId === 'agent-rahul' ? 'RS' : savedId === 'agent-priya' ? 'PN' : 'VP',
      agentColor: savedId === 'agent-meera' ? '#7C3AED' : savedId === 'agent-rahul' ? '#2563EB' : savedId === 'agent-priya' ? '#059669' : '#D97706',
      customerId: isAuth && savedRole === 'customer' ? savedId : null,
      customerName: 'Vikram Patel',
      customerCompany: 'Acme Corp',
      agents: [],
    };
  });

  // Verify server session on load
  useEffect(() => {
    fetchCurrentSession()
      .then((session) => {
        if (session.authenticated && session.user) {
          const u = session.user;
          const isCust = u.role === 'customer';
          localStorage.setItem('arvo_authenticated', 'true');
          localStorage.setItem('arvo_actor_role', isCust ? 'customer' : 'agent');
          localStorage.setItem('arvo_actor_id', u.userId);
          setState((s) => ({
            ...s,
            isAuthenticated: true,
            isLoadingSession: false,
            mode: isCust ? 'customer' : 'agent',
            role: u.role,
            isLead: u.role === 'lead',
            actorId: u.userId,
            actorName: u.name,
            agentId: isCust ? null : u.userId,
            agentName: isCust ? null : u.name,
            agentInitials: u.avatarInitials || (u.userId === 'agent-meera' ? 'MK' : u.userId === 'agent-rahul' ? 'RS' : u.userId === 'agent-priya' ? 'PN' : 'VP'),
            agentColor: u.avatarColor || (u.userId === 'agent-meera' ? '#7C3AED' : u.userId === 'agent-rahul' ? '#2563EB' : u.userId === 'agent-priya' ? '#059669' : '#D97706'),
            customerId: isCust ? u.userId : null,
            customerName: isCust ? u.name : 'Vikram Patel',
            customerCompany: isCust ? (u.company || 'Acme Corp') : 'Acme Corp',
          }));
        } else {
          // No active session cookie on server
          localStorage.removeItem('arvo_authenticated');
          setState((s) => ({
            ...s,
            isAuthenticated: false,
            isLoadingSession: false,
            actorId: '',
            agentId: null,
            customerId: null,
          }));
        }
      })
      .catch(() => {
        setState((s) => ({ ...s, isLoadingSession: false }));
      });
  }, []);

  useEffect(() => {
    if (agents.length > 0) {
      setState((s) => {
        const curAgent = agents.find((a) => a.id === s.agentId);
        return {
          ...s,
          agents,
          agentName: curAgent ? curAgent.name : s.agentName,
        };
      });
    }
  }, [agents]);

  const setAgentPersona = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    localStorage.setItem('arvo_authenticated', 'true');
    localStorage.setItem('arvo_actor_role', 'agent');
    localStorage.setItem('arvo_actor_id', agentId);

    // Issue server-side session cookie
    try {
      const res = await loginDemoPersona(agentId);
      const u = res.user || {};
      setState((s) => ({
        ...s,
        isAuthenticated: true,
        mode: 'agent',
        role: (u.role || agent?.role || 'agent') as 'lead' | 'agent',
        isLead: (u.role || agent?.role) === 'lead',
        actorId: agentId,
        actorName: u.name || agent?.name || agentId,
        agentId,
        agentName: u.name || agent?.name || agentId,
        agentInitials: u.avatarInitials || (agentId === 'agent-meera' ? 'MK' : agentId === 'agent-rahul' ? 'RS' : agentId === 'agent-priya' ? 'PN' : 'AG'),
        agentColor: u.avatarColor || (agentId === 'agent-meera' ? '#7C3AED' : agentId === 'agent-rahul' ? '#2563EB' : agentId === 'agent-priya' ? '#059669' : '#2563EB'),
        customerId: null,
      }));
      // Invalidate queries so dashboard & ticket views refresh
      queryClient.invalidateQueries();
    } catch (e) {
      console.warn('Failed to issue session cookie:', e);
    }
  };

  const setCustomerPersona = async (customerId: string = 'cust-acme') => {
    localStorage.setItem('arvo_authenticated', 'true');
    localStorage.setItem('arvo_actor_role', 'customer');
    localStorage.setItem('arvo_actor_id', customerId);

    try {
      const res = await loginDemoPersona(customerId);
      const u = res.user || {};
      setState((s) => ({
        ...s,
        isAuthenticated: true,
        mode: 'customer',
        role: 'customer',
        isLead: false,
        actorId: customerId,
        actorName: u.name || 'Vikram Patel',
        agentId: null,
        agentName: null,
        agentInitials: u.avatarInitials || 'VP',
        agentColor: u.avatarColor || '#D97706',
        customerId,
        customerName: u.name || 'Vikram Patel',
        customerCompany: u.company || 'Acme Corp',
      }));
      queryClient.invalidateQueries();
    } catch (e) {
      console.warn('Failed to issue customer session cookie:', e);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    const res = await loginWithCredentials(email, password);
    if (res.user) {
      const u = res.user;
      const isCust = u.role === 'customer';
      localStorage.setItem('arvo_authenticated', 'true');
      localStorage.setItem('arvo_actor_role', isCust ? 'customer' : 'agent');
      localStorage.setItem('arvo_actor_id', u.userId);
      setState((s) => ({
        ...s,
        isAuthenticated: true,
        mode: isCust ? 'customer' : 'agent',
        role: u.role,
        isLead: u.role === 'lead',
        actorId: u.userId,
        actorName: u.name,
        agentId: isCust ? null : u.userId,
        agentName: isCust ? null : u.name,
        agentInitials: u.avatarInitials || (u.userId === 'agent-meera' ? 'MK' : u.userId === 'agent-rahul' ? 'RS' : u.userId === 'agent-priya' ? 'PN' : 'VP'),
        agentColor: u.avatarColor || (u.userId === 'agent-meera' ? '#7C3AED' : u.userId === 'agent-rahul' ? '#2563EB' : u.userId === 'agent-priya' ? '#059669' : '#D97706'),
        customerId: isCust ? u.userId : null,
        customerName: isCust ? u.name : 'Vikram Patel',
        customerCompany: isCust ? (u.company || 'Acme Corp') : 'Acme Corp',
      }));
      queryClient.invalidateQueries();
    }
    return res.user;
  };

  const logout = async () => {
    try {
      await logoutPersona();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem('arvo_authenticated');
    localStorage.removeItem('arvo_actor_role');
    localStorage.removeItem('arvo_actor_id');
    setState((s) => ({
      ...s,
      isAuthenticated: false,
      actorId: '',
      agentId: null,
      customerId: null,
      agentName: null,
    }));
    queryClient.clear();
  };

  return (
    <PersonaContext.Provider value={{ ...state, setAgentPersona, setCustomerPersona, loginWithEmail, logout }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}
