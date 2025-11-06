import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Import translations dynamically
const translations: { [key: string]: any } = {
  en: () => import('../locales/en.json'),
  pt: () => import('../locales/pt.json'),
};

type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const loadTranslations = useCallback(async (lang: Language) => {
    try {
      setLoading(true);
      const module = await translations[lang]();
      setMessages(module.default);
      setLanguageState(lang);
    } catch (error) {
      console.error(`Could not load translations for ${lang}`, error);
      // Fallback to English
      if (lang !== 'en') {
        const module = await translations['en']();
        setMessages(module.default);
        setLanguageState('en');
      }
    } finally {
        setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const fetchUserLanguage = async () => {
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().language) {
                await loadTranslations(userDoc.data().language);
            } else {
                await loadTranslations('en'); // Default language
            }
        } else {
            await loadTranslations('en'); // Default for non-logged-in users
        }
    };
    fetchUserLanguage();
  }, [currentUser, loadTranslations]);

  const setLanguage = async (lang: Language) => {
    await loadTranslations(lang);
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { language: lang });
      } catch (error) {
        console.error("Failed to update user language preference:", error);
      }
    }
  };

  const t = (key: string, replacements?: { [key: string]: string | number }): string => {
    let message = messages[key] || key;
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        message = message.replace(`{${placeholder}}`, String(replacements[placeholder]));
      });
    }
    return message;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {loading ? (
        <div className="bg-zinc-50 dark:bg-black min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      ) : children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
