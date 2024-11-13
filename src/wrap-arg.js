import { Controller } from './controller.js'
import { Remote } from './remote-proxy.js'
import { isPrimitive } from './typed-funcs.js'

function getAllPropertyNames(obj) {
	const props = []
	do {
		for (const prop of Object.getOwnPropertyNames(obj)) {
			if (props.indexOf(prop) === -1) {
				props.push(prop)
			}
		}
		obj = Object.getPrototypeOf(obj)
		if (obj?.constructor?.name === 'Object') {
			obj = undefined
		}
	} while (obj)

	return props
}

function toPointer(/**@type {Array<string|number>}*/ parts) {
	const tokens = parts
		.map(part => {
			return String(part).replace(/~/g, '~0').replace(/\//g, '~1')
		})
		.join('/')
	return `#${tokens}`
}

/**
 * TODO - does not depromisify
 */
function deProxyAndDePromise(val) {
	if (val[ProxySymbol]) {
		return val[ProxySymbol]
	}
	// val = await val
	// if(val[ProxySymbol]) {
	// 	val = val[ProxySymbol]
	// }
	return val
}

function makeFunction(scope, func) {
	const keys = Object.keys(scope)
	const values = Object.values(scope)
	return new Function(...keys, 'return ' + func.toString())(...values)
}

/**
 * @param {any} arg
 * @param {Controller | Receiver} remoter
 * @returns {Promise<{ root: Object, refs: Object }>}
 */
export async function wrapArg(arg, remoter) {
	const refs = {}
	const paths = new WeakMap()

	async function register(path, ret, wrap) {
		const pointer = toPointer(path)
		paths.set(ret, pointer)
		const res = await wrap(path, ret)
		refs[pointer] = res
		return {
			$type: 0,
			$ref: pointer
		}
	}

	async function wrapRemote(path, ret) {
		return await register(path, ret, async () => {
			const { $objectId, $path } = ret
			return {
				$type: 1,
				$objectId,
				$path
			}
		})
	}

	async function wrapBaseEntity(path, ret) {
		return await register(path, ret, async () => {
			const refpath = ret.$ref
				.split('#')[1]
				.split('/')
				.filter(str => str != '')
			const proxyPath = [...refpath]
			return {
				$type: 1,
				$objectId: 0,
				$path: proxyPath
			}
		})
	}

	async function wrapFunctionArg(path, ret) {
		return await register(path, ret, async () => {
			const args = ret()
			return {
				$type: 2,
				func: args.func,
				scope: args.scope
			}
		})
	}

	async function wrapCallback(path, ret) {
		return await register(path, ret, async () => {
			if (remoter.remoterType == 'Controller') {
				return {
					$type: 3,
					id: remoter.getCallbackId(ret)
				}
			}
			return { $type: 4 }
		})
	}

	async function wrapArray(path, array) {
		return await register(path, array, async () => {
			const val = []
			for (let i = 0; i < array.length; i++) {
				const item = array[i]
				const result = await replacer([...path, i.toString()], item)
				val.push(result)
			}
			return {
				$type: 5,
				val
			}
		})
	}

	async function wrapObject(path, ret) {
		return await register(path, ret, async () => {
			const val = {}
			const keys = getAllPropertyNames(ret)
			for (const key of keys) {
				try {
					val[key] = await replacer([...path, key], ret[key])
				} catch (e) {
					console.error(e)
				}
			}
			return {
				$type: 6,
				val
			}
		})
	}

	async function wrapPromise(path, ret) {
		return await register(path, ret, async () => {
			if (remoter.remoterType == 'Receiver') {
				const $objectId = Math.random() * Number.MAX_SAFE_INTEGER
				remoter.idMap.set($objectId, ret)
				return {
					$type: 1,
					$objectId,
					$path: path
				}
			} else {
				return {
					$type: 4
				}
			}
		})
	}

	const replacer = async (path, value) => {
		let ret = value

		if (isPrimitive(ret)) {
			return ret
		}

		ret = deProxyAndDePromise(ret)

		if (ret.$objectId != undefined) {
			return await wrapRemote(path, ret)
		}

		if (ret.$ref != undefined) {
			return await wrapBaseEntity(path, ret)
		}

		if (ret[functionSymbol] != undefined) {
			return await wrapFunctionArg(path, ret)
		}

		if (typeof ret === 'function') {
			return await wrapCallback(path, ret)
		}

		const seen = paths.get(ret)
		if (seen) {
			return {
				$type: 0,
				$ref: seen
			}
		}

		if (ret instanceof Array) {
			return await wrapArray(path, ret)
		}

		if (typeof ret === 'object' && typeof ret.then === 'function') {
			return await wrapPromise(path, ret)
		}

		return await wrapObject(path, ret)
	}

	const root = await replacer([], arg)
	return {
		root,
		refs
	}
}

export function unwrapArg(
	/**@type {Object}*/ root,
	/**@type {Object}*/ refs,
	/**@type {Controller | Receiver}*/ remoter
) {
	const arr = Object.keys(refs)
	const seen = new Set()
	if (isPrimitive(root)) {
		return root
	}

	const peel = key => {
		const base = refs[key]
		if (!seen.has(key)) {
			seen.add(key)
			if (typeof base == 'object' && base.$type) {
				switch (base.$type) {
					case 0:
						refs[key] = peel(base.$ref)
						break
					case 1:
						if (remoter.remoterType == 'Controller') {
							refs[key] = new Remote(remoter, base.$objectId, base.$path)
						} else {
							refs[key] = remoter.idToObject(base.$objectId, base.$path)
						}
						break
					case 2:
						refs[key] = makeFunction(base.scope, base.func)
						break
					case 3:
						//@ts-ignore
						refs[key] = remoter.getCallbackShim(base.id)
						break
					case 4:
						// console.error('unknown function')
						refs[key] = undefined
						break
					case 5:
						const res = []
						refs[key] = res
						base.val.forEach(el => {
							if (el != undefined && el.$type != undefined && el.$type == 0) {
								res.push(peel(el.$ref))
							} else {
								res.push(el)
							}
						})
						break
					case 6:
						const obj = {}
						refs[key] = obj
						Object.entries(base.val).forEach(prop => {
							if (
								prop[1] != undefined &&
								prop[1].$type != undefined &&
								prop[1].$type == 0
							) {
								obj[prop[0]] = peel(prop[1].$ref)
							} else {
								obj[prop[0]] = prop[1]
							}
						})
						break
				}
			}
		}
		return refs[key]
	}

	for (let x = 0; x < arr.length; x++) {
		const key = arr[x]
		peel(key)
	}
	return peel(root.$ref)
}
