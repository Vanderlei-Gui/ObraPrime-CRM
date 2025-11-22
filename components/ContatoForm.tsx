
import React from 'react';
import { Contato } from '../types';

interface ContatoFormProps {
    contato: Contato;
    onUpdate: (contato: Contato) => void;
    onDelete: (contatoId: string) => void;
}

const SmallInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className, ...props }) => (
    <div className={className}>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 ml-1 truncate">{label}</label>
        <input {...props} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-secondary text-slate-800 placeholder-slate-300 text-xs transition-all" />
    </div>
);

const ContatoForm: React.FC<ContatoFormProps> = ({ contato, onUpdate, onDelete }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onUpdate({ ...contato, [name]: value });
    };

    const handleImport = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            alert('Funcionalidade não suportada neste dispositivo.');
            return;
        }
        try {
            // @ts-ignore
            const contacts = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: false });
            if (contacts.length) {
                const c = contacts[0];
                onUpdate({
                    ...contato,
                    nome: c.name?.[0] || contato.nome,
                    telefone: c.tel?.[0] || contato.telefone,
                    whatsapp: c.tel?.[0] || contato.whatsapp,
                    email: c.email?.[0] || contato.email
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative group hover:border-slate-300 transition">
            <div className="absolute top-2 right-2 flex gap-2">
                <button type="button" onClick={handleImport} className="text-[10px] text-green-600 font-bold bg-green-100 px-1.5 py-0.5 rounded hover:bg-green-200">Importar</button>
                <button type="button" onClick={() => onDelete(contato.id)} className="text-slate-400 hover:text-red-500 font-bold px-1">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <SmallInput label="Nome" name="nome" value={contato.nome} onChange={handleChange} placeholder="Nome do contato" className="sm:col-span-2" />
                <SmallInput label="Cargo" name="cargo" value={contato.cargo} onChange={handleChange} placeholder="Cargo" />
                <SmallInput label="Telefone" name="telefone" value={contato.telefone} onChange={handleChange} placeholder="Tel" />
                <SmallInput label="WhatsApp" name="whatsapp" value={contato.whatsapp} onChange={handleChange} placeholder="Zap" />
                <SmallInput label="E-mail" type="email" name="email" value={contato.email} onChange={handleChange} placeholder="E-mail" />
            </div>
        </div>
    );
};

export default ContatoForm;
