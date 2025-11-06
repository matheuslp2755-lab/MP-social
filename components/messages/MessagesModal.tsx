import React, { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { auth, db, doc, getDoc, setDoc, serverTimestamp, updateDoc } from '../../firebase';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetUser: { id: string, username: string, avatar: string } | null;
}

const MessagesModal: React.FC<MessagesModalProps> = ({ isOpen, onClose, initialTargetUser }) => {
    // This state tracks the conversation selected by the user from the list.
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    
    // This state tracks whether the user has navigated back from an initial direct chat.
    const [hasNavigatedBackFromInitial, setHasNavigatedBackFromInitial] = useState(false);

    // When the modal opens/closes or the target user changes, reset internal navigation state.
    useEffect(() => {
        if (isOpen) {
            setSelectedConversationId(null);
            setHasNavigatedBackFromInitial(false);
        }
    }, [isOpen, initialTargetUser]);

    // Effect to ensure conversation exists in Firestore when opened directly.
    useEffect(() => {
        if (!isOpen || !initialTargetUser || !auth.currentUser) return;

        const currentUserId = auth.currentUser.uid;
        const targetUserId = initialTargetUser.id;
        const conversationId = [currentUserId, targetUserId].sort().join('_');

        const ensureConversationExists = async () => {
            const conversationRef = doc(db, 'conversations', conversationId);
            try {
                const conversationSnap = await getDoc(conversationRef);
                if (!conversationSnap.exists()) {
                    await setDoc(conversationRef, {
                        participants: [currentUserId, targetUserId],
                        participantInfo: {
                            [currentUserId]: {
                                username: auth.currentUser!.displayName,
                                avatar: auth.currentUser!.photoURL,
                            },
                            [targetUserId]: {
                                username: initialTargetUser.username,
                                avatar: initialTargetUser.avatar,
                            }
                        },
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    await updateDoc(conversationRef, { updatedAt: serverTimestamp() });
                }
            } catch (error) {
                console.error("Error ensuring conversation exists:", error);
            }
        };

        ensureConversationExists();
    }, [isOpen, initialTargetUser]);

    if (!isOpen) return null;

    const initialConversationId = initialTargetUser && auth.currentUser
        ? [auth.currentUser.uid, initialTargetUser.id].sort().join('_')
        : null;

    // Determine what to show: the initial chat, a selected chat, or the list.
    const showInitialChat = initialConversationId && !hasNavigatedBackFromInitial;
    const activeConversationId = showInitialChat ? initialConversationId : selectedConversationId;

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);
    };

    const handleBack = () => {
        if (showInitialChat) {
            setHasNavigatedBackFromInitial(true);
        }
        setSelectedConversationId(null);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-4xl h-[90vh] max-h-[700px] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                {activeConversationId ? (
                    <ChatWindow 
                        conversationId={activeConversationId} 
                        onBack={handleBack}
                    />
                ) : (
                    <>
                        <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                            <div className="w-8"></div> {/* Spacer */}
                            <h2 className="text-lg font-semibold text-center">Messages</h2>
                            <button onClick={onClose} className="text-2xl font-light leading-none w-8 text-right" aria-label="Close messages">&times;</button>
                        </header>
                        <main className="flex-grow overflow-hidden">
                            <ConversationList onSelectConversation={handleSelectConversation} />
                        </main>
                    </>
                )}
            </div>
        </div>
    );
};

export default MessagesModal;
