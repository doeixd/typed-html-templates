import defaultHtml, { asConst, bind, bindStrict, single, strictHtml, template } from '../src';

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props,
  children
});

const html = bind(h);
const strictBound = bindStrict(h);

const inputValue = template(['<input value=', ' />'] as const);
void html(inputValue, 'ok');
// @ts-expect-error input value should be string
void html(inputValue, 123);

const inputChecked = template(['<input checked=', ' />'] as const);
void html(inputChecked, true);
// @ts-expect-error checked should be boolean
void html(inputChecked, 'true');

const tabIndexLower = template(['<div tabindex=', ' />'] as const);
void html(tabIndexLower, 1);
// @ts-expect-error lowercase tabindex still maps to numeric tabIndex
void html(tabIndexLower, '1');

const onClick = template(['<button onClick=', ' />'] as const);
void html(onClick, (event: Event) => event.type);
void html(onClick, null);
// @ts-expect-error event handler should be a function or null
void html(onClick, 'nope');

const onClickLower = template(['<button onclick=', ' />'] as const);
void html(onClickLower, (event: MouseEvent) => event.clientX);

const ariaLabel = template(['<div aria-label=', ' />'] as const);
void html(ariaLabel, 'label');
void html(ariaLabel, 1);

const childSlot = template(['<div>', '</div>'] as const);
void html(childSlot, ['a', 1, { nested: true }]);
// @ts-expect-error symbols are not valid child values
void html(childSlot, Symbol('x'));

const dynamicValue = template(['<', ' value=', ' />'] as const);
void html(dynamicValue, 'input', 'ok');
// @ts-expect-error value for input should be string
void html(dynamicValue, 'input', 42);
void html(dynamicValue, 'x-foo', 42);

const Comp = (_props: { title: string; count?: number }) => null;
const dynamicComponentAttr = template(['<', ' title=', ' />'] as const);
void html(dynamicComponentAttr, Comp, 'ok');
// @ts-expect-error component title prop should be string
void html(dynamicComponentAttr, Comp, 42);

const dynamicComponentSpread = template(['<', ' ...', ' />'] as const);
void html(dynamicComponentSpread, Comp, { title: 'ok' });
void html(dynamicComponentSpread, Comp, null);
// @ts-expect-error spread should match component props
void html(dynamicComponentSpread, Comp, { title: 123 });

const helperTupleOk = html(...template(['<input value=', ' />'] as const, 'ok'));
void helperTupleOk;
// @ts-expect-error input value should be string
void html(...template(['<input value=', ' />'] as const, 123));

const helperFromOk = html(...template.from(['<input value=', ' />'] as const, 'ok'));
void helperFromOk;
const helperDomOk = html(...template.dom(['<input value=', ' />'] as const, 'ok'));
void helperDomOk;
const helperAsConstOk = html(...template(asConst(['<input value=', ' />']), 'ok'));
void helperAsConstOk;

const paramsOk = defaultHtml.params('<input value=', ' />')('ok');
void paramsOk;
void defaultHtml.params('<input value=', ' />')(123);

const strictParamsOk = strictHtml.params('<input value=', ' />')('ok');
void strictParamsOk;
void strictHtml.params('<input notARealProp=', ' />')('x');

const inferredNode = single(defaultHtml(...template(['<input value=', ' />'] as const, 'ok')));
const inferredInputElement: HTMLInputElement | undefined = inferredNode.element;
void inferredInputElement;
const inferredInputTag: 'input' = inferredNode.type;
void inferredInputTag;
// @ts-expect-error inferred root tag should be input
const inferredDivTag: 'div' = inferredNode.type;
void inferredDivTag;

const taggedNode = single(defaultHtml`<input value=${'ok'} />`);
const taggedElement: HTMLElement | undefined = taggedNode.element;
void taggedElement;
const taggedTag: string = taggedNode.type;
void taggedTag;

strictBound`<input value=${'ok'} checked=${true} />`;
// @ts-expect-error strict mode rejects unknown attrs on known intrinsic tags
strictBound(...template(['<input notARealProp=', ' />'] as const, 'x'));
// @ts-expect-error strict mode rejects unknown attrs on component props
strictBound(...template(['<', ' nope=', ' />'] as const, Comp, 'x'));

strictHtml`<input value=${'ok'} />`;
// @ts-expect-error strictHtml export rejects unknown attrs on known intrinsic tags
strictHtml(...template.one(['<input unknown=', ' />'] as const, 'x'));
