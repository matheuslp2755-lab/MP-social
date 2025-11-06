import React, { useState, useEffect, useRef } from 'react';
import Button from '../common/Button';
import TextInput from '../common/TextInput';
import TextAreaInput from '../common/TextAreaInput';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    avatar: string;
    bio?: string;
  };
  onUpdate: (updatedData: { username: string; bio: string; avatarFile?: File }) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(user.username);
      setBio(user.bio || '');
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate({ username, bio, avatarFile: avatarFile || undefined });
    setLoading(false);
    onClose();
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-md border border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="text-2xl font-light">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
            <div className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-6 w-full">
                    <img src={avatarPreview || user.avatar} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                    <div className="flex flex-col">
                        <span className="font-semibold">{user.username}</span>
                        <button 
                            type="button" 
                            onClick={triggerFileInput}
                            className="text-sm font-semibold text-sky-500 hover:text-sky-600 bg-transparent border-none p-0 cursor-pointer text-left"
                        >
                            Change profile photo
                        </button>
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            className="hidden"
                            accept="image/png, image/jpeg"
                        />
                    </div>
                </div>
                <div className="w-full flex flex-col gap-4 mt-4">
                    <TextInput
                        id="username"
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextAreaInput
                        id="bio"
                        label="Bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                    />
                </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading ? "Submitting..." : "Submit"}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
