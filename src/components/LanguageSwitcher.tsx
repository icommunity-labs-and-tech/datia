'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dropdown } from 'react-bootstrap';

const languages = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    // Establecer cookie con la nueva preferencia
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    // Recargar la página para aplicar el nuevo idioma
    startTransition(() => {
      router.refresh();
      // Pequeño delay para asegurar que la cookie se establezca
      setTimeout(() => {
        window.location.reload();
      }, 100);
    });
  };

  return (
    <Dropdown show={isOpen} onToggle={setIsOpen}>
      <Dropdown.Toggle
        variant="outline-secondary"
        size="sm"
        className="d-flex align-items-center gap-2 border-0"
        disabled={isPending}
        style={{ minWidth: '120px' }}
      >
        <span>{currentLanguage.flag}</span>
        <span className="d-none d-md-inline">{currentLanguage.label}</span>
        <span className="d-md-none">{currentLanguage.code.toUpperCase()}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu align="end" popperConfig={{ strategy: 'fixed' }}>
        {languages.map((language) => (
          <Dropdown.Item
            key={language.code}
            active={language.code === locale}
            onClick={() => handleLanguageChange(language.code)}
            disabled={isPending}
          >
            <span className="me-2">{language.flag}</span>
            {language.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
