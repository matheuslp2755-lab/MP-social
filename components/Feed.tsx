import React, { useState, useEffect } from 'react';
import Header from './common/Header';
import UserProfile from './profile/UserProfile';
import CreatePostModal from './post/CreatePostModal';
import Post from './feed/Post';
import MessagesModal from './messages/MessagesModal';
import Button from './common/Button';
import { auth, db, collection, query, where, getDocs, orderBy as firebaseOrderBy, limit } from '../firebase';

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
);

type PostType = {
    id: string;
    userId: string;
    username: string;
    userAvatar: string;
    imageUrl: string;
    caption: string;
    likes: string[]; // array of userIds
    timestamp: { seconds: number; nanoseconds: number };
};


const EmptyFeed: React.FC = () => {
    return (
      <div className="container mx-auto max-w-lg py-8">
        <div className="flex flex-col items-center justify-center text-center p-16 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-zinc-300 dark:text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao MP SOCIAL</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Parece que seu feed está vazio.
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Use a barra de pesquisa para encontrar e seguir seus amigos para ver suas fotos e vídeos.
          </p>
        </div>
      </div>
    );
};

interface FindFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FindFriendsModal: React.FC<FindFriendsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-sm m-4 text-center p-8 flex flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125M15 15v5.5M5 14l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" />
        </svg>

        <h2 className="text-2xl font-bold">Bem-vindo(a) ao MP SOCIAL!</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Seu feed está vazio no momento. Comece a encontrar amigos para seguir e ver as publicações deles.
        </p>
        <Button onClick={onClose} className="mt-4">
          Encontrar Amigos
        </Button>
      </div>
    </div>
  );
};


const Feed: React.FC = () => {
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [profileKey, setProfileKey] = useState(0);
  const [feedPosts, setFeedPosts] = useState<PostType[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedKey, setFeedKey] = useState(0);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [initialMessageTarget, setInitialMessageTarget] = useState<{ id: string, username: string, avatar: string } | null>(null);
  const [showFindFriendsModal, setShowFindFriendsModal] = useState(false);

  useEffect(() => {
    if (viewingProfileId || !auth.currentUser) return;

    const fetchFeedPosts = async () => {
        setFeedLoading(true);
        try {
            const followingRef = collection(db, 'users', auth.currentUser!.uid, 'following');
            const followingSnap = await getDocs(followingRef);
            const followingIds = followingSnap.docs.map(doc => doc.id);
            const userIdsToQuery = [auth.currentUser!.uid, ...followingIds];
            
            if (userIdsToQuery.length > 0) {
                // Firestore 'in' query is limited to 30 elements in its array.
                const postsQuery = query(
                    collection(db, 'posts'),
                    where('userId', 'in', userIdsToQuery),
                    firebaseOrderBy('timestamp', 'desc'),
                    limit(20)
                );
                const postsSnap = await getDocs(postsQuery);
                const posts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostType));
                setFeedPosts(posts);
                 if (posts.length === 0) {
                    const hasSeenPrompt = sessionStorage.getItem('hasSeenFindFriendsPrompt');
                    if (!hasSeenPrompt) {
                        setShowFindFriendsModal(true);
                        sessionStorage.setItem('hasSeenFindFriendsPrompt', 'true');
                    }
                }
            } else {
                setFeedPosts([]);
                 const hasSeenPrompt = sessionStorage.getItem('hasSeenFindFriendsPrompt');
                if (!hasSeenPrompt) {
                    setShowFindFriendsModal(true);
                    sessionStorage.setItem('hasSeenFindFriendsPrompt', 'true');
                }
            }

        } catch (error) {
            console.error("Error fetching feed posts:", error);
        } finally {
            setFeedLoading(false);
        }
    };
    fetchFeedPosts();
  }, [viewingProfileId, feedKey, auth.currentUser]);

  const handleSelectUser = (userId: string) => {
    setViewingProfileId(userId);
  };

  const handleGoHome = () => {
    setViewingProfileId(null);
  };

  const handlePostCreated = () => {
    setIsCreatePostModalOpen(false);
    if (viewingProfileId === auth.currentUser?.uid) {
        setProfileKey(prev => prev + 1);
    } else if (!viewingProfileId) {
        setFeedKey(prev => prev + 1);
    }
  };
  
  const handleStartMessage = (targetUser: { id: string, username: string, avatar: string }) => {
    setInitialMessageTarget(targetUser);
    setIsMessagesModalOpen(true);
  };

  const handleOpenMessages = () => {
    setInitialMessageTarget(null); // Ensure no specific user is targeted when opening from header
    setIsMessagesModalOpen(true);
  }


  return (
    <>
      <Header 
        onSelectUser={handleSelectUser} 
        onGoHome={handleGoHome}
        onOpenCreatePostModal={() => setIsCreatePostModalOpen(true)}
        onOpenMessages={handleOpenMessages}
      />
      <main className="pt-20 bg-zinc-50 dark:bg-black min-h-screen">
        {viewingProfileId ? (
          <UserProfile userId={viewingProfileId} key={`${viewingProfileId}-${profileKey}`} onStartMessage={handleStartMessage} />
        ) : (
          <div className="container mx-auto max-w-lg py-8">
            {feedLoading ? (
              <div className="flex justify-center"><Spinner/></div>
            ) : feedPosts.length > 0 ? (
              <div className="flex flex-col gap-8">
                {feedPosts.map(post => <Post key={post.id} post={post} />)}
              </div>
            ) : (
              <EmptyFeed />
            )}
          </div>
        )}
      </main>
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
      <MessagesModal
        isOpen={isMessagesModalOpen}
        onClose={() => {
            setIsMessagesModalOpen(false);
            setInitialMessageTarget(null);
        }}
        initialTargetUser={initialMessageTarget}
      />
      <FindFriendsModal
        isOpen={showFindFriendsModal}
        onClose={() => setShowFindFriendsModal(false)}
      />
    </>
  );
};

export default Feed;