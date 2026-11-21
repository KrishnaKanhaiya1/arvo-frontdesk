import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import {
  type TicketSummary,
  type TicketDetail,
  type InternalNote,
  type AuditEntry,
  type DashboardStats,
  type SystemClock,
  type Agent,
  type Customer,
  type CreateTicketRequest,
  type ClaimTicketRequest,
  type SendReplyRequest,
  type AddInternalNoteRequest,
  type ChangePriorityRequest,
  type ChangeStatusRequest,
  type ClockOverrideRequest,
} from '../types/contracts';
import { toast } from 'sonner';

// Health check with infinite retry
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<{ status: string }>('/api/health'),
    retry: Infinity,
    retryDelay: 2000,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

// Tickets list
export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: () => apiFetch<TicketSummary[]>('/api/tickets'),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// Single ticket detail
export function useTicket(key: string | null) {
  return useQuery({
    queryKey: ['ticket', key],
    queryFn: () => apiFetch<TicketDetail>(`/api/tickets/${key}`),
    enabled: !!key,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// Internal notes
export function useInternalNotes(key: string | null) {
  return useQuery({
    queryKey: ['notes', key],
    queryFn: () => apiFetch<InternalNote[]>(`/api/tickets/${key}/notes`),
    enabled: !!key,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// Audit log
export function useAuditLog(key: string | null) {
  return useQuery({
    queryKey: ['audit', key],
    queryFn: () => apiFetch<AuditEntry[]>(`/api/tickets/${key}/audit`),
    enabled: !!key,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

// Dashboard stats
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/dashboard'),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// System clock
export function useSystemClock() {
  return useQuery({
    queryKey: ['clock'],
    queryFn: () => apiFetch<SystemClock>('/api/system/clock'),
    staleTime: 5000,
    refetchInterval: 10_000,
  });
}

// Agents
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiFetch<Agent[]>('/api/agents'),
    staleTime: 60_000,
  });
}

// Customers
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => apiFetch<Customer[]>('/api/customers'),
    staleTime: 60_000,
  });
}

// Customer tickets
export function useCustomerTickets(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-tickets', customerId],
    queryFn: () => apiFetch<TicketSummary[]>(`/api/customer/tickets?customerId=${customerId}`),
    enabled: !!customerId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// Customer ticket detail
export function useCustomerTicket(key: string | null) {
  return useQuery({
    queryKey: ['customer-ticket', key],
    queryFn: () => apiFetch<TicketDetail>(`/api/customer/tickets/${key}`),
    enabled: !!key,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// Mutations
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTicketRequest) =>
      apiFetch<TicketDetail>('/api/tickets', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['customer-tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Ticket created successfully');
    },
    onError: () => toast.error('Failed to create ticket'),
  });
}

export function useClaimTicket(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClaimTicketRequest) =>
      apiFetch<TicketDetail>(`/api/tickets/${key}/claim`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket claimed');
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      if (err?.code === 'VERSION_MISMATCH' || err?.code === 'CONFLICT') {
        toast.error(`Ticket was just claimed by someone else`);
      } else {
        toast.error('Failed to claim ticket');
      }
    },
  });
}

export function useSendReply(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendReplyRequest) =>
      apiFetch<TicketDetail>(`/api/tickets/${key}/reply`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['audit', key] });
      toast.success('Reply sent');
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      if (err?.code === 'VERSION_MISMATCH') {
        toast.error('Ticket was updated by someone else — refreshed');
      } else {
        toast.error('Failed to send reply');
      }
    },
  });
}

export function useAddNote(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddInternalNoteRequest) =>
      apiFetch<InternalNote>(`/api/tickets/${key}/notes`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', key] });
      qc.invalidateQueries({ queryKey: ['audit', key] });
      toast.success('Note saved');
    },
    onError: () => toast.error('Failed to save note'),
  });
}

export function useChangePriority(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangePriorityRequest) =>
      apiFetch<TicketDetail>(`/api/tickets/${key}/priority`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['audit', key] });
      toast.success('Priority updated — SLA recalculated');
    },
    onError: () => toast.error('Failed to update priority'),
  });
}

export function useChangeStatus(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangeStatusRequest) =>
      apiFetch<TicketDetail>(`/api/tickets/${key}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['audit', key] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });
}

export function useSetClock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClockOverrideRequest) =>
      apiFetch<SystemClock>('/api/system/clock', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock'] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Clock updated');
    },
  });
}

export function useRunAutoClose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ closedCount: number; closedTickets: string[] }>('/api/system/run-autoclose', { method: 'POST' }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Auto-close ran: ${data.closedCount} ticket(s) closed`);
    },
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ message: string }>('/api/system/reset-demo', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success('Demo data reset');
    },
  });
}

export function useCustomerReply(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { customerId: string; content: string; reopen?: boolean }) =>
      apiFetch<TicketDetail>(`/api/customer/tickets/${key}/reply`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['customer-ticket', key] });
      qc.invalidateQueries({ queryKey: ['customer-tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success(data?.status === 'ASSIGNED' ? 'Reply sent & ticket reopened!' : 'Reply sent');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send reply');
    },
  });
}

export function useCustomerReopen(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { customerId: string }) =>
      apiFetch<TicketDetail>(`/api/customer/tickets/${key}/reopen`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-ticket', key] });
      qc.invalidateQueries({ queryKey: ['customer-tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', key] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket reopened');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to reopen ticket');
    },
  });
}
