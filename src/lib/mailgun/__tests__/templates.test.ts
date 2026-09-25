import { describe, it, expect } from 'vitest';
import {
  generatePasswordResetEmailHTML,
  generatePasswordResetEmailText,
  passwordResetSubject,
} from '../templates';

const data = {
  recipientName: 'Ana',
  appName: 'Datia',
  resetUrl: 'https://datia.test/auth/reset-password?token=abc',
  expiresInMinutes: 60,
};

describe('password reset email', () => {
  it('says the link is single use and how long it lasts, in both languages', () => {
    expect(generatePasswordResetEmailHTML({ ...data, language: 'es' })).toContain('un solo uso y caduca en 60 minutos');
    expect(generatePasswordResetEmailHTML({ ...data, language: 'en' })).toContain('used once and expires in 60 minutes');
    expect(passwordResetSubject('Datia', 'en')).toBe('Reset your Datia password');
    expect(passwordResetSubject('Datia')).toBe('Restablece tu contraseña de Datia');
  });

  it('carries the link in the button and in plain text', () => {
    expect(generatePasswordResetEmailHTML(data)).toContain(`href="${data.resetUrl}"`);
    expect(generatePasswordResetEmailText(data)).toContain(data.resetUrl);
  });

  it('does not let a name inject markup', () => {
    const html = generatePasswordResetEmailHTML({ ...data, recipientName: '<img src=x onerror=alert(1)>' });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('keeps the plain-text version free of markup', () => {
    expect(generatePasswordResetEmailText(data)).not.toMatch(/<[a-z]/i);
  });
});
