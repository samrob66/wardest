import { describe, it, expect } from 'vitest';
import { parseRecipients, MAX_RECIPIENTS } from '../src/lib/recipients';

describe('parseRecipients', () => {
  it('Review Focus 1: the same person pasted several ways is one address', () => {
    const r = parseRecipients('Ann@Example.test, ann@example.test; Ann Smith <ann@example.test>;\n\n\nnot-an-email\n');
    expect(r.valid).toEqual(['ann@example.test']);
    expect(r.invalid).toEqual(['not-an-email']);
    expect(r.duplicates).toBe(2);
  });

  it('splits on commas, semicolons, spaces and new lines; keeps quoted names with commas together', () => {
    const r = parseRecipients('a@example.test b@example.test\r\nc@example.test;d@example.test,\t"Smith, Eve" <eve@example.test>');
    expect(r.valid).toEqual(['a@example.test', 'b@example.test', 'c@example.test', 'd@example.test', 'eve@example.test']);
    expect(r.invalid).toEqual([]);
    expect(r.duplicates).toBe(0);
  });

  it('lists each invalid entry once and never accepts header tricks', () => {
    const r = parseRecipients('bad, bad, x@y, <>, "a@b.test\nBcc: c@d.test"');
    expect(r.invalid).toContain('bad');
    expect(r.invalid.filter((x) => x === 'bad')).toHaveLength(1);
    expect(r.valid.every((v) => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(v))).toBe(true);
  });

  it('plain addresses before a named address in the same segment are kept', () => {
    const r = parseRecipients('ann@x.test bob@x.test Carol <carol@x.test>');
    expect(r.valid).toEqual(['ann@x.test', 'bob@x.test', 'carol@x.test']);
    expect(r.invalid).toEqual([]);
  });

  it('named and plain addresses mixed across separators: 4 valid', () => {
    const r = parseRecipients('Name <a@x.test>, b@x.test c@x.test Dee <d@x.test>');
    expect(r.valid).toEqual(['a@x.test', 'b@x.test', 'c@x.test', 'd@x.test']);
    expect(r.invalid).toEqual([]);
    expect(r.duplicates).toBe(0);
  });

  it('a lone name with no address is reported invalid, never silently dropped', () => {
    const r = parseRecipients('Frank, gus@x.test');
    expect(r.valid).toEqual(['gus@x.test']);
    expect(r.invalid).toEqual(['Frank']);
  });

  it('empty input', () => {
    expect(parseRecipients('')).toEqual({ valid: [], invalid: [], duplicates: 0 });
    expect(MAX_RECIPIENTS).toBe(10_000);
  });
});
