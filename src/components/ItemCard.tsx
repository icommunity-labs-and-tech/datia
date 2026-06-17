/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { formatValueWithSmartDateDetection } from '@/lib/format';
import { useTranslations } from 'next-intl';

interface Item {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  states?: any[];
}

interface ItemCardProps {
  item: Item;
  onClick: (item: Item) => void;
  className?: string;
}

export const ItemCard: React.FC<ItemCardProps> = React.memo(({ 
  item, 
  onClick, 
  className = '' 
}) => {
  const t = useTranslations('common');
  const handleClick = () => onClick(item);

  const truncatedDescription = item.description 
    ? (item.description.length > 50 
        ? `${item.description.substring(0, 50)}...` 
        : item.description)
    : t('noDescription');

  const statesCount = item.states?.length || 0;
  const ariaLabel = `${item.name}. ${truncatedDescription}. Creado ${formatValueWithSmartDateDetection(item.createdAt, 'createdAt')}${statesCount > 0 ? `. ${statesCount} estado${statesCount !== 1 ? 's' : ''}` : ''}`;

  return (
    <div 
      className={`item-card ${className}`} 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-roledescription="Tarjeta de producto"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="item-card-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} title={item.name} loading="lazy" />
        ) : (
          <div className="item-placeholder">
            <span>📦</span>
          </div>
        )}
      </div>
      <div className="item-card-content">
        <h6 className="item-name">{item.name}</h6>
        <p className="item-description">{truncatedDescription}</p>
        <div className="item-meta">
          <small className="text-muted">
            Creado: {formatValueWithSmartDateDetection(item.createdAt, 'createdAt')}
          </small>
          {statesCount > 0 && (
            <span className="states-badge">
              {statesCount} estado{statesCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ItemCard.displayName = 'ItemCard';
