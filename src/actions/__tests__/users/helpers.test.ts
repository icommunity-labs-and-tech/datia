import { describe, it, expect } from 'vitest';
import { generateTemporaryPassword } from '@/actions/users/helpers';

describe('generateTemporaryPassword', () => {
  it('genera 12 caracteres sin los que se confunden al leerlos', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTemporaryPassword()).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{12}$/);
    }
  });

  it('no repite contraseñas', () => {
    const passwords = new Set(Array.from({ length: 200 }, generateTemporaryPassword));
    expect(passwords.size).toBe(200);
  });
});
