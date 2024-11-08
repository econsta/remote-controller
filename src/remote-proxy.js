import { Controller } from './controller.js'
import { wrapArg } from './wrap-arg.js'

globalThis.ProxySymbol = Symbol()
const oldConstructor = Proxy.constructor
Proxy.constructor = (target, handler) => {
	const ret = oldConstructor(target, handler)
	Object.defineProperty(ret, ProxySymbol, { enumerable: false, value: target })
	return ret
}

export function Remote(
	/**@type {Controller}*/ controller,
	/**@type {number}*/ objectId,
	/**@type {string[]}*/ path = []
) {
	this.$objectId = objectId
	this.$path = path
	/**@type {ProxyHandler<Remote>}*/ const remote = {
		get: (target, key) => {
			if (key === ProxySymbol) {
				return target
			}
			if (key === 'then') {
				const getId = Math.random() * Number.MAX_SAFE_INTEGER
				controller.addToQueue({
					type: 2,
					objectId: this.$objectId,
					path: this.$path,
					getId: getId
				})
				return async resolve => {
					controller.pendingGetResolves.set(getId, {
						objectId: this.$objectId,
						path: this.$path,
						resolve
					})
				}
			}
			return new Remote(controller, this.$objectId, [
				...this.$path,
				key.toString()
			])
		},
		set: (target, key, value) => {
			const nextPath = target.$path.slice()
			controller.addToQueue({
				type: 1,
				objectId: this.$objectId,
				path: [...nextPath, key],
				argsData: wrapArg(value, controller)
			})
			return true
		},
		apply: (_target, _thisArg, args) => {
			if (this.$path[this.$path.length - 1] === 'then') {
				this.$path.pop()
				const getId = Math.random() * Number.MAX_SAFE_INTEGER
				controller.addToQueue({
					type: 2,
					objectId: this.$objectId,
					path: this.$path,
					getId: getId
				})
				controller.pendingGetResolves.set(getId, {
					objectId: this.$objectId,
					path: this.$path,
					resolve: args[0]
				})
				return undefined
			}
			const returnId = Math.random() * Number.MAX_SAFE_INTEGER
			controller.addToQueue({
				type: 0,
				objectId: this.$objectId,
				path: this.$path,
				argsData: args.map(arg => wrapArg(arg, controller)),
				returnId
			})
			return new Remote(controller, returnId, [])
		},
		construct: (_target, args) => {
			const returnId = Math.random() * Number.MAX_SAFE_INTEGER
			controller.addToQueue({
				type: 3,
				objectId: this.$objectId,
				path: this.$path,
				argsData: args.map(arg => wrapArg(arg, controller)),
				returnId
			})
			return new Remote(controller, returnId)
		}
	}
	/**@type {any}*/ const func = () => {}
	func.$objectId = objectId
	func.$path = path
	const ret = new Proxy(func, remote)
	//so that objectId 0 does not get registered for cleanup
	if (objectId) {
		controller.finalizationRegistry.register(ret, objectId)
	}
	return ret
}
