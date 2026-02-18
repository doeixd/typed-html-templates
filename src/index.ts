import htm from 'htm';

type Whitespace = ' ' | '\n' | '\t' | '\r';

type ParserMode =
  | 'text'
  | 'tagName'
  | 'beforeAttr'
  | 'attrName'
  | 'afterAttrName'
  | 'beforeAttrValue'
  | 'attrValue';

type Quote = '' | '"' | "'";

type ParserState = {
  mode: ParserMode;
  currentTag: string;
  currentAttr: string;
  quote: Quote;
  dynamicTag: boolean;
};

type InitialState = {
  mode: 'text';
  currentTag: '';
  currentAttr: '';
  quote: '';
  dynamicTag: false;
};

type ReplaceState<
  S extends ParserState,
  Next extends Partial<ParserState>
> = Omit<S, keyof Next> & Next;

type IsWhitespace<C extends string> = C extends Whitespace ? true : false;

type ScanText<C extends string, S extends ParserState> = C extends '<'
  ? ReplaceState<S, {
      mode: 'tagName';
      currentTag: '';
      currentAttr: '';
      quote: '';
      dynamicTag: false;
    }>
  : S;

type ScanTagName<C extends string, S extends ParserState> = C extends '>'
  ? ReplaceState<S, { mode: 'text'; currentTag: ''; currentAttr: ''; quote: '' }>
  : C extends '/'
    ? S
    : IsWhitespace<C> extends true
      ? S['currentTag'] extends ''
        ? S
        : ReplaceState<S, { mode: 'beforeAttr' }>
      : ReplaceState<S, { currentTag: `${S['currentTag']}${Lowercase<C>}` }>;

type ScanBeforeAttr<C extends string, S extends ParserState> = C extends '>'
  ? ReplaceState<S, { mode: 'text'; currentTag: ''; currentAttr: ''; quote: '' }>
  : C extends '/'
    ? S
    : IsWhitespace<C> extends true
      ? S
      : ReplaceState<S, { mode: 'attrName'; currentAttr: C }>;

type ScanAttrName<C extends string, S extends ParserState> = C extends '='
  ? ReplaceState<S, { mode: 'beforeAttrValue' }>
  : C extends '>'
    ? ReplaceState<S, { mode: 'text'; currentTag: ''; currentAttr: ''; quote: '' }>
    : C extends '/'
      ? ReplaceState<S, { mode: 'beforeAttr'; currentAttr: '' }>
      : IsWhitespace<C> extends true
        ? ReplaceState<S, { mode: 'afterAttrName' }>
        : ReplaceState<S, { currentAttr: `${S['currentAttr']}${C}` }>;

type ScanAfterAttrName<C extends string, S extends ParserState> = C extends '='
  ? ReplaceState<S, { mode: 'beforeAttrValue' }>
  : C extends '>'
    ? ReplaceState<S, { mode: 'text'; currentTag: ''; currentAttr: ''; quote: '' }>
    : C extends '/'
      ? ReplaceState<S, { mode: 'beforeAttr'; currentAttr: '' }>
      : IsWhitespace<C> extends true
        ? S
        : ReplaceState<S, { mode: 'attrName'; currentAttr: C }>;

type ScanBeforeAttrValue<C extends string, S extends ParserState> = IsWhitespace<C> extends true
  ? S
  : C extends '"'
    ? ReplaceState<S, { mode: 'attrValue'; quote: '"' }>
    : C extends "'"
      ? ReplaceState<S, { mode: 'attrValue'; quote: "'" }>
      : C extends '>'
        ? ReplaceState<S, {
            mode: 'text';
            currentTag: '';
            currentAttr: '';
            quote: '';
          }>
        : ReplaceState<S, { mode: 'attrValue'; quote: '' }>;

type ScanAttrValue<C extends string, S extends ParserState> = S['quote'] extends ''
  ? C extends '>'
    ? ReplaceState<S, {
        mode: 'text';
        currentTag: '';
        currentAttr: '';
        quote: '';
      }>
    : IsWhitespace<C> extends true
      ? ReplaceState<S, { mode: 'beforeAttr'; currentAttr: ''; quote: '' }>
      : S
  : C extends S['quote']
    ? ReplaceState<S, { mode: 'beforeAttr'; currentAttr: ''; quote: '' }>
    : S;

type ScanChar<C extends string, S extends ParserState> = S['mode'] extends 'text'
  ? ScanText<C, S>
  : S['mode'] extends 'tagName'
    ? ScanTagName<C, S>
    : S['mode'] extends 'beforeAttr'
      ? ScanBeforeAttr<C, S>
      : S['mode'] extends 'attrName'
        ? ScanAttrName<C, S>
        : S['mode'] extends 'afterAttrName'
          ? ScanAfterAttrName<C, S>
          : S['mode'] extends 'beforeAttrValue'
            ? ScanBeforeAttrValue<C, S>
            : ScanAttrValue<C, S>;

type ScanSegment<Segment extends string, S extends ParserState> = Segment extends `${infer C}${infer Rest}`
  ? ScanSegment<Rest, ScanChar<C, S>>
  : S;

type ChildContext = { kind: 'child' };
type TagContext = { kind: 'tag' };
type SpreadContext<Tag extends string, Dynamic extends boolean> = {
  kind: 'spread';
  tag: Tag;
  dynamic: Dynamic;
};
type AttrValueContext<
  Tag extends string,
  Attr extends string,
  Dynamic extends boolean
> = {
  kind: 'attrValue';
  tag: Tag;
  attr: Attr;
  dynamic: Dynamic;
};

type InterpolationContext =
  | ChildContext
  | TagContext
  | SpreadContext<string, boolean>
  | AttrValueContext<string, string, boolean>;

type ContextFromState<S extends ParserState> = S['mode'] extends 'tagName'
  ? TagContext
  : S['mode'] extends 'attrName'
    ? S['currentAttr'] extends '...'
      ? SpreadContext<S['currentTag'], S['dynamicTag']>
      : ChildContext
    : S['mode'] extends 'beforeAttrValue' | 'attrValue'
      ? AttrValueContext<S['currentTag'], S['currentAttr'], S['dynamicTag']>
      : ChildContext;

type AdvanceAfterInterpolation<
  S extends ParserState,
  C extends InterpolationContext
> = C['kind'] extends 'tag'
  ? ReplaceState<S, {
      mode: 'beforeAttr';
      dynamicTag: true;
      currentTag: '';
      currentAttr: '';
      quote: '';
    }>
  : C['kind'] extends 'spread'
    ? ReplaceState<S, { mode: 'beforeAttr'; currentAttr: '' }>
    : C['kind'] extends 'attrValue'
      ? S['mode'] extends 'attrValue'
        ? S['quote'] extends ''
          ? ReplaceState<S, { mode: 'beforeAttr'; currentAttr: ''; quote: '' }>
          : S
        : ReplaceState<S, { mode: 'beforeAttr'; currentAttr: ''; quote: '' }>
      : S;

type InterpolationContexts<
  Strings extends readonly string[],
  S extends ParserState = InitialState,
  Out extends readonly InterpolationContext[] = []
> = Strings extends readonly [
  infer Current extends string,
  infer Next extends string,
  ...infer Rest extends string[]
]
  ? ScanSegment<Current, S> extends infer Scanned extends ParserState
    ? ContextFromState<Scanned> extends infer C extends InterpolationContext
      ? InterpolationContexts<
          readonly [Next, ...Rest],
          AdvanceAfterInterpolation<Scanned, C>,
          readonly [...Out, C]
        >
      : Out
    : Out
  : Strings extends readonly [string]
    ? Out
    : readonly InterpolationContext[];

type PrimitiveAttr = string | number | boolean | null | undefined;
type AnyFunction = (...args: any[]) => unknown;

export type ChildValue =
  | PrimitiveAttr
  | readonly ChildValue[]
  | { readonly [key: string]: unknown };

export type ComponentType<Props = Record<string, unknown>, Result = unknown> =
  | ((props: Props) => Result)
  | (new (props: Props) => Result);

export type InferComponentProps<T> = T extends (props: infer Props) => unknown
  ? Props
  : T extends new (props: infer Props) => unknown
    ? Props
    : never;

export type IntrinsicElementsMap = Record<string, Record<string, unknown>>;

type NonFunctionPropertyNames<T> = {
  [K in keyof T]-?: T[K] extends AnyFunction ? never : K;
}[keyof T];

type BaseDomProps<ElementType extends Element> = {
  [K in Extract<NonFunctionPropertyNames<ElementType>, string>]?: ElementType[K];
};

type DomDataAriaProps = {
  [K in `data-${string}`]?: PrimitiveAttr;
} & {
  [K in `aria-${string}`]?: PrimitiveAttr;
};

type DomEventProps = {
  [K in `on${string}`]?: ((event: Event) => unknown) | null;
};

type DomProps<ElementType extends Element> = BaseDomProps<ElementType> & DomDataAriaProps & DomEventProps;

export type DOMIntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]: DomProps<HTMLElementTagNameMap[K]>;
};

export type DefaultIntrinsicElements = DOMIntrinsicElements;

type TagValue<Intrinsic extends IntrinsicElementsMap> =
  | keyof Intrinsic
  | ComponentType<any>
  | string;

type LowercaseKeyMatch<Props, Attr extends string> = {
  [K in Extract<keyof Props, string>]: Lowercase<K> extends Lowercase<Attr> ? Props[K] : never;
}[Extract<keyof Props, string>];

type FallbackAttrValue<Attr extends string> = Lowercase<Attr> extends `on${string}`
  ? ((event: Event) => unknown) | null
  : PrimitiveAttr;

type LookupAttrValue<Props, Attr extends string> = Attr extends keyof Props
  ? Props[Attr]
  : LowercaseKeyMatch<Props, Attr> extends never
    ? FallbackAttrValue<Attr>
    : LowercaseKeyMatch<Props, Attr>;

type AttrValueFor<
  Intrinsic extends IntrinsicElementsMap,
  Tag extends string,
  Attr extends string,
  Dynamic extends boolean
> = Dynamic extends true
  ? PrimitiveAttr
  : Lowercase<Attr> extends `on${string}`
    ? ((event: Event) => unknown) | null
  : Lowercase<Tag> extends keyof Intrinsic
    ? LookupAttrValue<Intrinsic[Lowercase<Tag>], Attr>
    : PrimitiveAttr;

type SpreadValueFor<
  Intrinsic extends IntrinsicElementsMap,
  Tag extends string,
  Dynamic extends boolean
> = Dynamic extends true
  ? Record<string, unknown> | null | undefined
  : Lowercase<Tag> extends keyof Intrinsic
    ? Partial<Intrinsic[Lowercase<Tag>]> | null | undefined
    : Record<string, unknown> | null | undefined;

type AttrValueForTagValue<
  Intrinsic extends IntrinsicElementsMap,
  Tag,
  Attr extends string
> = Lowercase<Attr> extends `on${string}`
  ? ((event: Event) => unknown) | null
  : Tag extends string
  ? Lowercase<Tag> extends keyof Intrinsic
    ? LookupAttrValue<Intrinsic[Lowercase<Tag>], Attr>
    : PrimitiveAttr
  : Tag extends ComponentType<any>
    ? LookupAttrValue<InferComponentProps<Tag>, Attr>
    : PrimitiveAttr;

type SpreadValueForTagValue<
  Intrinsic extends IntrinsicElementsMap,
  Tag
> = Tag extends string
  ? Lowercase<Tag> extends keyof Intrinsic
    ? Partial<Intrinsic[Lowercase<Tag>]> | null | undefined
    : Record<string, unknown> | null | undefined
  : Tag extends ComponentType<any>
    ? Partial<InferComponentProps<Tag>> | null | undefined
    : Record<string, unknown> | null | undefined;

type ValidateInterpolationValues<
  Contexts extends readonly InterpolationContext[],
  Values extends readonly unknown[],
  Intrinsic extends IntrinsicElementsMap,
  ActiveTag = never,
  Out extends readonly unknown[] = readonly []
> = Contexts extends readonly [
  infer CurrentContext extends InterpolationContext,
  ...infer RestContexts extends InterpolationContext[]
]
  ? Values extends readonly [infer CurrentValue, ...infer RestValues]
    ? CurrentContext['kind'] extends 'tag'
      ? CurrentValue extends TagValue<Intrinsic>
        ? ValidateInterpolationValues<
            RestContexts,
            RestValues,
            Intrinsic,
            CurrentValue,
            readonly [...Out, CurrentValue]
          >
        : never
      : CurrentContext extends SpreadContext<infer Tag extends string, infer Dynamic extends boolean>
        ? Dynamic extends true
          ? CurrentValue extends SpreadValueForTagValue<Intrinsic, ActiveTag>
            ? ValidateInterpolationValues<
                RestContexts,
                RestValues,
                Intrinsic,
                ActiveTag,
                readonly [...Out, CurrentValue]
              >
            : never
          : CurrentValue extends SpreadValueFor<Intrinsic, Tag, Dynamic>
            ? ValidateInterpolationValues<
                RestContexts,
                RestValues,
                Intrinsic,
                ActiveTag,
                readonly [...Out, CurrentValue]
              >
            : never
        : CurrentContext extends AttrValueContext<
              infer Tag extends string,
              infer Attr extends string,
              infer Dynamic extends boolean
            >
          ? Dynamic extends true
            ? CurrentValue extends AttrValueForTagValue<Intrinsic, ActiveTag, Attr>
              ? ValidateInterpolationValues<
                  RestContexts,
                  RestValues,
                  Intrinsic,
                  ActiveTag,
                  readonly [...Out, CurrentValue]
                >
              : never
            : CurrentValue extends AttrValueFor<Intrinsic, Tag, Attr, Dynamic>
              ? ValidateInterpolationValues<
                  RestContexts,
                  RestValues,
                  Intrinsic,
                  ActiveTag,
                  readonly [...Out, CurrentValue]
                >
              : never
          : CurrentValue extends ChildValue
            ? ValidateInterpolationValues<
                RestContexts,
                RestValues,
                Intrinsic,
                ActiveTag,
                readonly [...Out, CurrentValue]
              >
            : never
    : never
  : Contexts extends readonly []
    ? Values extends readonly []
      ? Out
      : never
    : Values;

export type HFunction<Result = unknown> = (
  type: unknown,
  props: Record<string, unknown> | null,
  ...children: unknown[]
) => Result;

export type BoundHtml<
  H extends HFunction,
  Intrinsic extends IntrinsicElementsMap = DefaultIntrinsicElements
> = <const Strings extends readonly string[], const Values extends readonly unknown[]>(
  strings: TemplateStringsArray & Strings,
  ...values: ValidateInterpolationValues<InterpolationContexts<Strings>, Values, Intrinsic>
) => ReturnType<H> | ReturnType<H>[];

export type BoundSingleHtml<
  H extends HFunction,
  Intrinsic extends IntrinsicElementsMap = DefaultIntrinsicElements
> = <const Strings extends readonly string[], const Values extends readonly unknown[]>(
  strings: TemplateStringsArray & Strings,
  ...values: ValidateInterpolationValues<InterpolationContexts<Strings>, Values, Intrinsic>
) => ReturnType<H>;

export function bind<
  H extends HFunction,
  Intrinsic extends IntrinsicElementsMap = DefaultIntrinsicElements
>(h: H): BoundHtml<H, Intrinsic> {
  return htm.bind(h) as unknown as BoundHtml<H, Intrinsic>;
}

export function bindSingle<
  H extends HFunction,
  Intrinsic extends IntrinsicElementsMap = DefaultIntrinsicElements
>(h: H): BoundSingleHtml<H, Intrinsic> {
  const bound = htm.bind(h) as unknown as BoundHtml<H, Intrinsic>;
  return ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const result = bound(strings, ...values as never);
    if (Array.isArray(result)) {
      if (result.length !== 1) {
        throw new Error(`Expected exactly one root node but got ${result.length}.`);
      }
      return result[0] as ReturnType<H>;
    }
    return result;
  }) as BoundSingleHtml<H, Intrinsic>;
}

export function single<Result>(result: Result | Result[]): Result {
  if (Array.isArray(result)) {
    if (result.length !== 1) {
      throw new Error(`Expected exactly one root node but got ${result.length}.`);
    }
    return result[0] as Result;
  }
  return result;
}

export function template<const Parts extends readonly [string, ...string[]]>(
  parts: Parts
): TemplateStringsArray & Parts;
export function template<
  const Parts extends readonly [string, ...string[]],
  const Values extends readonly unknown[]
>(
  parts: Parts,
  ...values: Values
): readonly [TemplateStringsArray & Parts, ...Values];
export function template(
  parts: readonly [string, ...string[]],
  ...values: readonly unknown[]
): TemplateStringsArray | readonly [TemplateStringsArray, ...unknown[]] {
  const clone = [...parts] as string[];
  const strings = Object.assign(clone, { raw: clone }) as TemplateStringsArray;
  if (values.length === 0) {
    return strings;
  }
  return [strings, ...values] as const;
}

export type ElementForTag<Tag extends string> = Lowercase<Tag> extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Lowercase<Tag>]
  : HTMLElement;

export type Node<
  Tag = unknown,
  Props extends Record<string, unknown> | null = Record<string, unknown> | null,
  ElementType = unknown
> = {
  type: Tag;
  props: Props;
  children: unknown[];
  readonly element?: ElementType;
};

export const defaultH = <Tag>(
  type: Tag,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): Node<
  Tag,
  Record<string, unknown> | null,
  Tag extends string ? ElementForTag<Tag> : unknown
> => ({ type, props, children });

type TrimLeft<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimLeft<Rest> : S;

type TagBoundary = Whitespace | '/' | '>';

type TakeTagName<S extends string, Acc extends string = ''> = S extends `${infer C}${infer Rest}`
  ? C extends TagBoundary
    ? Acc
    : C extends '$'
      ? Acc
      : TakeTagName<Rest, `${Acc}${C}`>
  : Acc;

type FirstTagFromSegment<S extends string> = TrimLeft<S> extends `<${infer Rest}`
  ? TakeTagName<Rest>
  : never;

type FirstRootTag<Strings extends readonly string[]> = Strings extends readonly [
  infer First extends string,
  ...string[]
]
  ? FirstTagFromSegment<First>
  : never;

type DefaultNodeForTemplate<Strings extends readonly string[]> = FirstRootTag<Strings> extends infer Tag extends string
  ? [Tag] extends [never]
    ? Node<string, Record<string, unknown> | null, HTMLElement>
    : Tag extends ''
      ? Node<string, Record<string, unknown> | null, HTMLElement>
      : Node<Lowercase<Tag>, Record<string, unknown> | null, ElementForTag<Tag>>
  : Node<string, Record<string, unknown> | null, HTMLElement>;

export type DefaultHtml = <const Strings extends readonly string[], const Values extends readonly unknown[]>(
  strings: TemplateStringsArray & Strings,
  ...values: ValidateInterpolationValues<InterpolationContexts<Strings>, Values, DefaultIntrinsicElements>
) => DefaultNodeForTemplate<Strings> | DefaultNodeForTemplate<Strings>[];

const html = bind(defaultH) as DefaultHtml;

export default html;
