
import React, { useState, useMemo, useEffect } from 'react';
import { Cliente, TipoCliente, StatusCliente } from '../types';

interface ClientListProps {
  clients: Cliente[];
  onAddNew: () => void;
  onEdit: (client: Cliente) => void;
  onDelete: (clientId: string) => void;
  onShare: () => void;
}

type ViewMode = 'card' | 'list';
type SortByType = 'dataCriacaoDesc' | 'dataCriacaoAsc' | 'nomeAsc' | 'nomeDesc' | 'maiorVolume';


const ClientList: React.FC<ClientListProps> = ({ clients, onAddNew, onEdit, onDelete, onShare }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>(''); // Novo estado para filtro de status
    const [filterCity, setFilterCity] = useState<string>('');
    const [sortBy, setSortBy] = useState<SortByType>('dataCriacaoDesc');
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        return (localStorage.getItem('crm_view_mode') as ViewMode) || 'card';
    });

    useEffect(() => {
        localStorage.setItem('crm_view_mode', viewMode);
    }, [viewMode]);

    const filteredAndSortedClients = useMemo(() => {
        const calculateTotalVolume = (client: Cliente): number => {
            return (client.obras || []).reduce((totalObras, obra) => 
                totalObras + (obra.tracos || []).reduce((totalTracos, traco) => totalTracos + (traco.volumeM3 || 0), 0)
            , 0);
        };

        let filtered = clients.filter(client => {
            const searchLower = searchTerm.toLowerCase().trim();
            const cityLower = filterCity.toLowerCase().trim();

            // Filter by Type
            const matchesType = !filterType || client.tipo === filterType;
            if (!matchesType) return false;

            // Filter by Status
            const matchesStatus = !filterStatus || client.status === filterStatus;
            if (!matchesStatus) return false;

            // Filter by City
            const matchesCity = !cityLower ||
                (client.enderecoEscritorio?.cidade || '').toLowerCase().includes(cityLower) ||
                (client.obras || []).some(obra => (obra.endereco?.cidade || '').toLowerCase().includes(cityLower));
            if (!matchesCity) return false;

            if (!searchLower) return true;

            // Normalize search term and client CNPJ/CPF for a robust, unified search
            const searchDigitsOnly = searchTerm.replace(/\D/g, '');
            const clientCnpjDigitsOnly = (client.cnpjCpf || '').replace(/\D/g, '');
            
            // Precise check for CNPJ/CPF match (handles formatted/unformatted input)
            const cnpjMatch = searchDigitsOnly.length > 0 && clientCnpjDigitsOnly.includes(searchDigitsOnly);

            // General text search across other relevant fields
            const fieldsToSearch = [
                client.nomeFantasia,
                client.razaoSocial,
                client.telefone,
                client.whatsapp,
                client.email,
                ...(client.contatos || []).flatMap(c => [c.nome, c.telefone, c.whatsapp, c.email]),
                ...(client.obras || []).flatMap(o => [
                    o.nome, 
                    ...(o.contatos || []).flatMap(oc => [oc.nome, oc.telefone, oc.whatsapp, oc.email])
                ])
            ];
            
            const textMatch = fieldsToSearch.some(field => (field || '').toLowerCase().includes(searchLower));

            return cnpjMatch || textMatch;
        });

        switch (sortBy) {
            case 'dataCriacaoAsc':
                filtered.sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime());
                break;
            case 'nomeAsc':
                filtered.sort((a, b) => (a.nomeFantasia || '').localeCompare(b.nomeFantasia || ''));
                break;
            case 'nomeDesc':
                filtered.sort((a, b) => (b.nomeFantasia || '').localeCompare(a.nomeFantasia || ''));
                break;
            case 'maiorVolume':
                filtered.sort((a, b) => calculateTotalVolume(b) - calculateTotalVolume(a));
                break;
            case 'dataCriacaoDesc':
            default:
                filtered.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
                break;
        }

        return filtered;
    }, [clients, searchTerm, filterType, filterStatus, filterCity, sortBy]);

    const getTotalVolume = (client: Cliente) => {
        return client.obras.reduce((acc, obra) => {
            return acc + obra.tracos.reduce((tracoAcc, traco) => tracoAcc + (traco.volumeM3 || 0), 0);
        }, 0);
    };
    
    const getStatusColor = (status: StatusCliente) => {
        switch (status) {
            case StatusCliente.ATIVO: return 'bg-green-100 text-green-800';
            case StatusCliente.INATIVO: return 'bg-slate-200 text-text-secondary';
            case StatusCliente.INADIMPLENTE: return 'bg-red-100 text-red-800';
            case StatusCliente.PERDIDO: return 'bg-red-100 text-red-800';
            case StatusCliente.POTENCIAL: return 'bg-yellow-100 text-yellow-800';
            case StatusCliente.PROSPECCAO: return 'bg-purple-100 text-purple-800';
            case StatusCliente.NOVO:
            default: return 'bg-sky-100 text-sky-800';
        }
    };
    
    const getTypeColor = (type: TipoCliente) => {
         switch (type) {
            case TipoCliente.CONSTRUTORA: return 'bg-blue-100 text-blue-800';
            case TipoCliente.VAREJO: return 'bg-teal-100 text-teal-800';
            case TipoCliente.PESSOA_FISICA: return 'bg-indigo-100 text-indigo-800';
            case TipoCliente.INFRAESTRUTURA:
            default: return 'bg-amber-100 text-amber-800';
        }
    }


    return (
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow-[0_2px_6px_rgba(15,23,42,0.06)] border border-slate-200 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-text-main">Lista de Clientes ({clients.length})</h2>
                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                    {/* Share Button Added to List Toolbar */}
                    <button 
                        onClick={onShare}
                        className="p-2 rounded-full bg-orange-50 text-primary hover:bg-orange-100 transition border border-orange-100 shadow-sm md:hidden lg:flex"
                        title="Compartilhar App"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    </button>

                    <div className="flex-shrink-0 flex items-center bg-slate-200 rounded-full p-1">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition ${viewMode === 'card' ? 'bg-white text-primary shadow' : 'text-text-secondary hover:bg-slate-300'}`}
                            aria-label="Visualização em Cartões"
                            title="Visualização em Cartões"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M3 4.75A.75.75 0 0 1 3.75 4h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Zm7 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5ZM3.75 11a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 0-.75-.75h-4.5Zm7.75.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" clipRule="evenodd" />
                            </svg>
                        </button>
                         <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition ${viewMode === 'list' ? 'bg-white text-primary shadow' : 'text-text-secondary hover:bg-slate-300'}`}
                            aria-label="Visualização em Lista"
                            title="Visualização em Lista"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                     <button
                        onClick={onAddNew}
                        className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-transform transform hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                        </svg>
                        <span>Novo Cliente</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-text-main placeholder-text-placeholder"
                />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-text-main">
                    <option value="">Todos os Tipos</option>
                    {Object.values(TipoCliente).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-text-main">
                    <option value="">Todos os Status</option>
                    {Object.values(StatusCliente).map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <input
                    type="text"
                    placeholder="Cidade"
                    value={filterCity}
                    onChange={e => setFilterCity(e.target.value)}
                    className="w-full px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-text-main placeholder-text-placeholder"
                />
                 <select value={sortBy} onChange={e => setSortBy(e.target.value as SortByType)} className="w-full px-4 py-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-text-main">
                    <option value="dataCriacaoDesc">Recentes</option>
                    <option value="dataCriacaoAsc">Antigos</option>
                    <option value="nomeAsc">Nome (A-Z)</option>
                    <option value="nomeDesc">Nome (Z-A)</option>
                    <option value="maiorVolume">Maior Volume</option>
                </select>
            </div>

            {filteredAndSortedClients.length > 0 ? (
                viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAndSortedClients.map(client => (
                            <div key={client.id} className={`bg-white rounded-lg shadow-md border border-slate-200 p-4 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 ${client.status === StatusCliente.INATIVO ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold text-primary mb-2 cursor-pointer" onClick={() => onEdit(client)}>{client.nomeFantasia}</h3>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => onEdit(client)} className="text-text-secondary hover:text-secondary p-1" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                            <button onClick={() => onDelete(client.id)} className="text-text-secondary hover:text-error p-1" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-text-secondary truncate" title={client.razaoSocial}>{client.razaoSocial}</p>
                                    <div className="my-3 flex flex-wrap gap-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>{client.status}</span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(client.tipo)}`}>{client.tipo}</span>
                                    </div>
                                    <div className="text-sm text-text-secondary space-y-1 mt-2">
                                        <p><strong>CNPJ/CPF:</strong> {client.cnpjCpf || 'N/A'}</p>
                                        <p><strong>Cidade:</strong> {client.enderecoEscritorio.cidade || 'N/A'}</p>
                                        <p><strong>Volume Total:</strong> {getTotalVolume(client).toFixed(2)} m³</p>
                                    </div>
                                </div>
                                <button onClick={() => onEdit(client)} className="w-full mt-4 bg-secondary hover:bg-secondary-hover text-white font-bold py-2 px-4 rounded-md transition">
                                    Ver Detalhes
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-text-secondary">Nome Fantasia</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-text-secondary">CNPJ/CPF</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-text-secondary">Cidade</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-text-secondary">Status</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-text-secondary">Volume (m³)</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-text-secondary">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredAndSortedClients.map(client => (
                                    <tr key={client.id} className={`hover:bg-slate-50 ${client.status === StatusCliente.INATIVO ? 'text-slate-400' : ''}`}>
                                        <td className="px-4 py-2 text-sm text-text-main font-medium">{client.nomeFantasia}</td>
                                        <td className="px-4 py-2 text-sm text-text-secondary">{client.cnpjCpf}</td>
                                        <td className="px-4 py-2 text-sm text-text-secondary">{client.enderecoEscritorio.cidade}</td>
                                        <td className="px-4 py-2 text-sm"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>{client.status}</span></td>
                                        <td className="px-4 py-2 text-sm text-text-secondary text-right">{getTotalVolume(client).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => onEdit(client)} className="text-secondary hover:underline font-semibold">Editar</button>
                                                <button onClick={() => onDelete(client.id)} className="text-error hover:underline font-semibold">Excluir</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                 <div className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.176-5.97M15 21v-1a6 6 0 00-9-5.197" />
                    </svg>
                    <h3 className="mt-2 text-xl font-semibold text-text-main">Nenhum cliente encontrado</h3>
                    <p className="mt-1 text-sm text-text-secondary">Tente ajustar seus filtros ou cadastre um novo cliente abaixo.</p>
                     <div className="mt-6">
                         <button
                            onClick={onAddNew}
                            className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-transform transform hover:scale-105 mx-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                            </svg>
                            <span>Cadastrar Novo Cliente</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientList;
