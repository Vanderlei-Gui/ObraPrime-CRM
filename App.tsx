
import React, { useState, useEffect, useCallback } from 'react';
import { Cliente, TipoCliente, StatusCliente, Endereco, Contato, Obra, Traco, User, ShareLog } from './types';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import { AuthScreens } from './components/AuthScreens';
import AdminDashboard from './components/AdminDashboard';


const DEFAULT_ENDERECO: Endereco = { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' };
const DEFAULT_CONTATO: Contato = { id: '', nome: '', cargo: '', telefone: '', whatsapp: '', email: '' };
const DEFAULT_TRACO: Traco = { id: '', resistencia: '', tipoBrita: '', slump: '', ac: '', modulo: '', observacoes: '', valorM3: 0, volumeM3: 0 };
const DEFAULT_OBRA: Obra = { id: '', nome: '', endereco: DEFAULT_ENDERECO, observacoes: '', tracos: [], contatos: [] };

const DEFAULT_CLIENTE: Cliente = {
    id: '',
    nomeFantasia: '',
    razaoSocial: '',
    tipo: TipoCliente.CONSTRUTORA,
    cnpjCpf: '',
    telefone: '',
    whatsapp: '',
    email: '',
    status: StatusCliente.NOVO,
    enderecoEscritorio: DEFAULT_ENDERECO,
    obras: [],
    condicoesPagamento: '',
    tipoObraPrincipal: '',
    observacoesGerais: '',
    dataCriacao: '',
    capitalSocial: 0,
    atividadePrincipal: '',
    site: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    contatos: [],
    inscricaoEstadual: '',
};

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // --- APP STATE ---
  const [clients, setClients] = useState<Cliente[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'admin'>('list');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Check for logged in user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('crm_current_session');
    if (storedUser) {
        try {
            const user: User = JSON.parse(storedUser);
            const allUsers: User[] = JSON.parse(localStorage.getItem('crm_users') || '[]');
            const validUser = allUsers.find(u => u.id === user.id);
            
            if (validUser && validUser.status === 'active') {
                setCurrentUser(validUser);
            } else {
                localStorage.removeItem('crm_current_session');
            }
        } catch (e) {
            localStorage.removeItem('crm_current_session');
        }
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      localStorage.setItem('crm_current_session', JSON.stringify(user));
  };

  const handleLogout = () => {
      localStorage.removeItem('crm_current_session');
      setCurrentUser(null);
      setCurrentView('list');
  };

  const saveClientsToLocalStorage = useCallback((updatedClients: Cliente[]) => {
    localStorage.setItem('concrete_crm_clients', JSON.stringify(updatedClients));
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    try {
        const storedClientsRaw = localStorage.getItem('concrete_crm_clients');
        if (!storedClientsRaw) return;

        let parsedClients = JSON.parse(storedClientsRaw);
        if (Array.isArray(parsedClients)) {
            setClients(parsedClients);
        }
    } catch (error) {
        console.error("Erro load clients", error);
    }
  }, [currentUser]); 

  const handleAddNewClient = () => {
    setSelectedClient(null);
    setCurrentView('form');
  };

  const handleEditClient = (client: Cliente) => {
    setSelectedClient(client);
    setCurrentView('form');
  };
  
  const handleDeleteClient = (clientId: string) => {
    if(window.confirm('Tem certeza que deseja excluir este cliente?')) {
        const updatedClients = clients.filter(c => c.id !== clientId);
        setClients(updatedClients);
        saveClientsToLocalStorage(updatedClients);
    }
  };

  const handleSaveClient = (client: Cliente) => {
    const normalizeCnpj = (cnpj: string): string => (cnpj || '').replace(/\D/g, '');
    const cnpjToSave = normalizeCnpj(client.cnpjCpf);

    if (cnpjToSave) {
        const isDuplicate = clients.some(
            existingClient =>
                existingClient.id !== client.id && 
                normalizeCnpj(existingClient.cnpjCpf) === cnpjToSave
        );

        if (isDuplicate) {
            alert('Já existe um cliente cadastrado com este CNPJ.');
            return;
        }
    }

    const formatCnpj = (cnpj: string): string => {
        const digitsOnly = (cnpj || '').replace(/\D/g, '');
        if (digitsOnly.length !== 14) return cnpj; 
        return digitsOnly.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const clientToSave = { ...client, cnpjCpf: formatCnpj(client.cnpjCpf) };
    
    let updatedClients;
    if (clients.some(c => c.id === clientToSave.id)) {
      updatedClients = clients.map(c => c.id === clientToSave.id ? clientToSave : c);
    } else {
      updatedClients = [...clients, clientToSave];
    }
    setClients(updatedClients);
    saveClientsToLocalStorage(updatedClients);
    setCurrentView('list');
    setSelectedClient(null);
  };
  
  const getShareUrl = () => {
      const url = window.location.href;
      
      // Se estiver rodando localmente ou IP privado, o celular não conseguirá acessar.
      // Nesses casos, usamos a URL oficial do app para garantir que o QR Code funcione.
      const isLocal = url.includes('localhost') || 
                      url.includes('127.0.0.1') || 
                      url.includes('192.168') ||
                      url.includes('container'); // Para ambientes de container/preview

      if (isLocal || !url.startsWith('http')) {
          return 'https://obraprime-crm-42515952894.us-west1.run.app';
      }
      return url;
  };

  const handleShareClick = () => {
      setIsShareModalOpen(true);
  };

  const handleNativeShare = async () => {
    if (!currentUser) return;

    const url = getShareUrl();
    const shareData = {
        title: 'ObraPrime CRM',
        text: 'Estou usando um aplicativo incrível que está ajudando muito no meu dia a dia. Ele é rápido, prático e realmente faz a diferença. Quero que você experimente também — recomendo de verdade!',
        url: url
    };

    const logShare = (method: 'native' | 'clipboard') => {
        try {
            const logs: ShareLog[] = JSON.parse(localStorage.getItem('crm_share_logs') || '[]');
            const newLog: ShareLog = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                userId: currentUser.id,
                userName: currentUser.name,
                timestamp: new Date().toISOString(),
                method
            };
            localStorage.setItem('crm_share_logs', JSON.stringify([...logs, newLog]));
        } catch (e) {
            console.error("Error logging share", e);
        }
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
            logShare('native');
        } catch (e) {
            console.error('Erro share', e);
        }
    } else {
        try {
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            alert('Link copiado para a área de transferência!');
            logShare('clipboard');
        } catch (e) {
            alert('Não foi possível compartilhar.');
        }
    }
  };

  // --- RENDER ---

  if (!currentUser) {
      return <AuthScreens onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-text-main pb-20 max-w-[100vw] overflow-x-hidden">
      
      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsShareModalOpen(false)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-scale-in" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsShareModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                
                <div className="text-center mt-2">
                    <div className="w-16 h-16 bg-orange-100 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Compartilhar App</h3>
                    <p className="text-sm text-slate-500 mb-6">Mostre este QR Code para um amigo ou envie o link direto.</p>
                    
                    <div className="bg-white p-3 border border-slate-200 rounded-2xl inline-block mb-6 shadow-lg">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(getShareUrl())}`} alt="QR Code" className="w-48 h-48 rounded-lg" />
                    </div>

                    <div className="space-y-3">
                        <button onClick={handleNativeShare} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-200 active:scale-[0.98]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                            Enviar Link
                        </button>
                         <button onClick={() => {
                             navigator.clipboard.writeText(getShareUrl());
                             alert('Link copiado!');
                         }} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl transition border border-slate-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            Copiar Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="bg-white px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-30 md:hidden">
        <span className="text-lg font-bold text-slate-800">ObraPrime</span>
        <div className="flex gap-3">
            <button onClick={handleShareClick} className="text-primary bg-orange-50 p-2 rounded-full active:bg-orange-100 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
            </button>
            <button onClick={handleLogout} className="text-slate-400 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </div>

      {/* Desktop Header (Hidden on Mobile) */}
      <header className="bg-slate-900 shadow-md sticky top-0 z-30 hidden md:block">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('list')}>
            <div className="bg-primary p-1.5 rounded-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8-8 8z"/>
                    <path d="M11 7h2v6.425l3.495-3.495 1.414 1.414L12.086 17H11V7z"/>
                </svg>
            </div>
            <h1 className="text-xl font-bold text-white">ObraPrime</h1>
          </div>

          <div className="flex items-center gap-6">
              <button onClick={handleShareClick} className="text-white bg-white/10 hover:bg-white/20 py-1.5 px-4 rounded-full text-sm flex items-center gap-2 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                  Compartilhar App
              </button>
              <div className="text-right">
                  <p className="text-white text-sm font-bold">{currentUser.name}</p>
                  <p className="text-slate-400 text-xs">{currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
              {currentUser.role === 'admin' && (
                 <button onClick={() => setCurrentView('admin')} className={`p-2 rounded-full ${currentView === 'admin' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                 </button>
              )}
              <button onClick={handleLogout} className="text-slate-300 hover:text-white p-2" title="Sair">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
              </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-2 sm:p-6 pb-24">
        {currentView === 'admin' ? (
            currentUser.role === 'admin' ? <AdminDashboard /> : <div className="text-center py-10 text-red-600">Acesso Negado.</div>
        ) : currentView === 'list' ? (
          <ClientList 
            clients={clients} 
            onAddNew={handleAddNewClient} 
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            onShare={handleShareClick}
          />
        ) : (
          <ClientForm 
            client={selectedClient} 
            onSave={handleSaveClient} 
            onCancel={() => {
                setSelectedClient(null);
                setCurrentView('list');
            }} 
          />
        )}
        
        <div className="text-center mt-12 mb-6">
            <p className="text-slate-400 font-bold text-xs">Desenvolvido por Vanderlei Barros</p>
            <p className="text-slate-300 text-[10px] mt-0.5 mb-1">Tecnologia • Gestão • Automação</p>
            <a href="mailto:vanderlei.barros.sb@gmail.com" className="text-slate-300 text-[10px] hover:text-primary transition">vanderlei.barros.sb@gmail.com</a>
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden pb-safe">
          <button onClick={() => setCurrentView('list')} className={`flex flex-col items-center ${currentView === 'list' ? 'text-primary' : 'text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.176-5.97M15 21v-1a6 6 0 00-9-5.197" /></svg>
              <span className="text-[10px] font-medium mt-1">Clientes</span>
          </button>
          
          {/* Share Button on Mobile Bottom Nav */}
          <button onClick={handleShareClick} className="flex flex-col items-center text-slate-400 hover:text-primary">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
               <span className="text-[10px] font-medium mt-1">Share</span>
          </button>

          <button onClick={handleAddNewClient} className="flex flex-col items-center text-slate-400 hover:text-primary relative -top-5">
              <div className="bg-primary text-white p-3 rounded-full shadow-lg shadow-orange-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              </div>
              <span className="text-[10px] font-medium mt-1">Novo</span>
          </button>
          {currentUser.role === 'admin' && (
            <button onClick={() => setCurrentView('admin')} className={`flex flex-col items-center ${currentView === 'admin' ? 'text-primary' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[10px] font-medium mt-1">Admin</span>
            </button>
          )}
      </nav>
    </div>
  );
};

export default App;
