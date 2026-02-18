import { describe, expect, it } from 'vitest';
import html, { bind, bindSingle, single, type Node } from '../src';

describe('typed htm runtime', () => {
  it('builds nodes with default hyperscript', () => {
    const result = html`<div id="a">Hello</div>` as Node;
    expect(result.type).toBe('div');
    expect(result.props).toEqual({ id: 'a' });
    expect(result.children).toEqual(['Hello']);
  });

  it('supports custom bindings', () => {
    const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
      type,
      props,
      children
    });
    const custom = bind(h);
    const result = custom`<section data-id=${'x'}>${'ok'}</section>`;
    expect(result).toEqual({
      type: 'section',
      props: { 'data-id': 'x' },
      children: ['ok']
    });
  });

  it('returns an array for multiple roots', () => {
    const result = html`<div>A</div><div>B</div>`;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('unwraps a single root with single()', () => {
    const result = single(html`<div id="x">A</div>`);
    expect(result.type).toBe('div');
    expect(result.props).toEqual({ id: 'x' });
  });

  it('throws for multiple roots with single()', () => {
    expect(() => single(html`<div /> <div />`)).toThrow('Expected exactly one root node');
  });

  it('supports strict single-root binding', () => {
    const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
      type,
      props,
      children
    });
    const htmlSingle = bindSingle(h);
    const result = htmlSingle`<article>${'ok'}</article>`;
    expect(result.type).toBe('article');
  });
});
