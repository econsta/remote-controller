import { Controller } from './controller.js'
import { Receiver } from './receiver.js'
import { Transport, PortTransport, WebSocketTransport } from './transport.js'


function shimTransport(/**@type {WebSocket | MessagePort | Transport | Worker}*/ transport) {
	/**@type {Transport}*/ let shim
	const name = transport.constructor.name
	if (['MessagePort', 'Worker', 'DedicatedWorkerGlobalScope'].includes(name)) {
		shim = new PortTransport(/**@type {MessagePort}*/ (transport))
	} else if (name == 'WebSocket') {
		shim = new WebSocketTransport(transport)
	} else {
		shim = /**@type {Transport}*/ (transport)
	}
	return shim
}

export function createController(/**@type {WebSocket | MessagePort | Transport | Worker}*/ transport) {
	const shim = shimTransport(transport)
	const controller = new Controller(shim)
	return controller.remote
}

export function createReceiver(/**@type {any}*/ obj, /**@type {WebSocket | MessagePort | Transport | Worker}*/ transport) {
	const shim = shimTransport(transport)
	return new Receiver(obj, shim)
}