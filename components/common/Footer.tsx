import React from 'react';

const Footer: React.FC = () => {
    
    const footerLinks = [
        { key: 'meta', name: 'Meta' },
        { key: 'about', name: 'Sobre' },
        { key: 'blog', name: 'Blog' },
        { key: 'jobs', name: 'Carreiras' },
        { key: 'help', name: 'Ajuda' },
        { key: 'api', name: 'API' },
        { key: 'privacy', name: 'Privacidade' },
        { key: 'terms', name: 'Termos' },
        { key: 'locations', name: 'Localizações' },
        { key: 'lite', name: 'Instagram Lite' },
        { key: 'threads', name: 'Threads' },
        { key: 'contact', name: 'Carregamento de contatos e não usuários' },
        { key: 'verified', name: 'Meta Verified' },
    ];

  return (
    <footer className="text-zinc-500 dark:text-zinc-400 text-xs px-4 pb-4">
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-4">
        {footerLinks.map(link => (
          <a key={link.key} href="#" className="hover:underline">
            {link.name}
          </a>
        ))}
      </div>
      <div className="flex justify-center items-center gap-4">
        <span>Português</span>
        <span>{`© ${new Date().getFullYear()} MP SOCIAL da Meta`}</span>
      </div>
    </footer>
  );
};

export default Footer;