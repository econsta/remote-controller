/** @import { Arg, CommandConstruct } from './types.js' */
/** @import { Transport } from './transport.js' */

import { unwrapArg, wrapArg } from './wrap-arg.js'

export class Receiver {
	idMap
	remoterType = /** @type {const} */ ('Receiver')

	constructor(/**@type {any}*/ remoteObj, /**@type {Transport}*/ transport) {
		this.remoteObj = remoteObj
		this.transport = transport
		transport.remoter = this
		this.idMap = new Map()
	}

	idToObject(id, path = []) {
		let obj
		if (id == 0) {
			obj = this.remoteObj
		} else {
			obj = this.idMap.get(id)
		}
		for (const prop of path) {
			obj = obj[prop]
		}
		return obj
	}

	getCallbackShim(id) {
		return async (...args) => {
			const wrappedArgs = await Promise.all(
				args.map(async arg => await wrapArg(arg, this))
			)
			this.transport.postMessage({
				type: 1, //ReceiverMessageCallback
				id: id,
				args: wrappedArgs
			})
		}
	}

	async onMessage(data) {
		switch (data.type) {
			case 1: //ControllerMessageCommands
				await this.onCommandsMessage(data)
				break
			case 0: //ControllerMessageCleanup
				this.onCleanupMessage(data)
				break
			default:
				console.error(`Unknown message type: ${data}`)
				break
		}
	}

	async onCommandsMessage(data) {
		const getResults = []
		for (const cmd of data.commands) {
			await this.runCommand(cmd, getResults)
		}
		this.transport.postMessage({
			type: 0, //Done
			flushId: data.flushId,
			results: getResults
		})
	}

	onCleanupMessage(data) {
		for (const id of data.ids) this.idMap.delete(id)
	}

	async runCommand(command, getResults) {
		switch (command.type) {
			case 0: //Call
				this.call(command)
				break
			case 1: //Set
				this.set(command)
				break
			case 2: //Get
				await this.get(command, getResults)
				break
			case 3: //Construct
				this.construct(command)
				break
			default:
				throw new Error(`invalid cmd type: ${command}`)
		}
	}

	construct(/**@type {CommandConstruct}*/ command) {
		const { objectId, path, argsData, returnId } = command
		const obj = this.idToObject(objectId)
		const args = argsData.map((/**@type {Arg}*/ arg) =>
			unwrapArg(arg.root, arg.refs, this)
		)
		const methodName = path[path.length - 1]
		let base = obj
		for (let i = 0, len = path.length - 1; i < len; ++i) {
			base = base[path[i]]
		}
		const ret = new base[methodName](...args)
		this.idMap.set(returnId, ret)
	}

	call(command) {
		const { objectId, path, argsData, returnId } = command
		const obj = this.idToObject(objectId)
		const args = argsData.map((/**@type {Arg}*/ arg) =>
			unwrapArg(arg.root, arg.refs, this)
		)
		const methodName = path[path.length - 1]
		let base = obj
		for (let i = 0, len = path.length - 1; i < len; ++i) {
			base = base[path[i]]
		}
		const ret = base[methodName](...args)
		this.idMap.set(returnId, ret)
	}

	set(command) {
		const { objectId, path, argsData } = command
		const obj = this.idToObject(objectId)
		const value = unwrapArg(argsData.root, argsData.refs, this)
		const propertyName = path[path.length - 1]
		let base = obj
		for (let i = 0, len = path.length - 1; i < len; ++i) {
			base = base[path[i]]
		}
		base[propertyName] = value
	}

	async get(command, getResults) {
		const { objectId, path, getId } = command
		let obj = this.idToObject(objectId)
		if (obj?.then) {
			obj = await obj
		}
		if (path == undefined || path.length < 1) {
			const val = await wrapArg(obj, this)
			getResults.push({
				getId,
				valueData: val
			})
			return
		}
		const propertyName = path[path.length - 1]
		let base = obj
		for (let i = 0, len = path.length - 1; i < len; ++i) {
			base = base[path[i]]
		}
		obj = await base[propertyName]
		const val = await wrapArg(obj, this)
		getResults.push({
			getId,
			valueData: val
		})
	}

	destroy() {
		this.transport.destroy()
	}
}
