/**
 * @import {
 *  Arg,
 *  Command,
 *  ReceiverMessageDone,
 *  ReceiverMessageCallback,
 *  ReceiverMessage,
 *  Resolve,
 *  RemoteRoot
 * } from './types.js'
 */
/** @import { Transport } from './transport.js' */
import { Remote } from './remote-proxy.js'
import { unwrapArg } from './wrap-arg.js'

export class Controller {
	/**@type {Command[]}*/ commandQueue = []
	/**@type {Map<Function, number>}*/ callbackToId = new Map()
	/**@type {Map<number, Function>}*/ idToCallback = new Map()
	/**@type {Map<number, Resolve>}*/ pendingGetResolves = new Map()
	/**@type {Map<number, Function>}*/ pendingFlushResolves = new Map()
	/**@type {RemoteRoot<any>}*/ remote = new Remote(this, 0)
	isPendingFlush = false
	remoterType = /** @type {const} */ ('Controller')

	finalizeTimerId = -1
	finalizeIntervalMs = 100
	/**@type {number[]}*/ finalizeIdQueue = []


	constructor(/**@type {Transport}*/ transport) {
		this.transport = transport
		transport.remoter = this
		this.finalizationRegistry = new FinalizationRegistry((/**@type {number}*/ id) => {
			this.finalizeIdQueue.push(id)
			if (this.finalizeTimerId === -1) {
				this.finalizeTimerId = 1
				setTimeout(() => {
					this.finalizeTimerId = -1
					this.transport.postMessage({
						type: 0,
						ids: this.finalizeIdQueue	
					})
					this.finalizeIdQueue = []
				}, this.finalizeIntervalMs)
			}
		})
	}

	addToQueue(/**@type {Command}*/ command) {
		this.commandQueue.push(command)
		if (!this.isPendingFlush) {
			this.isPendingFlush = true
			Promise.resolve().then(() => this.flush())
		}
	}

	getCallbackId(/**@type {Function}*/ func) {
		let id = this.callbackToId.get(func)
		if (typeof id === 'undefined') {
			id = Math.random() * Number.MAX_SAFE_INTEGER
			this.callbackToId.set(func, id)
			this.idToCallback.set(id, func)
		}
		return id
	}

	async flush() {
		let currentCommands = this.commandQueue
		this.commandQueue = []
		this.isPendingFlush = false
		if (!currentCommands.length) return Promise.resolve()
		const flushId = Math.random() * Number.MAX_SAFE_INTEGER
		currentCommands = await Promise.all(
			currentCommands.map(async (/**@type {Command}*/ command) => {
				switch (command.type) {
					case 1:
						command.argsData = await command.argsData
					case 2:
						break
					default:
						command.argsData = await Promise.all(command.argsData)
				}
				return command
			})
		)
		this.transport.postMessage({
			type: 1,
			commands: currentCommands,
			flushId: flushId
		})
		return new Promise(resolve => {
			this.pendingFlushResolves.set(flushId, resolve)
		})
	}

	onMessage(/**@type {ReceiverMessage}*/ data) {
		switch (data.type) {
			case 0:
				this.onDone(data)
				break
			case 1:
				this.onCallback(data)
				break
			default:
				break
			// throw new Error('invalid message type: ' + data)
		}
	}

	onDone(/**@type {ReceiverMessageDone}*/ data) {
		for (const { getId, valueData } of data.results) {
			const { resolve } = this.pendingGetResolves.get(getId)
			if (!resolve) throw new Error('invalid get id')
			const val = unwrapArg(valueData.root, valueData.refs, this)
			this.pendingGetResolves.delete(getId)
			resolve(val)
		}
		const flushId = data.flushId
		const flushResolve = this.pendingFlushResolves.get(flushId)
		if (!flushResolve) throw new Error('invalid flush id')
		this.pendingFlushResolves.delete(flushId)
		flushResolve(undefined)
	}

	onCallback(/**@type {ReceiverMessageCallback}*/ data) {
		const resolve = this.idToCallback.get(data.id)
		if (!resolve) throw new Error('invalid callback id')
		const args = data.args.map((/**@type {Arg}*/ arg) =>
			unwrapArg(arg.root, arg.refs, this)
		)
		resolve(...args)
	}

	destroy() {
		try {
			this.transport.destroy()
			this.finalizationRegistry = null
			this.commandQueue = []
			this.callbackToId.clear()
			this.idToCallback.clear()
			this.pendingFlushResolves.clear()
			this.pendingGetResolves.clear()
		} catch (error) {
			console.error(error)
		}
	}
}

globalThis.functionSymbol = Symbol()

export function fnArg(/**@type {Function}*/ fn, /**@type {any}*/ scope = {},) {
	const ret = () => {
		return {
			func: fn.toString(),
			scope
		}
	}
	Object.defineProperty(ret, functionSymbol, {
		value: true,
		enumerable: false
	})
	return ret
}


