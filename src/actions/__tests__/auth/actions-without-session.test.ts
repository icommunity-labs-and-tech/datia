import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireOrganizationId, requireScope, TenantContextNotFoundError } from '@/lib/auth/tenant';

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireOrganizationId: vi.fn(), requireScope: vi.fn() };
});

const saveImage = vi.fn(async () => ({ url: 'https://storage.example/x.png', bytes: 3, contentType: 'image/png' }));
vi.mock('@/lib/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage')>('@/lib/storage');
  return { ...actual, getStorage: () => ({ saveImage }) };
});

const getByEmail = vi.fn();
vi.mock('@/infrastructure/prisma/repositories/UserRepositoryPrisma', () => ({
  userRepository: { getByEmail: (...args: unknown[]) => getByEmail(...args) },
}));

const findUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { company: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

import { uploadImage } from '@/actions/upload/uploadImage';
import { checkEmailExists } from '@/actions/users/check-email';
import { checkKycStatus } from '@/actions/kyc/status';

const tenant = requireOrganizationId as unknown as ReturnType<typeof vi.fn>;
const scope = requireScope as unknown as ReturnType<typeof vi.fn>;

function imageForm() {
  const form = new FormData();
  form.set('image', new File(['png'], 'x.png', { type: 'image/png' }));
  form.set('type', 'item');
  return form;
}

describe('acciones del dashboard sin sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    tenant.mockRejectedValue(new TenantContextNotFoundError('sin sesión'));
    scope.mockRejectedValue(new TenantContextNotFoundError('sin sesión'));
  });

  it('uploadImage no sube nada', async () => {
    await expect(uploadImage(imageForm())).rejects.toThrow();
    expect(saveImage).not.toHaveBeenCalled();
  });

  it('checkEmailExists no consulta usuarios', async () => {
    await expect(checkEmailExists('alguien@example.com')).rejects.toThrow();
    expect(getByEmail).not.toHaveBeenCalled();
  });

  it('checkKycStatus no revela el estado ni la URL de KYC', async () => {
    const result = await checkKycStatus();
    expect(result).toMatchObject({ success: false });
    expect(result.kycURL).toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('acciones del dashboard con sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenant.mockResolvedValue('org-a');
    scope.mockResolvedValue({ organizationId: 'org-a', companyId: 'co-a' });
  });

  it('uploadImage sube la imagen', async () => {
    await expect(uploadImage(imageForm())).resolves.toEqual({ imageUrl: 'https://storage.example/x.png' });
  });

  it('uploadImage rechaza un tipo desconocido', async () => {
    const form = imageForm();
    form.set('type', '../../etc');
    await expect(uploadImage(form)).rejects.toThrow('Tipo de upload inválido');
    expect(saveImage).not.toHaveBeenCalled();
  });

  it('checkKycStatus consulta la empresa de la sesión', async () => {
    findUnique.mockResolvedValue({ verificationStatus: 'WAITING', kycURL: 'https://kyc.example/abc' });
    await expect(checkKycStatus()).resolves.toEqual({ success: true, verificationStatus: 'WAITING', kycURL: 'https://kyc.example/abc' });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'co-a' } }));
  });
});
