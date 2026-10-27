import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/tenant', () => ({
  requireScope: vi.fn(async () => ({ organizationId: 'org', companyId: 'co' })),
}));

import { municipalityAt, searchMunicipality } from '@/actions/assets/locate';

describe('searchMunicipality', () => {
  it('finds a municipality by its name alone', async () => {
    expect(await searchMunicipality('málaga')).toMatchObject({ status: 'found', name: 'Málaga' });
  });

  it('reads what follows the last comma as the province when the name is shared', async () => {
    expect(await searchMunicipality('Castejón, Navarra')).toMatchObject({ status: 'found', province: 'Navarra' });
    expect(await searchMunicipality('Castejón')).toMatchObject({ status: 'ambiguous' });
  });

  it('still reads a comma as a postposed article', async () => {
    expect(await searchMunicipality('Campillo de la Jara, El')).toMatchObject({ status: 'found', name: 'El Campillo de la Jara' });
  });

  it('says so for a name it does not know, with or without province', async () => {
    expect(await searchMunicipality('Narnia')).toEqual({ status: 'unknown' });
    expect(await searchMunicipality('Narnia, Cuenca')).toEqual({ status: 'unknown' });
    expect(await searchMunicipality('   ')).toEqual({ status: 'unknown' });
  });
});

describe('municipalityAt', () => {
  it('names the municipality of a point, and nothing for an impossible one', async () => {
    expect(await municipalityAt(36.7213, -4.4214)).toEqual({ name: 'Málaga', province: 'Málaga' });
    expect(await municipalityAt(95, 0)).toBeNull();
  });
});
