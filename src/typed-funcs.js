export function isPrimitive(o) {
	const type = typeof o
	return (
		type === 'undefined' ||
		o === null ||
		type === 'boolean' ||
		type === 'number' ||
		type === 'string' ||
		o instanceof Date ||
		o instanceof RegExp ||
		o instanceof ArrayBuffer
	)
}

export function isObject(value) {
	return (
		typeof value === 'object' &&
		value != null &&
		!(value instanceof Boolean) &&
		!(value instanceof Date) &&
		!(value instanceof Number) &&
		!(value instanceof RegExp) &&
		!(value instanceof String) &&
		!Array.isArray(value)
	)
}

export function shouldBeCloneable(o) {
	return o?.constructor === {}.constructor || isPrimitive(o)
}

export function isCloneable(obj) {
	try {
		postMessage(obj, '*')
	} catch (error) {
		if (error?.code === 25) return false // DATA_CLONE_ERR
	}
	return true
}

export const Args = {
	/**@type {0}*/ Primitive: 0,
	/**@type {1}*/ Object: 1,
	/**@type {2}*/ Remote: 2,
	/**@type {3}*/ Function: 3,
	/**@type {4}*/ Callback: 4
}
