import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { createApplicationsCsv, downloadApplicationsCsv } from './applicationCsv';

const application: ApplicationResponse = {
  id: 1,
  userId: 1,
  scholarshipName: 'Future Leaders Scholarship',
  organization: 'Example Foundation',
  targetType: 'Merit',
  status: 'In Progress',
  dueDate: '2026-11-15',
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-02T12:00:00Z',
};

describe('createApplicationsCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exports application fields with a header row', () => {
    const csv = createApplicationsCsv([{
      ...application,
      minAward: 2500,
      maxAward: 5000,
      renewable: true,
      recommendationCount: 2,
    }]);

    const [headers, row] = csv.split('\r\n');

    expect(headers).toContain('Scholarship Name,Organization,Status,Target Type,Due Date');
    expect(row).toContain('Future Leaders Scholarship,Example Foundation,In Progress,Merit,2026-11-15');
    expect(row).toContain('2500,5000,Yes');
  });

  it('escapes commas, quotes, and line breaks', () => {
    const csv = createApplicationsCsv([{
      ...application,
      scholarshipName: 'Leaders, "Tomorrow"',
      requirements: 'Essay\nand transcript',
    }]);

    expect(csv).toContain('"Leaders, ""Tomorrow"""');
    expect(csv).toContain('"Essay\nand transcript"');
  });

  it('prevents exported cells from being interpreted as spreadsheet formulas', () => {
    const csv = createApplicationsCsv([{
      ...application,
      scholarshipName: '=HYPERLINK("https://example.com")',
      organization: ' +SUM(1,2)',
    }]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"\' +SUM(1,2)"');
  });

  it('downloads a locally generated file with a dated filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7));
    const createObjectUrl = vi.fn(() => 'blob:scholarships');
    const revokeObjectUrl = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });

    downloadApplicationsCsv([application]);

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toMatchObject({
      download: 'scholarships-2026-09-07.csv',
      href: 'blob:scholarships',
    });
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:scholarships');
  });
});
