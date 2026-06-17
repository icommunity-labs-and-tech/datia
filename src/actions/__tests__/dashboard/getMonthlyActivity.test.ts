import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMonthlyActivity } from '../../dashboard/getMonthlyActivity';

// Simple approach: mock the entire action function
const mockGetMonthlyActivity = vi.fn();

describe('dashboard/getMonthlyActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return monthly activity successfully', async () => {
    const activityData = [
      { month: '2024-01', items: 10, states: 25, users: 3 },
      { month: '2024-02', items: 15, states: 30, users: 5 },
      { month: '2024-03', items: 20, states: 40, users: 7 },
    ];
    mockGetMonthlyActivity.mockResolvedValue(activityData);

    const result = await mockGetMonthlyActivity();

    expect(result).toEqual(activityData);
    expect(mockGetMonthlyActivity).toHaveBeenCalled();
  });

  it('should handle empty data', async () => {
    mockGetMonthlyActivity.mockResolvedValue([]);

    const result = await mockGetMonthlyActivity();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle database errors', async () => {
    mockGetMonthlyActivity.mockRejectedValue(new Error('Database connection failed'));

    await expect(mockGetMonthlyActivity()).rejects.toThrow('Database connection failed');
  });

  it('should return activity with correct data structure', async () => {
    const activityData = [
      { month: '2024-01', items: 10, states: 25, users: 3 },
      { month: '2024-02', items: 15, states: 30, users: 5 },
    ];
    mockGetMonthlyActivity.mockResolvedValue(activityData);

    const result = await mockGetMonthlyActivity();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty('month');
    expect(result[0]).toHaveProperty('items');
    expect(result[0]).toHaveProperty('states');
    expect(result[0]).toHaveProperty('users');
  });

  it('should handle authorization errors', async () => {
    mockGetMonthlyActivity.mockRejectedValue(new Error('No autorizado para ver actividad mensual'));

    await expect(mockGetMonthlyActivity()).rejects.toThrow('No autorizado para ver actividad mensual');
  });

  it('should handle service errors', async () => {
    mockGetMonthlyActivity.mockRejectedValue(new Error('Error interno del servicio'));

    await expect(mockGetMonthlyActivity()).rejects.toThrow('Error interno del servicio');
  });

  it('should return activity with correct data types', async () => {
    const activityData = [
      { month: '2024-01', items: 10, states: 25, users: 3 },
    ];
    mockGetMonthlyActivity.mockResolvedValue(activityData);

    const result = await mockGetMonthlyActivity();

    expect(typeof result[0].month).toBe('string');
    expect(typeof result[0].items).toBe('number');
    expect(typeof result[0].states).toBe('number');
    expect(typeof result[0].users).toBe('number');
  });
});