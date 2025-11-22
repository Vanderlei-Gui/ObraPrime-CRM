
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Cliente, Obra, Traco, Endereco, TipoCliente, StatusCliente, Contato } from '../types';
import ObraCard from './ObraCard';
import useGeolocation from '../hooks/useGeolocation';
import ContatoForm from './ContatoForm';
import { GoogleGenAI } from "@google/genai";


interface ClientFormProps {
  client: Cliente | null;
  onSave: (client: Cliente) => void;
  onCancel: () => void;
}

interface CnpjData {
  situacaoCadastral: string;
  dataAbertura: string;
  idade: string;
  dataSituacaoCadastral: string;
  qsa: { nome_socio: string; qualificacao_socio: string }[];
  capitalSocial: number;
  atividadePrincipal: { code: string; text: string };
  atividadesSecundarias: { code: string; text: string }[];
  inscricaoEstadual: string;
  naturezaJuridica: string;
}

interface CompanySearchResult {
    razaoSocial: string;
    cnpj: string;
    cidade: string;
    uf: string;
    atividadePrincipal: string;
    // Extended fields for full population
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    email?: string;
    telefone?: string;
}

const Section: React.FC<{
  title: string;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}> = ({ title, color, isOpen, onToggle, children, headerContent }) => (
  <div className="bg-card rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex justify-between items-center px-4 py-4 text-left font-bold text-md text-white ${color} active:brightness-90 transition-all`}
    >
      <span>{title}</span>
      <div className="flex items-center gap-4">
        {headerContent}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
    {isOpen && (
      <div className="p-3 sm:p-5 transition-all duration-500 ease-in-out bg-slate-50/50">
        {children}
      </div>
    )}
  </div>
);

// UI Components with Labels - Optimized for Mobile (Min height 48px for touch targets)
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
const FormInput: React.FC<FormInputProps> = ({ label, className, ...props }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 truncate">{label}</label>
        <input {...props} className="w-full px-4 py-3 h-[48px] bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-slate-900 placeholder-slate-400 text-base shadow-sm transition-all" />
    </div>
);

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
}
const FormSelect: React.FC<FormSelectProps> = ({ label, className, ...props }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 truncate">{label}</label>
        <select {...props} className="w-full px-4 py-3 h-[48px] bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-slate-900 text-base shadow-sm transition-all" />
    </div>
);

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
const FormTextarea: React.FC<FormTextareaProps> = ({ label, className, ...props }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 truncate">{label}</label>
        <textarea {...props} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-slate-900 placeholder-slate-400 text-base shadow-sm transition-all" />
    </div>
);


const emptyEndereco: Endereco = { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' };
const getInitialClientState = (client: Cliente | null): Cliente => {
    if (client) return JSON.parse(JSON.stringify(client)); // Deep copy to avoid mutation
    const randomId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    return {
        id: randomId,
        nomeFantasia: '',
        razaoSocial: '',
        tipo: TipoCliente.CONSTRUTORA,
        cnpjCpf: '',
        telefone: '',
        whatsapp: '',
        email: '',
        status: StatusCliente.NOVO,
        enderecoEscritorio: { ...emptyEndereco },
        obras: [],
        condicoesPagamento: '',
        tipoObraPrincipal: '',
        observacoesGerais: '',
        dataCriacao: new Date().toISOString(),
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
};

const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Cliente>(() => getInitialClientState(client));
  const { location, loading, error, getLocation } = useGeolocation();
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isOfficeCepLoading, setIsOfficeCepLoading] = useState(false);
  const [cnpjDetails, setCnpjDetails] = useState<CnpjData | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    contacts: true,
    social: true,
    works: true,
    commercial: true,
  });

  const [companyNameSearch, setCompanyNameSearch] = useState('');
  const [isCompanySearchLoading, setIsCompanySearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchSources, setSearchSources] = useState<any[]>([]);


  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    setFormData(getInitialClientState(client));
    setCnpjDetails(null); // Clear details when client changes
  }, [client]);

  // Clear CNPJ details if the user types a new CNPJ after a search
  useEffect(() => {
    setCnpjDetails(null);
  }, [formData.cnpjCpf]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const fieldName = name as keyof Cliente;
    
    if (type === 'number') {
        const numValue = value === '' ? 0 : parseFloat(value);
        setFormData(prev => ({...prev, [fieldName]: isNaN(numValue) ? 0 : numValue}));
    } else {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    }
  };

  const handleEnderecoChange = (name: keyof Endereco, value: string) => {
    setFormData(prev => ({
      ...prev,
      enderecoEscritorio: { ...prev.enderecoEscritorio, [name]: value }
    }));
  };

  const handleImportContact = async () => {
     // Check if API is supported
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        alert('Seu dispositivo não suporta importação direta da agenda. Por favor, digite os dados manualmente.');
        return;
    }

    const props = ['name', 'tel', 'email'];
    const opts = { multiple: false };

    try {
        alert('Este app precisa acessar sua agenda apenas para importar os dados deste contato. Nada será salvo sem sua confirmação.');
        // @ts-ignore - Contacts API is experimental
        const contacts = await navigator.contacts.select(props, opts);
        
        if (contacts.length > 0) {
            const contact = contacts[0];
            const name = contact.name?.[0] || '';
            const tel = contact.tel?.[0] || '';
            const email = contact.email?.[0] || '';
            
            setFormData(prev => ({
                ...prev,
                telefone: tel,
                whatsapp: tel, // Assume same number initially
                email: email || prev.email
            }));
        }
    } catch (err) {
        console.error('Erro ao importar contato:', err);
    }
  };

  const handleOfficeCepLookup = async () => {
    const cep = formData.enderecoEscritorio.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      return;
    }

    setIsOfficeCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('Erro ao buscar CEP.');
      const data = await response.json();
      if (data.erro) {
        alert('CEP não encontrado.');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        enderecoEscritorio: {
          ...prev.enderecoEscritorio,
          logradouro: data.logradouro || prev.enderecoEscritorio.logradouro,
          bairro: data.bairro || prev.enderecoEscritorio.bairro,
          cidade: data.localidade || prev.enderecoEscritorio.cidade,
          estado: data.uf || prev.enderecoEscritorio.estado,
        }
      }));

    } catch (error) {
      console.error('Falha ao buscar CEP:', error);
      alert('Não foi possível buscar o CEP. Verifique sua conexão e tente novamente.');
    } finally {
      setIsOfficeCepLoading(false);
    }
  };
  
  const handleUseLocation = () => {
    const confirm = window.confirm("Este app precisa utilizar sua localização precisa para preencher o endereço. Nada será rastreado sem sua autorização. Deseja continuar?");
    if (!confirm) return;

    getLocation(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
            if (!response.ok) {
                throw new Error('Falha ao buscar o endereço a partir da localização.');
            }
            const data = await response.json();

            if (data && data.address) {
                const address = data.address;
                const fetchedAddress: Partial<Endereco> = {
                    logradouro: address.road || '',
                    numero: address.house_number || '',
                    bairro: address.suburb || address.quarter || address.neighbourhood || '',
                    cidade: address.city || address.town || address.village || '',
                    estado: address.state || '',
                    cep: (address.postcode || '').replace(/[^\d]/g, ''),
                };
                setFormData(prev => ({
                    ...prev,
                    enderecoEscritorio: { ...prev.enderecoEscritorio, ...fetchedAddress }
                }));
            } else {
                alert('Endereço não encontrado para esta localização.');
            }
        } catch (err: any) {
            console.error("Reverse geocoding error:", err);
            alert(`Erro ao buscar endereço: ${err.message}`);
        }
    });
  };

    const handleCompanyNameSearch = async () => {
        if (!companyNameSearch.trim()) {
            alert('Por favor, digite um nome de cliente para buscar.');
            return;
        }

        setIsCompanySearchLoading(true);
        setSearchResults([]);
        setSearchMessage('');
        setSearchSources([]);

        const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        
        const cnpjLimpo = companyNameSearch.replace(/\D/g, '');
        const isCnpj = /^\d{14}$/.test(cnpjLimpo);

        if (isCnpj) {
             try {
                 const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
                 if (!response.ok) throw new Error('CNPJ não encontrado');
                 const data = await response.json();
                 
                 const company: CompanySearchResult = {
                     razaoSocial: data.nome_fantasia || data.razao_social,
                     cnpj: cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
                     cidade: data.municipio,
                     uf: data.uf,
                     atividadePrincipal: data.cnae_fiscal_descricao,
                     logradouro: data.logradouro,
                     numero: data.numero,
                     complemento: data.complemento,
                     bairro: data.bairro,
                     cep: data.cep,
                     email: data.email,
                     telefone: data.ddd_telefone_1
                 };

                 setSearchResults([company]);
                 setIsModalOpen(true);
             } catch (err) {
                 setSearchMessage(`CNPJ ${cnpjLimpo} não encontrado.`);
                 setIsModalOpen(true);
             } finally {
                 setIsCompanySearchLoading(false);
             }
             return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
            Você é um assistente de IA especialista em encontrar dados de empresas brasileiras. Encontre: "${companyNameSearch}".
            Formato JSON OBRIGATÓRIO:
            { "status": "sucesso", "opcoes": [{ "razaoSocial": "Nome", "cnpj": "00.000.000/0000-00", "cidade": "Cidade", "uf": "UF", "atividadePrincipal": "Atividade", "logradouro": "Rua", "numero": "123", "bairro": "Centro", "cep": "00000000", "telefone": "00000000", "email": "email@email.com" }] }
            ou { "status": "nao_encontrado", "mensagem": "..." }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { tools: [{ googleSearch: {} }] },
            });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                setSearchSources(groundingChunks.filter((chunk: any) => chunk.web).map((chunk: any) => chunk.web));
            }

            const resultText = response.text;
            const jsonStartIndex = resultText.indexOf('{');
            const jsonEndIndex = resultText.lastIndexOf('}');

            if (jsonStartIndex === -1 || jsonEndIndex === -1) throw new Error("JSON não encontrado.");
            
            const result = JSON.parse(resultText.substring(jsonStartIndex, jsonEndIndex + 1));
            
            if (result.status === 'sucesso' && result.opcoes?.length > 0) {
                setSearchResults(result.opcoes);
            } else {
                setSearchResults([]);
                setSearchMessage(result.mensagem || 'Não foi possível encontrar empresas.');
            }
            setIsModalOpen(true);

        } catch (error) {
            console.error("Erro busca:", error);
            setSearchMessage("Erro ao buscar empresas via IA. Tente novamente.");
            setIsModalOpen(true);
        } finally {
            setIsCompanySearchLoading(false);
        }
    };
    
    const handleSelectCompany = (company: CompanySearchResult) => {
        setFormData(prev => ({
            ...prev,
            nomeFantasia: company.razaoSocial,
            razaoSocial: company.razaoSocial,
            cnpjCpf: company.cnpj,
            atividadePrincipal: company.atividadePrincipal,
            tipoObraPrincipal: company.atividadePrincipal, 
            email: company.email || prev.email,
            telefone: company.telefone || prev.telefone,
            enderecoEscritorio: {
                ...prev.enderecoEscritorio,
                logradouro: company.logradouro || prev.enderecoEscritorio.logradouro,
                numero: company.numero || prev.enderecoEscritorio.numero,
                complemento: company.complemento || prev.enderecoEscritorio.complemento,
                bairro: company.bairro || prev.enderecoEscritorio.bairro,
                cep: company.cep?.replace(/\D/g, '') || prev.enderecoEscritorio.cep,
                cidade: company.cidade,
                estado: company.uf,
            }
        }));
        setIsModalOpen(false);
        setSearchResults([]);
    };
    
  const isValidCnpj = (cnpj: string): boolean => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
    return true;
  };

  const handleCnpjLookup = async () => {
    const cnpj = formData.cnpjCpf.replace(/[^\d]/g, '');
    if (!cnpj) {
      alert('Por favor, insira um CNPJ para buscar.');
      return;
    }
    if (!isValidCnpj(cnpj)) {
        alert('CNPJ inválido.');
        return;
    }

    setIsCnpjLoading(true);
    setCnpjDetails(null);
    
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        
        if (response.status === 500) throw new Error('Serviço de CNPJ instável. Preencha manualmente.');
        if (response.status === 404) throw new Error('CNPJ não encontrado.');
        if (!response.ok) throw new Error('Erro de conexão.');

        const data = await response.json();
        const ieAtiva = (data.inscricoes_estaduais || []).find((ie: any) => ie.ativo);
        const ieDisplay = ieAtiva ? `${ieAtiva.inscricao_estadual} (${ieAtiva.uf})` : 'Isento';

        setFormData(prev => ({
            ...prev,
            razaoSocial: data.razao_social || '',
            nomeFantasia: data.nome_fantasia || data.razao_social || '',
            telefone: data.ddd_telefone_1 || '',
            email: data.email || '',
            capitalSocial: data.capital_social || 0,
            atividadePrincipal: data.cnae_fiscal_descricao || '',
            inscricaoEstadual: ieDisplay,
            enderecoEscritorio: {
                logradouro: data.logradouro || '',
                numero: data.numero || '',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                cidade: data.municipio || '',
                estado: data.uf || '',
                cep: data.cep?.replace(/[^\d]/g, '') || '',
            },
        }));

        setCnpjDetails({
            situacaoCadastral: data.descricao_situacao_cadastral || 'N/A',
            dataAbertura: data.data_inicio_atividade,
            idade: 'N/A', // Could calculate from date
            dataSituacaoCadastral: data.data_situacao_cadastral,
            qsa: data.qsa || [],
            capitalSocial: data.capital_social || 0,
            atividadePrincipal: { code: data.cnae_fiscal, text: data.cnae_fiscal_descricao },
            atividadesSecundarias: (data.cnaes_secundarios || []).map((c: any) => ({ code: c.codigo, text: c.descricao })),
            inscricaoEstadual: ieDisplay,
            naturezaJuridica: data.natureza_juridica || '',
        });

    } catch (error: any) {
        alert(error.message);
    } finally {
        setIsCnpjLoading(false);
    }
  };


  const handleAddObra = () => {
    const newObra: Obra = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      nome: '',
      endereco: { ...emptyEndereco },
      observacoes: '',
      tracos: [],
      contatos: [],
    };
    setFormData(prev => ({ ...prev, obras: [...prev.obras, newObra] }));
  };
  
  const handleUpdateObra = useCallback((updatedObra: Obra) => {
    setFormData(prev => ({
        ...prev,
        obras: prev.obras.map(obra => obra.id === updatedObra.id ? updatedObra : obra)
    }));
  }, []);

  const handleDeleteObra = useCallback((obraId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta obra?')) {
        setFormData(prev => ({
            ...prev,
            obras: prev.obras.filter(obra => obra.id !== obraId)
        }));
    }
  }, []);

  const handleAddContact = () => {
      const newContact: Contato = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          nome: '',
          cargo: '',
          telefone: '',
          whatsapp: '',
          email: ''
      };
      setFormData(prev => ({ ...prev, contatos: [...prev.contatos, newContact] }));
  };

  const handleUpdateContact = useCallback((updatedContact: Contato) => {
      setFormData(prev => ({
          ...prev,
          contatos: prev.contatos.map(c => c.id === updatedContact.id ? updatedContact : c)
      }));
  }, []);

  const handleDeleteContact = useCallback((id: string) => {
      if(window.confirm('Excluir contato?')) {
          setFormData(prev => ({ ...prev, contatos: prev.contatos.filter(c => c.id !== id) }));
      }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeFantasia) {
      alert('Por favor, preencha o Nome Fantasia.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in px-1 sm:px-4">
      {/* Modal de Busca Inteligente - Full width on mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:w-full sm:max-w-lg p-6 animate-slide-up sm:animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="bg-primary/10 p-2 rounded-full text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
                    </span>
                    Resultado
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {searchMessage && <p className="text-slate-600 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">{searchMessage}</p>}

            {searchResults.length > 0 && (
                <div className="space-y-3 mb-6">
                    {searchResults.map((company, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleSelectCompany(company)}
                            className="w-full text-left p-4 border border-slate-200 rounded-xl hover:bg-orange-50 hover:border-orange-200 transition group shadow-sm active:scale-[0.98]"
                        >
                            <p className="font-bold text-slate-900 text-lg group-hover:text-primary">{company.razaoSocial}</p>
                            <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-slate-500 mt-2 gap-1">
                                <span className="bg-slate-100 px-2 py-1 rounded w-fit font-mono">{company.cnpj}</span>
                                <span>{company.cidade}/{company.uf}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {searchSources.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Fontes da IA:</p>
                    <div className="flex flex-wrap gap-2">
                        {searchSources.map((source: any, i: number) => (
                            <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[100%] bg-white border border-blue-100 px-2 py-1 rounded-md shadow-sm">
                                {source.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="w-full pt-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
        </h2>
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
             <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold transition active:bg-slate-100">
                Cancelar
            </button>
            <button type="submit" onClick={handleSubmit} className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-orange-200 transition transform active:scale-95">
                Salvar
            </button>
        </div>
      </div>

      {/* Busca Inteligente Header - Compact on Mobile */}
      {!client && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 sm:p-6 rounded-2xl shadow-lg mb-6 text-white">
              <label className="block text-sm font-bold text-orange-300 uppercase mb-2 tracking-wide flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 animate-pulse"><path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.75 10a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.25 10a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 4.25 10Z" /></svg>
                  Busca Inteligente (IA)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={companyNameSearch}
                        onChange={(e) => setCompanyNameSearch(e.target.value)}
                        placeholder="Nome da Empresa ou CNPJ..."
                        className="w-full pl-4 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/20 transition text-base"
                        onKeyDown={(e) => e.key === 'Enter' && handleCompanyNameSearch()}
                    />
                    {isCompanySearchLoading && (
                         <div className="absolute right-3 top-1/2 -translate-y-1/2">
                             <svg className="animate-spin h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={handleCompanyNameSearch}
                    disabled={isCompanySearchLoading}
                    className="bg-primary hover:bg-primary-hover text-white px-6 py-3.5 rounded-xl font-bold shadow-lg transition disabled:opacity-70 w-full sm:w-auto active:scale-95"
                  >
                      Buscar
                  </button>
              </div>
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <Section title="Dados Básicos" color="bg-primary" isOpen={openSections.basic} onToggle={() => toggleSection('basic')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormInput label="Nome Fantasia" name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} placeholder="Ex: Empresa X" required />
                <FormInput label="Razão Social" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} placeholder="Ex: Empresa X LTDA" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div className="relative">
                    <FormInput label="CNPJ / CPF" name="cnpjCpf" value={formData.cnpjCpf} onChange={handleChange} placeholder="00.000.000/0000-00" type="tel" />
                    <button type="button" onClick={handleCnpjLookup} disabled={isCnpjLoading} className="absolute right-3 top-[34px] text-xs font-bold text-primary bg-white px-2 py-1 rounded hover:text-primary-hover uppercase border border-primary/20 shadow-sm">
                        {isCnpjLoading ? '...' : 'Buscar'}
                    </button>
                </div>
                 <div className="md:col-span-2">
                     <button type="button" onClick={handleImportContact} className="w-full h-[48px] bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm active:bg-green-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 16.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" /><path fillRule="evenodd" d="M4 4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4zm4-1.5v.75c0 .414.336.75.75.75h2.5a.75.75 0 0 0 .75-.75V2.5h1A1.5 1.5 0 0 1 14.5 4v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 16V4A1.5 1.5 0 0 1 7 2.5h1z" clipRule="evenodd" /></svg>
                        Importar Telefone da Agenda
                    </button>
                 </div>
            </div>

            {cnpjDetails && (
                <div className="space-y-3 animate-fade-in">
                    {/* Status Bar - Stacked on mobile */}
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 grid grid-cols-2 sm:grid-cols-4 gap-3 border border-blue-100">
                        <div><strong className="block text-blue-500 uppercase text-[10px]">Situação</strong> {cnpjDetails.situacaoCadastral}</div>
                        <div><strong className="block text-blue-500 uppercase text-[10px]">Abertura</strong> {cnpjDetails.dataAbertura}</div>
                        <div><strong className="block text-blue-500 uppercase text-[10px]">Capital</strong> {cnpjDetails.capitalSocial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                        <div><strong className="block text-blue-500 uppercase text-[10px]">Insc. Est.</strong> {cnpjDetails.inscricaoEstadual}</div>
                    </div>

                    {/* Details Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Card Sobre */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Sobre a Empresa</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                A empresa <strong>{formData.razaoSocial}</strong>, de natureza jurídica {cnpjDetails.naturezaJuridica.toLowerCase()}, 
                                está localizada em {formData.enderecoEscritorio.cidade}-{formData.enderecoEscritorio.estado}. 
                                Iniciou suas atividades em {cnpjDetails.dataAbertura} e possui um capital social de {cnpjDetails.capitalSocial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
                            </p>
                        </div>

                         {/* Card Sócios (QSA) */}
                         <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">
                                Quadro Societário ({cnpjDetails.qsa.length})
                            </h4>
                            {cnpjDetails.qsa.length > 0 ? (
                                <ul className="text-xs space-y-2 max-h-32 overflow-y-auto">
                                    {cnpjDetails.qsa.map((socio, idx) => (
                                        <li key={idx} className="flex flex-col py-1 border-b border-slate-50 last:border-0">
                                            <span className="font-bold text-slate-700 text-sm">{socio.nome_socio}</span>
                                            <span className="text-slate-500 text-[11px]">{socio.qualificacao_socio}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Nenhum sócio listado na base pública.</p>
                            )}
                        </div>

                        {/* Card Atividades (CNAEs) */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 md:col-span-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Atividades Econômicas (CNAEs)</h4>
                             <div className="mb-3">
                                 <span className="text-[10px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded mr-2 align-middle">PRINCIPAL</span>
                                 <span className="text-sm text-slate-700 font-medium align-middle">{cnpjDetails.atividadePrincipal.text}</span>
                             </div>
                             {cnpjDetails.atividadesSecundarias.length > 0 && (
                                <div className="mt-2">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Secundárias ({cnpjDetails.atividadesSecundarias.length})</p>
                                     <div className="max-h-32 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                         {cnpjDetails.atividadesSecundarias.map((ativ, idx) => (
                                             <div key={idx} className="text-xs text-slate-600 truncate" title={ativ.text}>
                                                 • {ativ.text}
                                             </div>
                                         ))}
                                     </div>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4">
                <FormInput label="Telefone" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 0000-0000" type="tel" />
                <FormInput label="WhatsApp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000" type="tel" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <FormInput label="E-mail" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contato@empresa.com" />
                <FormSelect label="Tipo de Cliente" name="tipo" value={formData.tipo} onChange={handleChange}>
                    {Object.values(TipoCliente).map(t => <option key={t} value={t}>{t}</option>)}
                </FormSelect>
             </div>
              <div className="mt-2">
                <FormSelect label="Status" name="status" value={formData.status} onChange={handleChange}>
                     {Object.values(StatusCliente).map(s => <option key={s} value={s}>{s}</option>)}
                </FormSelect>
             </div>
        </Section>

        <Section 
            title="Endereço" 
            color="bg-slate-700" 
            isOpen={openSections.commercial} 
            onToggle={() => toggleSection('commercial')}
            headerContent={
                 <button type="button" onClick={(e) => { e.stopPropagation(); handleUseLocation(); }} className="text-xs bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-full flex items-center gap-1 font-bold shadow-sm transition active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.1.4-.27.61-.47.21-.2.41-.41.61-.621.2-.21.39-.42.58-.64s.38-.45.56-.68.35-.46.52-.69.33-.47.48-.71.29-.48.44-.74.27-.52.39-.78.23-.52.33-.77.19-.51.28-.76.15-.5.21-.75.11-.49.15-.74s.08-.5.11-.75c.03-.25.05-.5.06-.75L15 6a5 5 0 0 0-10 0l.01.25c.01.25.02.5.06.75s.06.5.11.75.1.5.15.74.12.5.21.75.15.51.28.76.17.52.33.77.2.52.39.78.26.49.44.74.3.47.48.71.32.46.52.69.37.45.56.68.38.43.58.64c.2.21.4.42.61.62.21.2.42.37.61.47a5.741 5.741 0 0 0 .28.14l.019.008.006.003ZM10 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd" /></svg>
                    {loading ? '...' : 'GPS'}
                 </button>
            }
        >
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <div className="relative md:col-span-2">
                    <FormInput label="CEP" name="cep" value={formData.enderecoEscritorio.cep} onChange={e => handleEnderecoChange('cep', e.target.value)} onBlur={handleOfficeCepLookup} placeholder="00000-000" type="tel" />
                     {isOfficeCepLoading && <span className="absolute right-3 top-[38px] text-xs text-slate-400 font-bold">...</span>}
                </div>
                <FormInput label="Logradouro" name="logradouro" value={formData.enderecoEscritorio.logradouro} onChange={e => handleEnderecoChange('logradouro', e.target.value)} placeholder="Rua, Av..." className="col-span-2 md:col-span-4" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <FormInput label="Número" name="numero" value={formData.enderecoEscritorio.numero} onChange={e => handleEnderecoChange('numero', e.target.value)} placeholder="Nº" className="md:col-span-1" type="tel" />
                <FormInput label="Bairro" name="bairro" value={formData.enderecoEscritorio.bairro} onChange={e => handleEnderecoChange('bairro', e.target.value)} placeholder="Bairro" className="md:col-span-2" />
                <FormInput label="Cidade" name="cidade" value={formData.enderecoEscritorio.cidade} onChange={e => handleEnderecoChange('cidade', e.target.value)} placeholder="Cidade" className="col-span-2 md:col-span-2" />
                <FormInput label="UF" name="estado" value={formData.enderecoEscritorio.estado} onChange={e => handleEnderecoChange('estado', e.target.value)} placeholder="UF" className="col-span-2 md:col-span-1" />
            </div>
            <FormInput label="Complemento" name="complemento" value={formData.enderecoEscritorio.complemento} onChange={e => handleEnderecoChange('complemento', e.target.value)} placeholder="Sala, Bloco..." />
        </Section>

        <Section title="Dados Comerciais" color="bg-slate-600" isOpen={openSections.social} onToggle={() => toggleSection('social')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormInput label="Insc. Estadual" name="inscricaoEstadual" value={formData.inscricaoEstadual || ''} onChange={handleChange} placeholder="Inscrição Estadual" />
                <FormInput label="Atividade Principal" name="atividadePrincipal" value={formData.atividadePrincipal || ''} onChange={handleChange} placeholder="CNAE / Descrição" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormInput label="Tipo Obra Principal" name="tipoObraPrincipal" value={formData.tipoObraPrincipal} onChange={handleChange} placeholder="Ex: Predial, Casas" />
                <FormInput label="Condições Pagamento" name="condicoesPagamento" value={formData.condicoesPagamento} onChange={handleChange} placeholder="Ex: 28 dias" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormInput label="Site" name="site" value={formData.site || ''} onChange={handleChange} placeholder="www.site.com.br" />
                 <FormInput label="Instagram" name="instagram" value={formData.instagram || ''} onChange={handleChange} placeholder="@usuario" />
            </div>
            <div className="mt-4">
                <FormTextarea label="Observações Gerais" name="observacoesGerais" value={formData.observacoesGerais} onChange={handleChange} placeholder="Anotações sobre o cliente..." rows={3} />
            </div>
        </Section>

        <Section title="Contatos Adicionais" color="bg-orange-600" isOpen={openSections.contacts} onToggle={() => toggleSection('contacts')}>
            <div className="space-y-3">
                {formData.contatos.map(contato => (
                    <ContatoForm key={contato.id} contato={contato} onUpdate={handleUpdateContact} onDelete={handleDeleteContact} />
                ))}
                <button type="button" onClick={handleAddContact} className="w-full py-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 font-bold hover:bg-orange-100 transition shadow-sm active:bg-orange-200">
                    + Adicionar Contato
                </button>
            </div>
        </Section>

        <Section title="Obras" color="bg-slate-800" isOpen={openSections.works} onToggle={() => toggleSection('works')}>
             <div className="space-y-6">
                {formData.obras.map((obra, index) => (
                    <ObraCard 
                        key={obra.id} 
                        obra={obra} 
                        onUpdate={handleUpdateObra} 
                        onDelete={handleDeleteObra} 
                        obraIndex={index + 1} 
                    />
                ))}
                <button type="button" onClick={handleAddObra} className="w-full py-5 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-200 hover:border-slate-400 transition flex items-center justify-center gap-2 active:bg-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                    Adicionar Nova Obra
                </button>
            </div>
        </Section>

      </form>
    </div>
  );
};

export default ClientForm;
