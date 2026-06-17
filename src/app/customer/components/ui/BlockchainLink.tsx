'use client';

import { useTranslations } from 'next-intl';

interface BlockchainLinkProps {
  href: string;
  label?: string;
}

export function BlockchainLink({ href, label }: BlockchainLinkProps) {
  const t = useTranslations('customer');
  const displayLabel = label ?? t('blockchainCertification');
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        background: 'linear-gradient(135deg, rgba(233, 213, 255, 0.4), rgba(216, 180, 254, 0.4))',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(233, 213, 255, 0.6), rgba(216, 180, 254, 0.6))';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(233, 213, 255, 0.4), rgba(216, 180, 254, 0.4))';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        style={{ color: '#7c3aed', flexShrink: 0 }}
        fill="currentColor"
      >
        <title>Blockchain</title>
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: '#7c3aed',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}
      >
        {displayLabel}
      </span>
    </a>
  );
}
