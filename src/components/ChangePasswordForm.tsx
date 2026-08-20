'use client';

import { useState } from 'react';
import { Button, Alert, PasswordInput, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { changePassword } from '@/actions/users';

export default function ChangePasswordForm() {
  const tCommon = useTranslations('common');
  const t = useTranslations('profile.password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('currentPassword', formData.currentPassword);
      formDataObj.append('newPassword', formData.newPassword);
      formDataObj.append('confirmPassword', formData.confirmPassword);

      const result = await changePassword(formDataObj);

      if (result.success) {
        setMessage({ type: 'success', text: result.message || t('success') });
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: result.error || t('error') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('unexpectedError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = formData.currentPassword && 
                     formData.newPassword && 
                     formData.confirmPassword && 
                     formData.newPassword === formData.confirmPassword &&
                     formData.newPassword.length >= 6;

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {message && (
          <Alert color={message.type === 'success' ? 'green' : 'red'}>
            {message.text}
          </Alert>
        )}

        <PasswordInput
          label={t('current')}
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleInputChange}
          placeholder={t('currentPlaceholder')}
          required
        />

        <PasswordInput
          label={t('new')}
          name="newPassword"
          value={formData.newPassword}
          onChange={handleInputChange}
          placeholder={t('newPlaceholder')}
          required
          minLength={6}
          description={tCommon('passwordMinLength')}
        />

        <PasswordInput
          label={t('confirm')}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder={t('confirmPlaceholder')}
          required
          error={
            formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword
              ? t('mismatch')
              : undefined
          }
        />

        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          style={{ alignSelf: 'flex-start' }}
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </Stack>
    </form>
  );
}
