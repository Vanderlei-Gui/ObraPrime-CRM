
export enum TipoCliente {
  CONSTRUTORA = 'Construtora',
  VAREJO = 'Varejo / Home Center',
  INFRAESTRUTURA = 'Infraestrutura',
  PESSOA_FISICA = 'Pessoa Física',
}

export enum StatusCliente {
  NOVO = 'Novo',
  ATIVO = 'Ativo',
  INATIVO = 'Inativo',
  POTENCIAL = 'Potencial',
  PROSPECCAO = 'Prospecção',
  PERDIDO = 'Perdido',
  INADIMPLENTE = 'Inadimplente',
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Traco {
  id: string;
  resistencia: string; // FCK
  tipoBrita: string;
  slump: string;
  ac: string; // Agua/Cimento
  modulo: string;
  observacoes: string;
  valorM3: number;
  volumeM3: number;
}

export interface Obra {
  id: string;
  nome: string;
  endereco: Endereco;
  observacoes: string;
  tracos: Traco[];
  contatos: Contato[];
}

export interface Contato {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  whatsapp: string;
  email: string;
}

export interface Cliente {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  tipo: TipoCliente;
  cnpjCpf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  status: StatusCliente;
  enderecoEscritorio: Endereco;
  obras: Obra[];
  condicoesPagamento: string;
  tipoObraPrincipal: string;
  observacoesGerais: string;
  dataCriacao: string;
  capitalSocial?: number;
  atividadePrincipal?: string;
  site?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  contatos: Contato[];
  inscricaoEstadual?: string;
}

// --- AUTH & ADMIN TYPES ---

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string; 
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string;
}

export interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  type: 'login' | 'register' | 'logout' | 'blocked_attempt';
  deviceInfo: string;
}

export interface ShareLog {
    id: string;
    userId: string;
    userName: string;
    timestamp: string;
    method: 'native' | 'clipboard';
}
