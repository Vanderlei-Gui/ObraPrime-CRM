
import React from 'react';
import { Traco } from '../types';

interface TracoFormProps {
    traco: Traco;
    onUpdate: (traco: Traco) => void;
    onDelete: (tracoId: string) => void;
}

const SmallInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, ...props }) => (
    <div className="w-full">
       {label && <label className="block lg:hidden text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 truncate">{label}</label>}
       <input {...props} className={`w-full px-3 py-2 h-[44px] lg:h-[36px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary text-slate-800 placeholder-slate-300 text-sm transition-shadow ${className}`} />
    </div>
);

const TracoForm: React.FC<TracoFormProps> = ({ traco, onUpdate, onDelete }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        onUpdate({ ...traco, [name]: type === 'number' ? parseFloat(value) || 0 : value });
    };

    return (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 lg:gap-2 items-end hover:border-slate-300 hover:shadow-sm transition relative">
            <SmallInput label="FCK (MPa)" name="resistencia" value={traco.resistencia} onChange={handleChange} placeholder="Ex: 25" className="lg:col-span-1" />
            <SmallInput label="Brita" name="tipoBrita" value={traco.tipoBrita} onChange={handleChange} placeholder="0 ou 1" className="lg:col-span-1" />
            <SmallInput label="Slump" name="slump" value={traco.slump} onChange={handleChange} placeholder="120" className="lg:col-span-1" />
            <SmallInput label="A/C" name="ac" value={traco.ac} onChange={handleChange} placeholder="0.55" className="lg:col-span-1" />
            <SmallInput label="Observação" name="observacoes" value={traco.observacoes} onChange={handleChange} placeholder="Detalhes" className="col-span-2 sm:col-span-4 lg:col-span-2" />
            
            <div className="relative lg:col-span-1">
                <label className="block lg:hidden text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Preço</label>
                <span className="absolute left-3 top-[29px] lg:top-2.5 text-slate-400 text-xs z-10 select-none">R$</span>
                <SmallInput type="number" name="valorM3" value={traco.valorM3} onChange={handleChange} placeholder="0" className="pl-8 lg:pl-6 text-right" />
            </div>
            
             <div className="relative lg:col-span-1">
                <label className="block lg:hidden text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Vol.</label>
                <SmallInput type="number" name="volumeM3" value={traco.volumeM3} onChange={handleChange} placeholder="0" className="pr-8 lg:pr-6 text-right font-bold text-slate-700 bg-white" />
                <span className="absolute right-3 top-[29px] lg:top-2.5 text-slate-400 text-xs z-10 select-none">m³</span>
            </div>
            
            <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex justify-center lg:pb-0.5 mt-1 lg:mt-0">
                <button type="button" onClick={() => onDelete(traco.id)} className="w-full lg:w-auto py-2.5 lg:py-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg text-xs font-bold transition border border-red-100 flex items-center justify-center gap-1">
                    <span className="lg:hidden">Remover Traço</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .53 1.405c.78-.246 1.566-.389 2.365-.466v1.444a.75.75 0 0 0 1.5 0v-1.444c.795.077 1.58.22 2.365.468a.75.75 0 1 0 .53-1.405c-.78-.247-1.566-.39-2.365-.466v-.443A2.75 2.75 0 0 0 8.75 1zM3.5 6.75A.75.75 0 0 1 4.25 6h11.5a.75.75 0 0 1 0 1.5H4.25A.75.75 0 0 1 3.5 6.75zM5.375 8a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5a.75.75 0 0 1 .75-.75zM10 8.75a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5zm3.875-.75a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5a.75.75 0 0 1 .75-.75z" clipRule="evenodd" /></svg>
                </button>
            </div>
        </div>
    );
};

export default TracoForm;
