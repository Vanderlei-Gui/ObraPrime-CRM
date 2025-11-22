
import React, { useMemo, useCallback, useState } from 'react';
import { Obra, Traco, Endereco, Contato } from '../types';
import TracoForm from './TracoForm';
import useGeolocation from '../hooks/useGeolocation';
import ContatoForm from './ContatoForm';
import { GoogleGenAI, Type } from "@google/genai";


interface ObraCardProps {
  obra: Obra;
  onUpdate: (obra: Obra) => void;
  onDelete: (obraId: string) => void;
  obraIndex: number;
}

// Larger inputs for mobile
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
const FormInput: React.FC<FormInputProps> = ({ label, className, ...props }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 truncate">{label}</label>
        <input {...props} className="w-full px-3 py-3 h-[48px] bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-slate-900 placeholder-slate-400 text-base shadow-sm transition-all" />
    </div>
);

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
const FormTextarea: React.FC<FormTextareaProps> = ({ label, className, ...props }) => (
    <div className={className}>
         <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 truncate">{label}</label>
        <textarea {...props} className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-slate-900 placeholder-slate-400 text-base shadow-sm transition-all" />
    </div>
);


const ObraCard: React.FC<ObraCardProps> = ({ obra, onUpdate, onDelete, obraIndex }) => {
    const { loading, error, getLocation } = useGeolocation();
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        onUpdate({ ...obra, [name as keyof Obra]: value });
    };

    const handleEnderecoChange = (name: keyof Endereco, value: string) => {
        onUpdate({ ...obra, endereco: { ...obra.endereco, [name]: value } });
    };

    const handleCepLookup = async () => {
        const cep = obra.endereco.cep.replace(/\D/g, '');
        if (cep.length !== 8) {
            return;
        }

        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Erro ao buscar CEP.');
            const data = await response.json();
            if (data.erro) {
                alert('CEP não encontrado.');
                return;
            }

            onUpdate({
                ...obra,
                endereco: {
                    ...obra.endereco,
                    logradouro: data.logradouro || obra.endereco.logradouro,
                    bairro: data.bairro || obra.endereco.bairro,
                    cidade: data.localidade || obra.endereco.cidade,
                    estado: data.uf || obra.endereco.estado,
                }
            });

        } catch (error) {
            console.error('Falha ao buscar CEP:', error);
            alert('Não foi possível buscar o CEP. Verifique sua conexão e tente novamente.');
        } finally {
            setIsCepLoading(false);
        }
    };

    const handleUseLocation = () => {
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
                    onUpdate({ ...obra, endereco: { ...obra.endereco, ...fetchedAddress } });
                } else {
                     alert('Endereço não encontrado para esta localização.');
                }
            } catch (err: any) {
                console.error("Reverse geocoding error:", err);
                alert(`Erro ao buscar endereço: ${err.message}`);
            }
        });
    };
    
    const handleAddTraco = () => {
        const newTraco: Traco = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            resistencia: '',
            tipoBrita: '',
            slump: '',
            ac: '',
            modulo: '',
            observacoes: '',
            valorM3: 0,
            volumeM3: 0,
        };
        onUpdate({ ...obra, tracos: [...obra.tracos, newTraco] });
    };

    const handleSuggestTraco = async () => {
        const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        if (!apiKey) {
            alert("Chave de API não configurada. Entre em contato com o suporte.");
            return;
        }
        setIsSuggesting(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Atue como um engenheiro civil especialista em tecnologia do concreto.
            Sugira um traço de concreto adequado e otimizado para a seguinte obra:
            Nome da Obra: ${obra.nome || 'Não informado'}
            Descrição/Observações: ${obra.observacoes || 'Estrutura padrão de concreto armado'}
            Localização: ${obra.endereco.cidade || 'Brasil'}

            Baseie-se nas normas técnicas (ABNT NBR) e boas práticas. Se faltarem detalhes, assuma um concreto estrutural padrão (fck 25-30 MPa).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            resistencia: { type: Type.STRING, description: "FCK em MPa (ex: 25 MPa)" },
                            tipoBrita: { type: Type.STRING, description: "Tipo de brita (ex: 1, 0 ou 1 e 2)" },
                            slump: { type: Type.STRING, description: "Abatimento em mm (ex: 120 +/- 20)" },
                            ac: { type: Type.STRING, description: "Fator Água/Cimento (ex: 0.55)" },
                            modulo: { type: Type.STRING, description: "Módulo de Finura ou especificação extra" },
                            observacoes: { type: Type.STRING, description: "Breve justificativa técnica" },
                            valorM3: { type: Type.NUMBER, description: "Preço estimado de mercado, se souber, ou 0" }
                        }
                    }
                }
            });

            const json = JSON.parse(response.text);
            
            const newTraco: Traco = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                resistencia: json.resistencia || '',
                tipoBrita: json.tipoBrita || '',
                slump: json.slump || '',
                ac: json.ac || '',
                modulo: json.modulo || '',
                observacoes: json.observacoes ? `(IA) ${json.observacoes}` : '',
                valorM3: json.valorM3 || 0,
                volumeM3: 0,
            };
            
            onUpdate({ ...obra, tracos: [...obra.tracos, newTraco] });
            
        } catch (error) {
            console.error("AI Suggestion Error", error);
            alert("Não foi possível gerar uma sugestão de traço no momento.");
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleUpdateTraco = useCallback((updatedTraco: Traco) => {
        onUpdate({
            ...obra,
            tracos: obra.tracos.map(t => t.id === updatedTraco.id ? updatedTraco : t)
        });
    }, [obra, onUpdate]);

    const handleDeleteTraco = (tracoId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este traço?')) {
             onUpdate({
                ...obra,
                tracos: obra.tracos.filter(t => t.id !== tracoId)
            });
        }
    };

    const handleAddContato = () => {
        const newContato: Contato = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            nome: '',
            cargo: '',
            telefone: '',
            whatsapp: '',
            email: '',
        };
        onUpdate({ ...obra, contatos: [...(obra.contatos || []), newContato] });
    };

    const handleUpdateContato = useCallback((updatedContato: Contato) => {
        onUpdate({
            ...obra,
            contatos: (obra.contatos || []).map(c => c.id === updatedContato.id ? updatedContato : c)
        });
    }, [obra, onUpdate]);

    const handleDeleteContato = (contatoId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este contato?')) {
             onUpdate({
                ...obra,
                contatos: (obra.contatos || []).filter(c => c.id !== contatoId)
            });
        }
    };

    const totalVolumeObra = useMemo(() => {
        return obra.tracos.reduce((acc, traco) => acc + (traco.volumeM3 || 0), 0);
    }, [obra.tracos]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative animate-scale-in">
        {/* Header melhorado para mobile evitar sobreposição */}
        <div className="flex items-start justify-between mb-4 gap-4 pb-3 border-b border-slate-100">
             <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className="bg-slate-800 text-white font-bold rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm shadow-md">
                    {obraIndex}
                 </div>
                 <h4 className="font-bold text-slate-800 text-lg truncate">Detalhes da Obra</h4>
             </div>
             <button type="button" onClick={() => onDelete(obra.id)} className="text-slate-400 hover:text-error p-2 bg-slate-50 hover:bg-red-50 rounded-full transition flex-shrink-0" title="Excluir Obra">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .53 1.405c.78-.246 1.566-.389 2.365-.466v1.444a.75.75 0 0 0 1.5 0v-1.444c.795.077 1.58.22 2.365.468a.75.75 0 1 0 .53-1.405c-.78-.247-1.566-.39-2.365-.466v-.443A2.75 2.75 0 0 0 8.75 1zM3.5 6.75A.75.75 0 0 1 4.25 6h11.5a.75.75 0 0 1 0 1.5H4.25A.75.75 0 0 1 3.5 6.75zM5.375 8a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5a.75.75 0 0 1 .75-.75zM10 8.75a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5zm3.875-.75a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5a.75.75 0 0 1 .75-.75z" clipRule="evenodd" />
                </svg>
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormInput label="Nome da Obra" name="nome" value={obra.nome} onChange={handleChange} placeholder="Nome / Identificação" className="md:col-span-1" />
            <FormTextarea label="Observações" name="observacoes" value={obra.observacoes} onChange={handleChange} placeholder="Detalhes..." className="md:col-span-2 h-[48px]" rows={1} />
        </div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div className="flex justify-between items-center mb-3">
                 <h5 className="font-bold text-slate-600 text-xs uppercase tracking-wider">Endereço</h5>
                 <button type="button" onClick={handleUseLocation} disabled={loading} className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 disabled:bg-slate-400 active:scale-95 shadow-sm">
                    {loading ? '...' : 'Usar GPS'}
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <FormInput label="CEP" value={obra.endereco.cep} onChange={e => handleEnderecoChange('cep', e.target.value)} onBlur={handleCepLookup} placeholder="00000-000" className="sm:col-span-1" type="tel" />
                <FormInput label="Logradouro" value={obra.endereco.logradouro} onChange={e => handleEnderecoChange('logradouro', e.target.value)} placeholder="Rua..." className="col-span-2 sm:col-span-3" />
                <FormInput label="Número" value={obra.endereco.numero} onChange={e => handleEnderecoChange('numero', e.target.value)} placeholder="Nº" className="sm:col-span-1" type="tel" />
                <FormInput label="Bairro" value={obra.endereco.bairro} onChange={e => handleEnderecoChange('bairro', e.target.value)} placeholder="Bairro" className="sm:col-span-1" />
                <FormInput label="Cidade" value={obra.endereco.cidade} onChange={e => handleEnderecoChange('cidade', e.target.value)} placeholder="Cidade" className="col-span-2 sm:col-span-2" />
                <FormInput label="UF" value={obra.endereco.estado} onChange={e => handleEnderecoChange('estado', e.target.value)} placeholder="UF" className="col-span-2 sm:col-span-1" />
                <FormInput label="Complem." value={obra.endereco.complemento} onChange={e => handleEnderecoChange('complemento', e.target.value)} placeholder="Opcional" className="col-span-2 sm:col-span-3" />
            </div>
        </div>

        <div className="mb-6">
             <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-slate-600 text-xs uppercase tracking-wider">Contatos Locais</h5>
                <button type="button" onClick={handleAddContato} className="text-xs text-blue-600 font-bold hover:underline px-2 py-1">
                   + Adicionar
                </button>
            </div>
            <div className="space-y-3">
                {obra.contatos?.map(contato => (
                    <ContatoForm key={contato.id} contato={contato} onUpdate={handleUpdateContato} onDelete={handleDeleteContato} />
                ))}
            </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h5 className="font-bold text-slate-800 text-base">Traços & Volumes</h5>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        type="button" 
                        onClick={handleSuggestTraco} 
                        disabled={isSuggesting}
                        className="flex-1 sm:flex-none justify-center text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
                    >
                        {isSuggesting ? '...' : 'Sugerir (IA)'}
                    </button>
                    <button type="button" onClick={handleAddTraco} className="flex-1 sm:flex-none justify-center text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition shadow-sm">
                        + Traço
                    </button>
                </div>
            </div>
            
            {/* Table Header - Hidden on Mobile */}
            <div className="hidden lg:grid grid-cols-9 gap-2 px-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1">FCK</div>
                <div className="col-span-1">Brita</div>
                <div className="col-span-1">Slump</div>
                <div className="col-span-1">A/C</div>
                <div className="col-span-2">Obs</div>
                <div className="col-span-1">R$</div>
                <div className="col-span-1">m³</div>
                <div className="col-span-1 text-center">Del</div>
            </div>

            <div className="space-y-3">
                {obra.tracos.map(traco => (
                    <TracoForm key={traco.id} traco={traco} onUpdate={handleUpdateTraco} onDelete={handleDeleteTraco} />
                ))}
                 {obra.tracos.length === 0 && <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50">Sem traços cadastrados.</p>}
            </div>
            
            {totalVolumeObra > 0 && (
                <div className="mt-4 flex justify-end items-center gap-2 text-lg font-bold text-slate-800 bg-slate-50 p-3 rounded-lg">
                    <span>Total:</span>
                    <span className="text-primary">{totalVolumeObra.toFixed(2)} m³</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default ObraCard;
