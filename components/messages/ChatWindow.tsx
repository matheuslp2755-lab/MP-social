import React, { useState, useEffect, useRef } from 'react';
import { auth, db, doc, collection, query, orderBy, onSnapshot, writeBatch, serverTimestamp } from '../../firebase';

interface ChatWindowProps {
    conversationId: string | null;
    onBack: () => void;
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: any;
}

interface OtherUser {
    id: string;
    username: string;
    avatar: string;
}

const BackArrowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
);


const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onBack }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [loading, setLoading] = useState(false);
    const currentUser = auth.currentUser;
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!conversationId || !currentUser) {
            setMessages([]);
            setOtherUser(null);
            return;
        }

        setLoading(true);

        const unsubConversation = onSnapshot(doc(db, 'conversations', conversationId), (doc) => {
            const data = doc.data();
            if (data) {
                const otherUserId = data.participants.find((p: string) => p !== currentUser.uid);
                const otherUserInfo = data.participantInfo[otherUserId];
                const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserInfo?.username || '?')}&background=random&color=fff&size=150`;
                setOtherUser({
                    id: otherUserId,
                    username: otherUserInfo?.username || 'Usuário',
                    avatar: otherUserInfo?.avatar || defaultAvatar,
                });
            }
        });

        const messagesQuery = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setLoading(false);
        });

        return () => {
            unsubConversation();
            unsubMessages();
        };
    }, [conversationId, currentUser]);

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !currentUser || !conversationId) return;

        const tempMessage = newMessage;
        setNewMessage('');

        const conversationRef = doc(db, 'conversations', conversationId);
        const messagesRef = collection(conversationRef, 'messages');

        try {
            const batch = writeBatch(db);
            
            const newMessageRef = doc(messagesRef);
            batch.set(newMessageRef, {
                senderId: currentUser.uid,
                text: tempMessage,
                timestamp: serverTimestamp(),
            });

            batch.update(conversationRef, {
                lastMessage: {
                    text: tempMessage,
                    senderId: currentUser.uid,
                },
                updatedAt: serverTimestamp(),
            });
            
            await batch.commit();

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center">Carregando mensagens...</div>;
    }
    
    if (!conversationId) {
         return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <svg aria-label="Direct" className="w-24 h-24 text-zinc-800 dark:text-zinc-200" fill="currentColor" height="96" role="img" viewBox="0 0 96 96" width="96"><path d="M48 0C21.534 0 0 21.534 0 48s21.534 48 48 48 48-21.534 48-48S74.466 0 48 0Zm0 91.5C24.087 91.5 4.5 71.913 4.5 48S24.087 4.5 48 4.5 91.5 24.087 91.5 48 71.913 91.5 48 91.5Zm16.5-54.498L33.91 56.41l-10.46-10.46a4.5 4.5 0 0 0-6.364 6.364l13.642 13.64a4.5 4.5 0 0 0 6.364 0L70.864 43.37a4.5 4.5 0 0 0-6.364-6.368Z"></path></svg>
                <h2 className="text-2xl mt-4">Suas Mensagens</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2">Envie fotos e mensagens privadas para um amigo.</p>
            </div>
        );
    }


    return (
        <div className="flex flex-col h-full">
            {otherUser && (
                <header className="flex items-center gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <button onClick={onBack} aria-label="Voltar para as conversas">
                       <BackArrowIcon className="w-6 h-6" />
                    </button>
                    <img src={otherUser.avatar} alt={otherUser.username} className="w-10 h-10 rounded-full object-cover" />
                    <p className="font-semibold">{otherUser.username}</p>
                </header>
            )}
            <div className="flex-grow p-4 overflow-y-auto">
                <div className="flex flex-col gap-3">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                                msg.senderId === currentUser?.uid 
                                ? 'bg-sky-500 text-white rounded-br-none' 
                                : 'bg-zinc-200 dark:bg-zinc-800 rounded-bl-none'
                            }`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mensagem..."
                        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full py-2 px-4 text-sm focus:outline-none focus:border-sky-500"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="text-sky-500 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed px-2">
                        Enviar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;