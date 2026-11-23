import { describe, it, expect } from 'vitest';
import { renderLanding } from '../src/views/landing';
import { renderRequestForm } from '../src/views/pages';

// Copy rules: "Latter-day Saint", never "LDS".
describe('copy', () => {
  it('landing meta says "Latter-day Saint ward leaders" and never LDS', () => {
    const html = renderLanding();
    expect(html).toContain('Latter-day Saint ward leaders');
    expect(html).not.toMatch(/\bLDS\b/);
  });

  it('request form placeholder is "Unit number"', () => {
    const html = renderRequestForm({ id: 'u', email: 'a@example.test', name: 'A' });
    expect(html).toContain('placeholder="Unit number"');
    expect(html).not.toMatch(/\bLDS\b/);
  });
});
