# typed-html-templates

Type-safe HTM templates on top of [`htm`](https://www.npmjs.com/package/htm).

This package keeps HTM runtime semantics (`htm.bind(h)`) and adds compile-time type-safety for interpolation holes (`${...}`) using a type-level parser/state machine.

## Why this exists

Ryan Carniato described the problem well:

> "I've been looking at `html` tagged template literals again and man the state of things sucks. I'd be so happy if @_developit's `htm` was the accepted format and we could just get typing going, but as usual there are competing standards and in a lot of ways it makes sense.
>
> 1. We have WC folks who have a strong voice in standards that don't care about anything beyond WCs (why should they) but unfortunately WCs are severely limited in a universal sense, so can never be the actual complete answer.
>
> 2. We have TS that doesn't want to go through implementing a specific thing like JSX again so unless standards forces their hands they probably aren't going to move.
>
> 3. The options for representing tags are either untypable slots, inline case sensitive (goes against standard case insensitivity), or bulky beyond reasonable usage(call create element yourself).
>
> I would appeal to WC folks to support some exotic syntax. But honestly if I were them I wouldn't want to. But then again they have no issue proposing their own exotic syntax (like `.`, `@`, and `?`) which IMHO should only be included if HTML supports them. So I get this does devolve into people trying to standardize their own framework. But the TS need is real. A real conundrum."

This package aims to be that "get typing going" layer for HTM-compatible templates.

## Install

```bash
npm install typed-html-templates
```

## Quick start

```ts
import html from 'typed-html-templates';

const node = html`<div id=${'hello'}>${'world'}</div>`;
```

The default export is `bind(defaultH)`, where `defaultH` returns:

```ts
{ type, props, children }
```

## Use with your renderer

Like HTM, this package is renderer-agnostic:

```ts
import { bind } from 'typed-html-templates';

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props,
  children
});

const html = bind(h);
```

Runtime behavior is delegated directly to `htm.bind(h)`.

## Type-safety model: interpolation holes

The type system parses the template string around each `${...}` and infers what that hole means from context.

### Hole kinds

- **Tag hole**: ``<${X} ...>``
- **Attribute value hole**: ``<div id=${X} />``
- **Spread hole**: ``<div ...${X} />``
- **Child hole**: ``<div>${X}</div>``

Each hole gets a different expected type.

### 1) Tag holes

In ``<${X} />``, `X` must be a valid tag target:

- intrinsic tag name (`'div'`, `'button'`, etc.)
- component function/class

```ts
const Comp = (_props: { ok: boolean }) => null;

html`<${'div'} />`; // ok
html`<${Comp} ok=${true} />`; // ok
// @ts-expect-error invalid tag target
html`<${{ nope: true }} />`;
```

### 2) Attribute value holes

In ``attr=${X}``, `X` is validated against the active tag and attribute.

- intrinsic tags use intrinsic map props
- dynamic component tags use inferred component props
- unknown attrs fall back to primitive values

```ts
const Card = (_props: { title: string; featured?: boolean }) => null;

html`<input value=${'ok'} checked=${true} />`; // ok
// @ts-expect-error input.value should be string
html`<input value=${123} />`;

html`<${Card} title=${'Hello'} featured=${true} />`; // ok
// @ts-expect-error title should be string
html`<${Card} title=${123} />`;
```

### 3) Spread holes

In ``...${X}``, `X` must be object-like:

- intrinsic tag: `Partial<IntrinsicProps>`
- dynamic component tag: `Partial<ComponentProps>`
- allows `null | undefined`

```ts
const Card = (_props: { title: string; featured?: boolean }) => null;

html`<div ...${{ id: 'a' }} />`; // ok
// @ts-expect-error wrong intrinsic prop type
html`<div ...${{ id: 1 }} />`;

html`<${Card} ...${{ title: 'ok' }} />`; // ok
// @ts-expect-error wrong component prop type
html`<${Card} ...${{ title: 123 }} />`;
```

### 4) Child holes

In child position, values are constrained to `ChildValue`:

- primitives (`string | number | boolean | null | undefined`)
- nested child arrays
- object-like values

```ts
html`<div>${'text'}</div>`;
html`<div>${['a', 1, { nested: true }]}</div>`;
// @ts-expect-error symbols are not valid children
html`<div>${Symbol('x')}</div>`;
```

## Built-in DOM intrinsic typing

By default, `bind(h)` uses `DOMIntrinsicElements` derived from `HTMLElementTagNameMap`.

This gives out-of-the-box typing for common DOM properties, including case-insensitive attr lookup for matching (`tabindex` resolves against `tabIndex`).

```ts
import { bind } from 'typed-html-templates';

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props,
  children
});

const html = bind(h);

html`<input value=${'x'} checked=${true} />`;
html`<div tabindex=${1} />`;
// @ts-expect-error tabindex should be number
html`<div tabindex=${'1'} />`;
```

## Custom intrinsic map

You can replace DOM defaults with your own intrinsic map:

```ts
import { bind } from 'typed-html-templates';

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

html`<div id=${'ok'} draggable=${true} />`;
// @ts-expect-error id should be string
html`<div id=${123} />`;
```

## HTM compatibility

- Runtime rendering/parsing is from `htm`
- Multiple roots, component tags, spread props, boolean attrs, etc. follow HTM runtime behavior
- This package focuses on static typing of interpolation holes

## API

- `default` -> `html` bound to a default object-returning `h`
- `bind(h)` -> typed HTM-compatible tag function
- `DOMIntrinsicElements` -> built-in intrinsic map from `HTMLElementTagNameMap`
- `InferComponentProps<T>` -> extract component props
- `ComponentType<Props, Result>` -> component function/class shape
