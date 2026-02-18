import html, {
  asConst,
  bind,
  bindStrict,
  single,
  strictHtml,
  template,
  type DOMIntrinsicElements
} from '../src';

// Open this file in VS Code (or another TS-aware editor) and hover values
// to inspect what each `${...}` hole expects.

// -----------------------------
// 1) Default html (DOM-typed)
// -----------------------------

const domOk = single(html(...template.dom(asConst(['<input value=', ' checked=', ' />']), 'hello', true)));
// Hover `domOk`:
// - You should see `Node<"input", ...>`.
// - `domOk.type` resolves to the root tag literal ("input").
// - `domOk.element` resolves to `HTMLInputElement | undefined`.

// You can still request only the strings object:
const inputTemplate = template.from(asConst(['<input value=', ' />']));

const inputValue = inputTemplate;
const inputChecked = template.dom(asConst(['<input checked=', ' />']));

html(inputValue, 'hello');
html(inputChecked, true);

// invalid: `value` on <input> is typed as string
// html(inputValue, 123);

// invalid: `checked` on <input> is typed as boolean
// html(inputChecked, 'true');

// Case-insensitive attribute matching:
const divTabIndex = template(['<div tabindex=', ' />'] as const);
html(divTabIndex, 1);
// invalid: `tabindex` maps to `tabIndex` (number)
// html(divTabIndex, '1');

// -----------------------------
// 2) Hole kinds (what is safe)
// -----------------------------

// Child hole: `<div>${...}</div>`
const childHole = template(['<div>', '</div>'] as const);
html(childHole, ['text', 1, { nested: true }]);
// invalid: Symbol is not a valid ChildValue
// html(childHole, Symbol('x'));

// Tag hole: `<${...} />`
const GoodComponent = (_props: { title: string; featured?: boolean }) => null;
const tagHole = template(['<', ' />'] as const);
html(tagHole, GoodComponent);
html(tagHole, 'section');
// invalid: tag holes accept string tags or component types
// html(tagHole, { nope: true });

// Attr value hole: `prop=${...}`
const componentAttr = template(['<', ' title=', ' featured=', ' />'] as const);
html(componentAttr, GoodComponent, 'ok', true);
// invalid: `title` should be string
// html(componentAttr, GoodComponent, 123, true);

// Spread hole: `...${...}`
const componentSpread = template(['<', ' ...', ' />'] as const);
html(componentSpread, GoodComponent, { title: 'ok' });
// invalid: spread values are checked against component props
// html(componentSpread, GoodComponent, { title: 123 });

// -----------------------------
// 3) Custom bind(h)
// -----------------------------

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props,
  children
});

const typedHtml = bind(h);

const customOk = typedHtml`<button disabled=${true}>${'click'}</button>`;
// Hover `customOk`:
// - Return type is inferred from `h`.

const strictBound = bindStrict(h);
strictBound`<input value=${'ok'} />`;
// invalid in strict mode (unknown prop for input)
// strictBound(...template.one(['<input notARealProp=', ' />'] as const, 'x'));

// Or use the default strict export (bound to defaultH):
strictHtml`<input value=${'ok'} />`;

// Event holes are function-typed for on* attrs.
const onClickHole = template(['<button onClick=', ' />'] as const);
typedHtml(onClickHole, (event: Event) => event.type);
// invalid: on* attrs require a function (or null in many cases)
// typedHtml(onClickHole, 'not-a-handler');

// -----------------------------
// 4) Explicit DOM map type
// -----------------------------

// Hover `DOMIntrinsicElements` to inspect the built-in intrinsic map shape.
type BuiltInDomMap = DOMIntrinsicElements;

// This alias is just here to make hover exploration easier.
type ExampleButtonProps = BuiltInDomMap['button'];

void domOk;
void customOk;
