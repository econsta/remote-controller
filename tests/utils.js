import { Transport } from '../src/transport.js'

export class PortTransport extends Transport {
	constructor(/**@type {MessagePort}*/ port) {
		super({
			adapt: transport => {
				port.onmessage = event => {
					transport.onMessage(event.data)
				}
			},
			postMessage: data => {
				port.postMessage(structuredClone(data))
			},
			destroy: () => {
				port.close()
			}
		})
	}
}
