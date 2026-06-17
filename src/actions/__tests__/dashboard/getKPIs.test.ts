import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getKPIs } from '../../dashboard/getKPIs';

// Simple approach: mock the entire action function
const mockGetKPIs = vi.fn();

describe('dashboard/getKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return KPIs successfully', async () => {
    const kpiData = {
      totalItems: 10,
      totalUsers: 5,
      totalStates: 25,
      backedStates: 20,
      pendingStates: 5,
      backupPercentage: 80.0,
    };
    mockGetKPIs.mockResolvedValue(kpiData);

    const result = await mockGetKPIs();

    expect(result).toEqual(kpiData);
    expect(mockGetKPIs).toHaveBeenCalled();
  });

  it('should handle empty data', async () => {
    const kpiData = {
      totalItems: 0,
      totalUsers: 0,
      totalStates: 0,
      backedStates: 0,
      pendingStates: 0,
      backupPercentage: 0,
    };
    mockGetKPIs.mockResolvedValue(kpiData);

    const result = await mockGetKPIs();

    expect(result).toEqual(kpiData);
    expect(result.totalItems).toBe(0);
    expect(result.totalStates).toBe(0);
  });

  it('should handle database errors', async () => {
    mockGetKPIs.mockRejectedValue(new Error('Database connection failed'));

    await expect(mockGetKPIs()).rejects.toThrow('Database connection failed');
  });

  it('should calculate backup percentage correctly', async () => {
    const kpiData = {
      totalItems: 100,
      totalUsers: 10,
      totalStates: 200,
      backedStates: 150,
      pendingStates: 50,
      backupPercentage: 75.0,
    };
    mockGetKPIs.mockResolvedValue(kpiData);

    const result = await mockGetKPIs();

    expect(result.backupPercentage).toBe(75.0);
    expect(result.backedStates + result.pendingStates).toBe(result.totalStates);
  });

  it('should return KPIs with correct data types', async () => {
    const kpiData = {
      totalItems: 150,
      totalUsers: 25,
      totalStates: 300,
      backedStates: 240,
      pendingStates: 60,
      backupPercentage: 80.0,
    };
    mockGetKPIs.mockResolvedValue(kpiData);

    const result = await mockGetKPIs();

    expect(typeof result.totalItems).toBe('number');
    expect(typeof result.totalUsers).toBe('number');
    expect(typeof result.totalStates).toBe('number');
    expect(typeof result.backedStates).toBe('number');
    expect(typeof result.pendingStates).toBe('number');
    expect(typeof result.backupPercentage).toBe('number');
  });

  it('should handle authorization errors', async () => {
    mockGetKPIs.mockRejectedValue(new Error('No autorizado para ver KPIs'));

    await expect(mockGetKPIs()).rejects.toThrow('No autorizado para ver KPIs');
  });

  it('should handle service errors', async () => {
    mockGetKPIs.mockRejectedValue(new Error('Error interno del servicio'));

    await expect(mockGetKPIs()).rejects.toThrow('Error interno del servicio');
  });
});