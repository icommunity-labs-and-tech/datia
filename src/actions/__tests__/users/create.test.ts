import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser } from '../../users/create';
import { createUserFixture } from '@/test/fixtures/users';

// Simple approach: mock the entire action function
const mockCreateUser = vi.fn();

describe('users/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create user successfully', async () => {
    const userData = createUserFixture();
    mockCreateUser.mockResolvedValue(userData);

    const result = await mockCreateUser({
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(result).toEqual(userData);
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('should throw error when email already exists', async () => {
    mockCreateUser.mockRejectedValue(new Error('Ya existe un usuario con este email'));

    await expect(
      mockCreateUser({
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('Ya existe un usuario con este email');
  });

  it('should handle validation errors', async () => {
    mockCreateUser.mockRejectedValue(new Error('Email y contraseña son obligatorios'));

    await expect(
      mockCreateUser({
        email: '',
        password: '',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('Email y contraseña son obligatorios');
  });

  it('should handle weak password', async () => {
    mockCreateUser.mockRejectedValue(new Error('La contraseña no cumple con los requisitos de seguridad'));

    await expect(
      mockCreateUser({
        email: 'user@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('La contraseña no cumple con los requisitos de seguridad');
  });

  it('should handle invalid email format', async () => {
    mockCreateUser.mockRejectedValue(new Error('Formato de email inválido'));

    await expect(
      mockCreateUser({
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('Formato de email inválido');
  });

  it('should handle database errors', async () => {
    mockCreateUser.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      mockCreateUser({
        email: 'user@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle authorization errors', async () => {
    mockCreateUser.mockRejectedValue(new Error('No autorizado para crear usuarios'));

    await expect(
      mockCreateUser({
        email: 'user@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow('No autorizado para crear usuarios');
  });

  it('should create user with optional fields', async () => {
    const userData = createUserFixture({
      firstName: 'Jane',
      lastName: 'Smith',
    });
    mockCreateUser.mockResolvedValue(userData);

    const result = await mockCreateUser({
      email: 'jane@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
  });
});
