import { Controller, Receiver } from '../src/remote.js'
import { PortTransport } from './utils.js'

async function main() {
	const { port1, port2 } = new MessageChannel()
	const controller = new Controller(new PortTransport(port1))
	const receiver = new Receiver({ success: true }, new PortTransport(port2))
	try {
		await controller.remote.success
	} finally {
		controller.destroy()
		receiver.destroy()
	}
}

main()
