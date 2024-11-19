import { createReceiver } from '../../src/remote.js'
import { WebSocketServer } from 'ws'

class MyMessager {
	messages = []
	et = new EventTarget()

	sentMessage(message) {
		this.et.dispatchEvent(new CustomEvent('message', {detail: message}))
	}
}

let myMessager = new MyMessager()

const wss = new WebSocketServer({ port: 3000 })
wss.on('connection', (ws) => {
	createReceiver(myMessager, ws)
})