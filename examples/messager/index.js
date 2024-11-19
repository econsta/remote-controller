import { createController } from '../../src/remote.js'

const input = document.getElementsByTagName('input')[0]
const button = document.getElementsByTagName('button')[0]
const messageList = document.getElementById('messages')
let randomName = (Math.random() + 1).toString(36).substring(7)

const ws = new WebSocket('ws://localhost:3000')
let myMessager = createController(ws)

ws.addEventListener('open', async () => {
	button.addEventListener('click', () => {
		const message = {
			name: randomName,
			text: input.value
		}
		myMessager.messages.push(message)
		myMessager.sentMessage(message)
	})

	myMessager.et.addEventListener('message', async (e) => {
		let allMessages = await myMessager.messages
		console.log(e.detail)
		messageList.innerHTML = ''
		allMessages.forEach((message) => {
			const messageDiv = document.createElement('div')
			messageDiv.innerHTML = `
			<div>
				<span style="color: red">${message.name}: </span>
				<span>${message.text}</span>
			</div>
			`
			messageList.appendChild(messageDiv)
		})
	})
})
