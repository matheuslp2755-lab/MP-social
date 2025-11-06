import React, { useState, useEffect } from 'react';
import { auth, db, collection, query, where, onSnapshot, orderBy } from '../../firebase';

interface Conversation {
    id: string;
    otherUser: {
        id: string;
        username: string;
        avatar: string;
    };
    lastMessage?: {
        text: string;
        timestamp: any;
    };
}

interface ConversationListProps {
    onSelectConversation: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const q = query(
            collection(db, 'conversations'), 
            where('participants', 'array-contains', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map(doc => {
                const data = doc.data();
                const otherUserId = data.participants.find((p: string) => p !== currentUser.uid);
                const otherUserInfo = data.participantInfo[otherUserId];
                const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserInfo?.username || '?')}&background=random&color=fff&size=150`;

                return {
                    id: doc.id,
                    otherUser: {
                        id: otherUserId,
                        username: otherUserInfo?.username || 'Usuário',
                        avatar: otherUserInfo?.avatar || defaultAvatar,
                    },
                    lastMessage: data.lastMessage,
                };
            });
            setConversations(convos);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (loading) {
        return <div className="p-4 text-center text-sm text-zinc-500">Carregando conversas...</div>;
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-center">{currentUser?.displayName}</h3>
            </div>
            {conversations.length === 0 ? (
                <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">Nenhuma conversa ainda.</p>
            ) : (
                <ul>
                    {conversations.map(convo => (
                        <li key={convo.id}>
                            <button
                                onClick={() => onSelectConversation(convo.id)}
                                className="w-full text-left flex items-center p-3 gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                                <img src={convo.otherUser.avatar} alt={convo.otherUser.username} className="w-14 h-14 rounded-full object-cover" />
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold">{convo.otherUser.username}</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                        {convo.lastMessage?.text || '...'}
                                    </p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ConversationList;