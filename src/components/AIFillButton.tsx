'use client';

import { useState } from 'react';
import { Button, Alert, Loader } from '@mantine/core';
import { useTranslations } from 'next-intl';

interface AIFillButtonProps {
  itemName: string;
  itemDescription: string;
  fields: Array<{ name: string; label: string; type: string }>;
  onDataFilled: (data: Record<string, any>) => void;
  className?: string;
}

export default function AIFillButton({
  itemName,
  itemDescription,
  fields,
  onDataFilled,
  className = ''
}: AIFillButtonProps) {
  const t = useTranslations('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAIFill = async () => {
    if (!itemName.trim()) {
      setError(t('nameRequiredError'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/ai/fill-item-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemName: itemName.trim(),
          itemDescription: itemDescription?.trim() || '',
          fields: fields
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('processingError'));
      }

      if (result.success && result.data) {
        // Filtrar campos vacíos y aplicar los datos
        const validData = Object.entries(result.data).reduce((acc, [key, value]) => {
          if (value && value.toString().trim() !== '') {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);

        if (Object.keys(validData).length > 0) {
          onDataFilled(validData);
          setSuccess(result.message || t('fieldsCompleted', { count: Object.keys(validData).length }));
        } else {
          setError(t('noDataFound'));
        }
      } else {
        throw new Error(t('noValidData'));
      }
    } catch (err) {
      console.error('AI Fill Error:', err);
      setError(err instanceof Error ? err.message : t('connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  const canUseAI = itemName.trim() && fields.length > 0;

  return (
    <div className={`ai-fill-container ${className}`}>
      <Button
        variant="default"
        onClick={handleAIFill}
        disabled={isLoading || !canUseAI}
        leftSection={isLoading ? undefined : <i className="bi bi-robot" />}
      >
        {isLoading ? (
          <>
            <Loader size="xs" mr={8} />
            {t('consultingAI')}
          </>
        ) : (
          t('fillWithAI')
        )}
      </Button>

      {!canUseAI && (
        <small className="text-muted d-block mt-1">
          {!itemName.trim() ? t('nameRequired') : t('noFields')}
        </small>
      )}

      {error && (
        <Alert color="red" mt="xs" py={6}>
          <small>{error}</small>
        </Alert>
      )}

      {success && (
        <Alert color="green" mt="xs" py={6}>
          <small>{success}</small>
        </Alert>
      )}
    </div>
  );
}
