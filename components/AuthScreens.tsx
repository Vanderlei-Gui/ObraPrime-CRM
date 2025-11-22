
import React, { useState } from 'react';
import { User, AccessLog } from '../types';

interface AuthScreensProps {
    onLoginSuccess: (user: User) => void;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({ onLoginSuccess }) => {
    const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
    
    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    // Register State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regConfirmPass, setRegConfirmPass] = useState('');
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState(false);

    // STRICT ADMIN EMAIL LIST
    const ADMIN_EMAILS = ['vanderlei.barros.sb@gmail.com'];

    const getDeviceInfo = () => {
        return navigator.userAgent;
    };

    const saveLog = (userId: string, userName: string, userEmail: string, type: AccessLog['type']) => {
        try {
            const logs: AccessLog[] = JSON.parse(localStorage.getItem('crm_access_logs') || '[]');
            const newLog: AccessLog = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                userId,
                userName,
                userEmail,
                timestamp: new Date().toISOString(),
                type,
                deviceInfo: getDeviceInfo()
            };
            localStorage.setItem('crm_access_logs', JSON.stringify([newLog, ...logs]));
        } catch (e) {
            console.error("Error saving log", e);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');

        const users: User[] = JSON.parse(localStorage.getItem('crm_users') || '[]');
        const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());

        if (!user) {
            setLoginError('E-mail não encontrado.');
            return;
        }

        if (user.status === 'blocked') {
            setLoginError('Acesso bloqueado pelo administrador.');
            saveLog(user.id, user.name, user.email, 'blocked_attempt');
            return;
        }

        if (user.password !== loginPass) {
            setLoginError('Senha incorreta.');
            return;
        }

        // Update Last Login
        user.lastLogin = new Date().toISOString();
        const updatedUsers = users.map(u => u.id === user.id ? user : u);
        localStorage.setItem('crm_users', JSON.stringify(updatedUsers));

        saveLog(user.id, user.name, user.email, 'login');
        onLoginSuccess(user);
    };

    const handleGoogleLogin = () => {
        setIsGoogleLoading(true);
        
        // Simulating network delay for OAuth
        setTimeout(() => {
            const users: User[] = JSON.parse(localStorage.getItem('crm_users') || '[]');
            const googleEmail = 'usuario.google@gmail.com'; 
            
            let user = users.find(u => u.email === googleEmail);

            if (!user) {
                user = {
                    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                    name: 'Usuário Google',
                    email: googleEmail,
                    phone: '',
                    password: 'google-oauth-secure-placeholder',
                    role: 'user',
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                users.push(user);
                localStorage.setItem('crm_users', JSON.stringify(users));
                saveLog(user.id, user.name, user.email, 'register');
            } else {
                 user.lastLogin = new Date().toISOString();
                 localStorage.setItem('crm_users', JSON.stringify(users.map(u => u.id === user!.id ? user! : u)));
            }

            saveLog(user.id, user.name, user.email, 'login');
            setIsGoogleLoading(false);
            onLoginSuccess(user);
        }, 1500);
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setRegError('');

        if (regPass !== regConfirmPass) {
            setRegError('As senhas não coincidem.');
            return;
        }
        
        if (regPass.length < 6) {
            setRegError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        const users: User[] = JSON.parse(localStorage.getItem('crm_users') || '[]');
        
        if (users.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
            setRegError('Este e-mail já está cadastrado.');
            return;
        }

        const role = ADMIN_EMAILS.includes(regEmail.toLowerCase()) ? 'admin' : 'user';

        const newUser: User = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            name: regName,
            email: regEmail,
            phone: regPhone,
            password: regPass,
            role: role,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        localStorage.setItem('crm_users', JSON.stringify([...users, newUser]));
        
        saveLog(newUser.id, newUser.name, newUser.email, 'register');
        
        setRegSuccess(true);
        setTimeout(() => {
            onLoginSuccess(newUser);
        }, 1500);
    };

    const handleForgotPass = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Em um sistema real, um link de redefinição seria enviado para este e-mail. Como este é um demo local, por favor peça ao admin para redefinir ou crie uma nova conta.');
        setView('login');
    };

    const renderLogo = () => (
        <div className="flex flex-col items-center mb-8 animate-fade-in-down">
             <div className="w-24 h-24 bg-gradient-to-br from-primary to-orange-600 rounded-3xl flex items-center justify-center shadow-xl mb-4 transform rotate-3">
                <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8-8 8z"/>
                    <path d="M11 7h2v6.425l3.495-3.495 1.414 1.414L12.086 17H11V7z"/>
                </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ObraPrime</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Gestão Profissional de Obras</p>
        </div>
    );

    const GoogleButton = () => (
        <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-sm mb-4 active:scale-[0.98]"
        >
            {isGoogleLoading ? (
                <span className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full"></span>
            ) : (
                <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continuar com Google</span>
                </>
            )}
        </button>
    );

    const DeveloperSignature = () => (
        <div className="mt-8 text-center">
            <p className="text-slate-500 font-bold text-xs">Desenvolvido por Vanderlei Barros</p>
            <p className="text-slate-400 text-[10px] mt-0.5 mb-1">Tecnologia • Gestão • Automação</p>
            <a href="mailto:vanderlei.barros.sb@gmail.com" className="text-slate-400 text-[10px] hover:text-primary transition">vanderlei.barros.sb@gmail.com</a>
        </div>
    );

    if (view === 'login') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="w-full max-w-[400px] bg-white rounded-[32px] shadow-xl p-8 animate-fade-in">
                    {renderLogo()}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-bold">{loginError}</div>}
                        
                        <GoogleButton />

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold tracking-wide">ou entrar com e-mail</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">E-mail</label>
                            <input 
                                type="email" 
                                value={loginEmail} 
                                onChange={e => setLoginEmail(e.target.value)} 
                                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition font-medium text-slate-800"
                                placeholder="seu@email.com"
                                required 
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">Senha</label>
                            <input 
                                type="password" 
                                value={loginPass} 
                                onChange={e => setLoginPass(e.target.value)} 
                                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition font-medium text-slate-800"
                                placeholder="••••••••"
                                required 
                            />
                            <div className="flex justify-end mt-2">
                                <button type="button" onClick={() => setView('forgot')} className="text-sm text-primary hover:text-primary-hover font-bold">
                                    Esqueci minha senha
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 transition transform active:scale-[0.97] text-lg">
                            Entrar
                        </button>
                    </form>
                    <div className="mt-8 text-center">
                        <p className="text-slate-500 font-medium">Não tem uma conta? <button onClick={() => setView('register')} className="text-primary font-bold hover:underline">Cadastre-se</button></p>
                    </div>
                </div>
                <DeveloperSignature />
            </div>
        );
    }

    if (view === 'register') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="w-full max-w-[400px] bg-white rounded-[32px] shadow-xl p-8 animate-fade-in">
                     {renderLogo()}
                    <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Criar Nova Conta</h2>
                    {regSuccess ? (
                         <div className="bg-green-50 text-green-700 p-6 rounded-2xl text-center border border-green-100">
                            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="font-bold text-lg">Conta criada com sucesso!</p>
                            <p className="text-sm text-green-600 mt-1">Redirecionando para o login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-3">
                            {regError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-bold">{regError}</div>}
                            
                            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Nome Completo" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary transition" required />
                            <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="E-mail" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary transition" required />
                            <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="Telefone / WhatsApp" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary transition" required />
                            <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="Senha (min 6 car.)" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary transition" required minLength={6} />
                            <input type="password" value={regConfirmPass} onChange={e => setRegConfirmPass(e.target.value)} placeholder="Confirmar Senha" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary transition" required />
                            
                            <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 transition transform active:scale-[0.97] mt-4 text-lg">
                                Criar Conta
                            </button>
                        </form>
                    )}
                    <div className="mt-6 text-center">
                         <button onClick={() => setView('login')} className="text-slate-500 hover:text-primary font-bold">Voltar para o Login</button>
                    </div>
                </div>
                <DeveloperSignature />
            </div>
        );
    }

    if (view === 'forgot') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="w-full max-w-[400px] bg-white rounded-[32px] shadow-xl p-8 animate-fade-in">
                    {renderLogo()}
                    <h2 className="text-xl font-bold text-slate-800 text-center mb-4">Recuperar Senha</h2>
                    <p className="text-slate-500 text-center text-sm mb-6 font-medium">Digite seu e-mail abaixo e enviaremos instruções para redefinir sua senha.</p>
                    
                    <form onSubmit={handleForgotPass} className="space-y-4">
                        <input type="email" required placeholder="Seu e-mail cadastrado" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary transition" />
                         <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 transition transform active:scale-[0.97] text-lg">
                            Enviar Link
                        </button>
                    </form>
                     <div className="mt-6 text-center">
                         <button onClick={() => setView('login')} className="text-slate-500 hover:text-primary font-bold">Voltar para o Login</button>
                    </div>
                </div>
                <DeveloperSignature />
            </div>
        );
    }

    return null;
};
