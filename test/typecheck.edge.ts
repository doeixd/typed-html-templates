import { bind } from '../src';

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props,
  children
});

const html = bind(h);

const makeTemplate = <const T extends readonly string[]>(parts: T): TemplateStringsArray & T => {
  const clone = [...parts] as string[];
  return Object.assign(clone, { raw: clone }) as unknown as TemplateStringsArray & T;
};

const inputValue = makeTemplate(['<input value=', ' />'] as const);
void html(inputValue, 'ok');
// @ts-expect-error input value should be string
void html(inputValue, 123);

const inputChecked = makeTemplate(['<input checked=', ' />'] as const);
void html(inputChecked, true);
// @ts-expect-error checked should be boolean
void html(inputChecked, 'true');

const tabIndexLower = makeTemplate(['<div tabindex=', ' />'] as const);
void html(tabIndexLower, 1);
// @ts-expect-error lowercase tabindex still maps to numeric tabIndex
void html(tabIndexLower, '1');

const onClick = makeTemplate(['<button onClick=', ' />'] as const);
void html(onClick, (event: Event) => event.type);
void html(onClick, null);
// @ts-expect-error event handler should be a function or null
void html(onClick, 'nope');

const ariaLabel = makeTemplate(['<div aria-label=', ' />'] as const);
void html(ariaLabel, 'label');
void html(ariaLabel, 1);

const childSlot = makeTemplate(['<div>', '</div>'] as const);
void html(childSlot, ['a', 1, { nested: true }]);
// @ts-expect-error symbols are not valid child values
void html(childSlot, Symbol('x'));

const dynamicValue = makeTemplate(['<', ' value=', ' />'] as const);
void html(dynamicValue, 'input', 'ok');
// @ts-expect-error value for input should be string
void html(dynamicValue, 'input', 42);
void html(dynamicValue, 'x-foo', 42);

const Comp = (_props: { title: string; count?: number }) => null;
const dynamicComponentAttr = makeTemplate(['<', ' title=', ' />'] as const);
void html(dynamicComponentAttr, Comp, 'ok');
// @ts-expect-error component title prop should be string
void html(dynamicComponentAttr, Comp, 42);

const dynamicComponentSpread = makeTemplate(['<', ' ...', ' />'] as const);
void html(dynamicComponentSpread, Comp, { title: 'ok' });
void html(dynamicComponentSpread, Comp, null);
// @ts-expect-error spread should match component props
void html(dynamicComponentSpread, Comp, { title: 123 });
