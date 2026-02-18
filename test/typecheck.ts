import { bind, template } from '../src';

type Intrinsics = {
  div: {
    id?: string;
    draggable?: boolean;
  };
  button: {
    disabled?: boolean;
    title?: string;
  };
};

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props,
  children
});

const html = bind<typeof h, Intrinsics>(h);

const divWithId = template(['<div id=', ' />'] as const);
void html(divWithId, 'ok');
// @ts-expect-error id should be string
void html(divWithId, 123);

const divWithSpread = template(['<div ...', ' />'] as const);
void html(divWithSpread, { id: 'a', draggable: true });
// @ts-expect-error spread for div should match partial intrinsic props
void html(divWithSpread, { id: 1 });

const divWithBoolean = template(['<div draggable=', ' />'] as const);
void html(divWithBoolean, true);
// @ts-expect-error draggable should be boolean
void html(divWithBoolean, 'yes');

const dynamicTag = template(['<', ' />'] as const);
void html(dynamicTag, 'div');
const Comp = (_props: { ok: boolean; count?: number }) => null;
void html(dynamicTag, Comp);
// @ts-expect-error tag interpolation expects component or tag name
void html(dynamicTag, { nope: true });

const dynamicAttr = template(['<', ' ok=', ' />'] as const);
void html(dynamicAttr, Comp, true);
// @ts-expect-error component prop `ok` should be boolean
void html(dynamicAttr, Comp, 'nope');

const dynamicSpread = template(['<', ' ...', ' />'] as const);
void html(dynamicSpread, Comp, { ok: true, count: 1 });
// @ts-expect-error spread should match component props
void html(dynamicSpread, Comp, { ok: 'nope' });
