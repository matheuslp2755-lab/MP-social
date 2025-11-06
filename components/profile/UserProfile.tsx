import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import {
    auth,
    db,
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    doc,
    getDoc,
    collection,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp,
    updateDoc,
    query,
    where,
    orderBy,
    addDoc,
} from '../../firebase';
import Button from '../common/Button';
import EditProfileModal from './EditProfileModal';

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
);

const GridIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg aria-label="Publicações" className={className} fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" width="18" x="3" y="3"></rect><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="9.015" x2="9.015" y1="3" y2="21"></line><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="14.985" x2="14.985" y1="3" y2="21"></line><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="21" x2="3" y1="9.015" y2="9.015"></line><line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="21" x2="3" y1="14.985" y2="14.985"></line></svg>
);


interface UserProfileProps {
    userId: string;
    onStartMessage: (targetUser: { id: string, username: string, avatar: string }) => void;
}

type ProfileUserData = {
    username: string;
    avatar: string;
    bio?: string;
};

type Post = {
    id: string;
    imageUrl: string;
    caption: string;
};

const UserProfile: React.FC<UserProfileProps> = ({ userId, onStartMessage }) => {
    const [user, setUser] = useState<ProfileUserData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const currentUser = auth.currentUser;

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const userDocRef = doc(db, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setUser(userDocSnap.data() as ProfileUserData);
                } else {
                    console.error("No such user!");
                }

                const followersQuery = collection(db, 'users', userId, 'followers');
                const followingQuery = collection(db, 'users', userId, 'following');
                const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId), orderBy('timestamp', 'desc'));

                const [followersSnap, followingSnap, postsSnap] = await Promise.all([
                    getDocs(followersQuery),
                    getDocs(followingQuery),
                    getDocs(postsQuery)
                ]);

                const userPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                setPosts(userPosts);

                setStats({ posts: userPosts.length, followers: followersSnap.size, following: followingSnap.size });

                if (currentUser) {
                    const followingDoc = await getDoc(doc(db, 'users', currentUser.uid, 'following', userId));
                    setIsFollowing(followingDoc.exists());
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId, currentUser]);

    const handleFollow = async () => {
        if (!currentUser || !user) return;
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));

        const currentUserFollowingRef = doc(db, 'users', currentUser.uid, 'following', userId);
        const targetUserFollowersRef = doc(db, 'users', userId, 'followers', currentUser.uid);
        const notificationRef = collection(db, 'users', userId, 'notifications');


        try {
            await setDoc(currentUserFollowingRef, {
                username: user.username,
                avatar: user.avatar,
                timestamp: serverTimestamp()
            });
            await setDoc(targetUserFollowersRef, {
                username: currentUser.displayName,
                avatar: currentUser.photoURL,
                timestamp: serverTimestamp()
            });
            await addDoc(notificationRef, {
                type: 'follow',
                fromUserId: currentUser.uid,
                fromUsername: currentUser.displayName,
                fromUserAvatar: currentUser.photoURL,
                timestamp: serverTimestamp(),
                read: false,
            });
        } catch (error) {
            console.error("Error following user:", error);
            setIsFollowing(false);
            setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
        }
    };
    
    const handleUnfollow = async () => {
        if (!currentUser) return;
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));

        const currentUserFollowingRef = doc(db, 'users', currentUser.uid, 'following', userId);
        const targetUserFollowersRef = doc(db, 'users', userId, 'followers', currentUser.uid);
        
        try {
            await deleteDoc(currentUserFollowingRef);
            await deleteDoc(targetUserFollowersRef);
        } catch(error) {
            console.error("Error unfollowing user:", error);
            setIsFollowing(true);
            setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
    };
    
    const handleProfileUpdate = async ({ username, bio, avatarFile }: { username: string; bio: string; avatarFile?: File }) => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            let newAvatarUrl = user?.avatar;

            if (avatarFile) {
                const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
                await uploadBytes(avatarRef, avatarFile);
                newAvatarUrl = await getDownloadURL(avatarRef);
            }

            const firestoreUpdates: { [key: string]: any } = {};
            const authUpdates: { displayName?: string; photoURL?: string } = {};
            
            if (username !== user?.username) {
                firestoreUpdates.username = username;
                firestoreUpdates.username_lowercase = username.toLowerCase();
                authUpdates.displayName = username;
            }
            if (bio !== (user?.bio || '')) {
                firestoreUpdates.bio = bio;
            }
            if (newAvatarUrl !== user?.avatar) {
                firestoreUpdates.avatar = newAvatarUrl;
                authUpdates.photoURL = newAvatarUrl;
            }

            if (Object.keys(firestoreUpdates).length > 0) {
                await updateDoc(userDocRef, firestoreUpdates);
            }

            if (Object.keys(authUpdates).length > 0) {
                await updateProfile(currentUser, authUpdates);
            }

            setUser(prev => prev ? { ...prev, ...firestoreUpdates } : null);
            setIsEditModalOpen(false);
            window.dispatchEvent(new CustomEvent('profileUpdated'));
        } catch (error) {
            console.error("Error updating profile: ", error);
        } finally {
            setLoading(false);
        }
    };


    if (loading && !isEditModalOpen) {
        return <div className="flex justify-center items-center p-8"><Spinner /></div>;
    }
    
    if (!user) {
        return <p className="text-center p-8 text-zinc-500 dark:text-zinc-400">Usuário não encontrado.</p>;
    }

    return (
        <>
        <div className="container mx-auto max-w-4xl p-4 sm:p-8">
            <header className="flex flex-col sm:flex-row items-center gap-4 sm:gap-16 mb-8">
                <div className="w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0">
                    <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover border-2 dark:border-zinc-800 p-1" />
                </div>
                <div className="flex flex-col gap-4 items-center sm:items-start w-full">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-light">{user.username}</h2>
                        { currentUser?.uid === userId ? (
                             <Button onClick={() => setIsEditModalOpen(true)} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">Editar Perfil</Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                {isFollowing ? (
                                    <Button onClick={handleUnfollow} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">Seguindo</Button>
                                ) : (
                                    <Button onClick={handleFollow} className="!w-auto">Seguir</Button>
                                )}
                                <Button onClick={() => onStartMessage({ id: userId, username: user.username, avatar: user.avatar })} className="!w-auto !bg-zinc-200 dark:!bg-zinc-700 !text-black dark:!text-white hover:!bg-zinc-300 dark:hover:!bg-zinc-600">Mensagem</Button>
                            </div>
                        )}
                       
                    </div>
                    <div className="flex items-center gap-8 text-sm">
                        <span><span className="font-semibold">{stats.posts}</span> publicações</span>
                        <span><span className="font-semibold">{stats.followers}</span> seguidores</span>
                        <span><span className="font-semibold">{stats.following}</span> seguindo</span>
                    </div>
                     {user.bio && (
                        <div className="text-sm pt-2 text-center sm:text-left">
                            <p className="whitespace-pre-wrap">{user.bio}</p>
                        </div>
                    )}
                </div>
            </header>
            <div className="border-t border-zinc-300 dark:border-zinc-700 pt-2">
                <div className="flex justify-center gap-8 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <button className="flex items-center gap-2 text-sky-500 border-t-2 border-sky-500 pt-2 -mt-0.5">
                        <GridIcon className="w-4 h-4"/> PUBLICAÇÕES
                    </button>
                </div>
                {posts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-4">
                        {posts.map(post => (
                            <div key={post.id} className="aspect-square bg-zinc-200 dark:bg-zinc-800 relative group">
                                <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex justify-center items-center">
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="flex flex-col justify-center items-center p-16">
                        <h3 className="text-2xl font-bold">Nenhuma Publicação Ainda</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">Quando este usuário compartilhar fotos, você as verá aqui.</p>
                    </div>
                )}
            </div>
        </div>
        {user && (
            <EditProfileModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)}
                user={user}
                onUpdate={handleProfileUpdate}
            />
        )}
        </>
    );
};

export default UserProfile;