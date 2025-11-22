import React, { useState, useEffect } from 'react';
import { User, AccessLog, ShareLog } from '../types';

interface AdminUser extends User {
  totalAccesses: number;
  totalShares: number;
  authType: string; // Derivado, ex: 'google' ou 'senha'
  lastAccess: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'stats'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [shareLogs, setShareLogs] = useState<ShareLog[]>([]);

  // Load Real Data from LocalStorage
  useEffect(() => {
    loadData();
    
    // Listener para atualizar se houver mudanças em outras abas (opcional, mas boa prática)
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const loadData = () => {
    try {
        const storedUsers: User[] = JSON.parse(localStorage.getItem('crm_users') || '[]');
        const storedLogs: AccessLog[] = JSON.parse(localStorage.getItem('crm_access_logs') || '[]');
        const storedShares: ShareLog[] = JSON.parse(localStorage.getItem('crm_share_logs') || '[]');

        // Process Users with Metrics
        const processedUsers: AdminUser[] = storedUsers.map(u => {
            const userLogs = storedLogs.filter(l => l.userId === u.id);
            const userShares = storedShares.filter(s => s.userId === u.id);
            
            return {
                ...u,
                authType: u.password === 'google-oauth-secure-placeholder' ? 'google' : 'password',
                totalAccesses: userLogs.filter(l => l.type === 'login').length,
                totalShares: userShares.length,
                lastAccess: u.lastLogin || u.createdAt // Fallback
            };
        });

        setUsers(processedUsers);
        setLogs(storedLogs);
        setShareLogs(storedShares);

    } catch (error) {
        console.error("Erro ao carregar dados do admin", error);
    }
  };

  const toggleBlockUser = (id: string) => {
    const updatedUsers = users.map(u => {
        if (u.id === id) {
            // Não permite bloquear o admin principal
            if (u.email === 'vanderlei.barros.sb@gmail.com') {
                alert('Não é possível bloquear o administrador principal.');
                return u;
            }
            return { ...u, status: u.status === 'active' ? 'blocked' : 'active' as 'active' | 'blocked' };
        }
        return u;
    });

    setUsers(updatedUsers);
    
    // Persist changes to 'crm_users' stripping the extra admin fields
    const usersToSave = updatedUsers.map(({ totalAccesses, totalShares, authType, lastAccess, ...originalUser }) => originalUser);
    localStorage.setItem('crm_users', JSON.stringify(usersToSave));
    
    // Force logout if blocked (optional logic for App.tsx to handle)
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nome', 'Email', 'Tipo Login', 'Cadastro', 'Último Acesso', 'Acessos', 'Compartilhamentos', 'Status'];
    const csvContent = [
      headers.join(','),
      ...users.map(u => 
        `"${u.id}","${u.name}","${u.email}","${u.authType}","${u.createdAt}","${u.lastAccess}",${u.totalAccesses},${u.totalShares},"${u.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `obraprime_usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackup = () => {
    const backupData = {
        timestamp: new Date().toISOString(),
        users: JSON.parse(localStorage.getItem('crm_users') || '[]'),
        clients: JSON.parse(localStorage.getItem('concrete_crm_clients') || '[]'),
        accessLogs: JSON.parse(localStorage.getItem('crm_access_logs') || '[]'),
        shareLogs: JSON.parse(localStorage.getItem('crm_share_logs') || '[]')
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `backup_obraprime_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                
                // Validação básica
                if (!json.users || !json.clients) throw new Error("Formato de backup inválido.");

                if (window.confirm(`Deseja restaurar o backup de ${json.timestamp}? Isso substituirá os dados atuais.`)) {
                    localStorage.setItem('crm_users', JSON.stringify(json.users));
                    localStorage.setItem('concrete_crm_clients', JSON.stringify(json.clients));
                    localStorage.setItem('crm_access_logs', JSON.stringify(json.accessLogs || []));
                    localStorage.setItem('crm_share_logs', JSON.stringify(json.shareLogs || []));
                    
                    alert('Sistema restaurado com sucesso! A página será recarregada.');
                    window.location.reload();
                }
            } catch (err) {
                alert('Erro ao restaurar: Arquivo inválido.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
  };

  // Stats Calculations
  const totalShares = shareLogs.length;
  const topSharers = [...users].sort((a, b) => b.totalShares - a.totalShares).slice(0, 5);

  return (
    <div className="bg-slate-100 min-h-screen p-2 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Mobile Friendly */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Painel Administrativo</h1>
            <p className="text-slate-500 text-xs md:text-sm">Controle de Usuários e Sistema</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
             <button onClick={handleBackup} className="flex-1 md:flex-none px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-300 transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.965 3.129V2.75z" /><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" /></svg>
                Backup
             </button>
             <button onClick={handleRestore} className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-700 transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l2.5-2.5a.75.75 0 00-1.06-1.06l-1.99 1.99V6.75z" clipRule="evenodd" /></svg>
                Restaurar
             </button>
          </div>
        </div>

        {/* Tabs Scrollable on Mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => setActiveTab('users')} className={`px-4 md:px-6 py-3 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap transition ${activeTab === 'users' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            Usuários ({users.length})
          </button>
          <button onClick={() => setActiveTab('logs')} className={`px-4 md:px-6 py-3 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap transition ${activeTab === 'logs' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            Logs ({logs.length})
          </button>
          <button onClick={() => setActiveTab('stats')} className={`px-4 md:px-6 py-3 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap transition ${activeTab === 'stats' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            Estatísticas
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px] relative">
          
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700">Base de Usuários</h3>
                <button onClick={handleExportCSV} className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition flex items-center gap-1">
                  Exportar CSV
                </button>
              </div>
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="p-3">Usuário</th>
                      <th className="p-3 hidden md:table-cell">Tipo</th>
                      <th className="p-3 hidden md:table-cell">Cadastro</th>
                      <th className="p-3 hidden md:table-cell">Último Acesso</th>
                      <th className="p-3 text-center">Acessos</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs md:text-sm divide-y divide-slate-100">
                    {users.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
                    ) : users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-[10px] text-slate-500">{u.email}</p>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.authType === 'google' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                            {u.authType === 'google' ? 'Google' : 'Senha'}
                          </span>
                        </td>
                        <td className="p-3 hidden md:table-cell text-slate-500 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 hidden md:table-cell text-slate-500 whitespace-nowrap">{new Date(u.lastAccess).toLocaleString('pt-BR')}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{u.totalAccesses}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.status === 'active' ? 'Ativo' : 'Block'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {u.email !== 'vanderlei.barros.sb@gmail.com' && (
                              <button 
                                onClick={() => toggleBlockUser(u.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition border ${u.status === 'active' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                              >
                                {u.status === 'active' ? 'Bloquear' : 'Liberar'}
                              </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="p-4 md:p-6">
              <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-4">Log de Atividades</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center">Nenhum registro de atividade.</p>
                ) : logs.map((log) => (
                  <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs md:text-sm">
                    <div className="mb-1 md:mb-0">
                      <p className="font-bold text-slate-800">{log.userName} <span className="font-normal text-slate-500">({log.userEmail})</span></p>
                      <p className="text-slate-500 uppercase text-[10px] font-bold tracking-wide mt-0.5">
                        {log.type === 'login' && <span className="text-green-600">Login</span>}
                        {log.type === 'logout' && <span className="text-orange-600">Logout</span>}
                        {log.type === 'register' && <span className="text-blue-600">Novo Cadastro</span>}
                        {log.type === 'blocked_attempt' && <span className="text-red-600">Acesso Bloqueado</span>}
                      </p>
                    </div>
                    <div className="text-right">
                         <span className="block text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                         <span className="block text-[9px] text-slate-300 truncate max-w-[200px]">{log.deviceInfo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-orange-50 p-4 md:p-6 rounded-xl border border-orange-100">
                  <p className="text-orange-600 font-bold uppercase text-[10px] tracking-wider">Compartilhamentos</p>
                  <p className="text-3xl md:text-4xl font-black text-slate-800 mt-2">{totalShares}</p>
                </div>
                <div className="bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-100">
                  <p className="text-blue-600 font-bold uppercase text-[10px] tracking-wider">Usuários Ativos</p>
                  <p className="text-3xl md:text-4xl font-black text-slate-800 mt-2">{users.filter(u => u.status === 'active').length}</p>
                </div>
                <div className="bg-purple-50 p-4 md:p-6 rounded-xl border border-purple-100">
                  <p className="text-purple-600 font-bold uppercase text-[10px] tracking-wider">Total de Logs</p>
                  <p className="text-3xl md:text-4xl font-black text-slate-800 mt-2">{logs.length}</p>
                </div>
              </div>

              <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-4">Ranking: Quem mais compartilha</h3>
              <div className="space-y-3">
                {topSharers.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nenhum compartilhamento registrado ainda.</p>
                ) : topSharers.map((u, idx) => (
                  <div key={u.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-100 text-slate-600'}`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="block text-xl font-bold text-primary">{u.totalShares}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Shares</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;