import fc from 'fast-check'
import * as assert from 'node:assert/strict'
import * as path from 'node:path'
import { describe, it } from 'node:test'
import { Worker } from 'node:worker_threads'
import { Controller, Receiver, PortTransport } from '../src/remote.js'

/**
 * @param {TestContext} t
 * @param {*} value
 */
function createRemotePair(t, value) {
	const { port1, port2 } = new MessageChannel()
	const receiver = new Receiver(value, new PortTransport(port1))
	const controller = new Controller(new PortTransport(port2))
	t.after(() => {
		receiver.destroy()
		controller.destroy()
	})
	return {
		value,
		receiver,
		controller
	}
}

function primitiveArb() {
	return fc.oneof(
		fc.constant(null),
		fc.constant(undefined),
		fc.nat(),
		fc.boolean()
	)
}

describe('remote', async () => {
	it('remote disposes without hanging node', async () => {
		await new Promise((res, rej) => {
			const worker = new Worker(
				path.join(import.meta.dirname, './remote-destroy-test-script.js')
			)
			worker.on('error', error => {
				worker.terminate()
				worker.removeAllListeners()
				clearTimeout(timeoutId)
				rej(error)
			})
			worker.on('exit', () => {
				worker.removeAllListeners()
				clearTimeout(timeoutId)
				res()
			})
			const timeoutId = setTimeout(() => {
				worker.removeAllListeners()
				worker.terminate()
				rej(new Error("worker didn't terminate before timeout"))
			}, 1_500)
		})
	})
	it('remote getter returns correct primitive', async t => {
		await fc.assert(
			fc.asyncProperty(primitiveArb(), async primitive => {
				const { controller } = createRemotePair(t, {
					get value() {
						return primitive
					}
				})
				const remoteValue = await controller.remote.value
				assert.strictEqual(remoteValue, primitive)
			})
		)
	})
	await it('remote setter puts correct primitive', async t => {
		await fc.assert(
			fc.asyncProperty(primitiveArb(), async primitive => {
				const value = await new Promise(resolve => {
					const { controller } = createRemotePair(t, {
						set value(value) {
							resolve(value)
						}
					})
					controller.remote.value = primitive
				})
				assert.strictEqual(value, primitive)
			})
		)
	})
	await it('invoking identity function returns input', async t => {
		const { controller } = createRemotePair(t, {
			identity(value) {
				return value
			}
		})
		await fc.assert(
			fc.asyncProperty(fc.anything(), async value => {
				const result = await controller.remote.identity(value)
				assert.deepEqual(result, value)
			})
		)
	})
	await it('should return deeply nested properties', async t => {
		await fc.assert(
			fc.asyncProperty(fc.object({ maxKeys: 3, maxDepth: 5 }), async obj => {
				const { controller } = createRemotePair(t, obj)
				const stack = [obj, controller.remote]
				while (stack.length) {
					const [localObj, remoteObj] = stack.shift()
					for (const [key, localValue] of Object.entries(localObj)) {
						const remoteValue = await remoteObj[key]
						if (isPrimitive(localValue)) {
							assert.equal(remoteValue, localValue)
							continue
						}
						stack.push([localValue, remoteValue])
					}
				}
			})
		)
	})
})
