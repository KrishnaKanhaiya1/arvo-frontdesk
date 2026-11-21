import React from 'react';
import { usePersona } from '../hooks/usePersona';
import { useNavigate } from 'react-router-dom';

export const PersonaSwitcher: React.FC = () => {
  const { mode, agentId, setAgentPersona, setCustomerPersona } = usePersona();
  const navigate = useNavigate();

  const handleAgentSelect = (id: string) => {
    setAgentPersona(id);
    navigate('/');
  };

  const handleCustomerSelect = () => {
    setCustomerPersona();
    navigate('/customer');
  };

  const personas = [
    { id: 'agent-meera', label: 'Meera (Lead)' },
    { id: 'agent-rahul', label: 'Rahul' },
    { id: 'agent-priya', label: 'Priya' },
  ];

  return (
    <div className="flex items-center bg-[#E2E8F0] p-0.5 rounded-lg text-xs font-medium">
      {personas.map(p => {
        const isActive = mode === 'agent' && agentId === p.id;
        return (
          <button
            key={p.id}
            onClick={() => handleAgentSelect(p.id)}
            className={`px-2.5 py-1 rounded-md transition-all ${
              isActive
                ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {p.label}
          </button>
        );
      })}

      <div className="w-[1px] h-3.5 bg-slate-300 mx-1" />

      <button
        onClick={handleCustomerSelect}
        className={`px-2.5 py-1 rounded-md transition-all ${
          mode === 'customer'
            ? 'bg-[#2563EB] text-white shadow-sm font-semibold'
            : 'text-[#64748B] hover:text-[#0F172A]'
        }`}
      >
        Customer View
      </button>
    </div>
  );
};
