import { createSignal, onCleanup, type Accessor } from 'solid-js';
import { AnyFieldCore, FieldCore, MaybeAccessor, Validation } from './types';
import { access, validateValue } from './internalUtils';

/**
 * @prop value will be passed as getter to field value
 * @prop setValue will be passed as field onChange without change
 * @prop fieldList if defined on creation field will push itself to it
 * @prop submitted only when true form will be validated onChange
 * @prop name used for field identification and will be passed to field as name (untracked)
 * @prop validate function that will run when field if validated
 */
export type FieldCoreOptions<T, K extends string | undefined = undefined> = {
	value: Accessor<T>
	setValue(newValue: T): void

	fieldList: AnyFieldCore[],

	submitted: MaybeAccessor<boolean | undefined>
	name:      K,
	validate?: Validation<T>
}

/**
 * Core of every createField*
 * Should not be used directly as field creator, but wrapped with other function for readability
 * Should be used with form instance, but by it's own don't require it
 *
 * @example
 * const form = createForm({ value: 5, deepValue: { a: 1, b: 2, c: 'string' } })
 *
 * // Like createField
 * createFieldCore({
 * 		value() {
 * 			return form.values.value;
 * 		},
 * 		setValue(newValue) {
 * 			form.setValues('value', newValue);
 * 		},
 * 		fieldList: form._fields,
 * 		submitted() {
 * 			return form.submitted;
 * 		},
 * 		name:     'value',
 * 		validate: (it) => it < 0 && 'value cannot be negative',
 * 	})
 * // For deep values
 * createFieldCore({
 * 		value() {
 * 			return form.values.deepValue.a;
 * 		},
 * 		setValue(newValue) {
 * 			form.setValues('value', 'a', newValue);
 * 		},
 * 		fieldList: form._fields,
 * 		submitted() {
 * 			return form.submitted;
 * 		},
 * 		name:     'deepValue.a',
 * 		validate: (it) => it < 0 && 'value cannot be negative',
 * 	})
 *
 * @param options core heart containing all vital properties.
 * Only value and setValue is required for field to work, but is highly recommended to fill all props
 */
export function createFieldCore<T, K extends string | undefined = string>(options: FieldCoreOptions<T, K>): FieldCore<T, K> {
	const [ref, setRef] = createSignal<HTMLElement>();
	const [errors, setErrors] = createSignal<string[]>();

	const validate = () => {
		const submitted = access(options.submitted);
		const validate = options.validate;
		if (!validate || !submitted) return false;
		if (validate.empty) return validate();
		const newErrors = validateValue(options.value(), validate);
		setErrors(newErrors);
		return !!newErrors?.length;
	};
	validate.empty = true;

	const self: FieldCore<T, K> = {
		onChange(value) {
			options.setValue(value);
			validate();
		},
		name: options.name,
		validate,
		get value() {
			return options.value();
		},
		ref:    setRef,
		getRef: ref,
		get error() {
			return errors()?.[0];
		},
		get errorArr() {
			return errors();
		},
		setErrors,
	};

	const field = options.fieldList;
	if (field) {
		field.push(self);

		onCleanup(() => {
			field.splice(field.indexOf(self), 1);
		});
	}

	return self;
}
