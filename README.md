# Remote Controller

Remote Controller is the easiest way to interact across Websockets, Webworkers and WebRTC. The library is small, dependancy free, performant and powerful.

```
$ npm install --save remote-controller
```

## Introduction

Whether it is a browser talking to a NodeJs server, or a the main Javascript thread talking to a Webworker, a frightening amount of code is dedicated to solving one fundamental problem: allowing two Javascript instances to communicate with each other.

This library is an attempt to create the most seamless communication system possible within the limits of the Javascript language. It accomplishes this by allowing you to create a controller for a remote Javascript object that exists on another Javascript instance.

This controller give you access to all the properties of the remote instance, lets you call its functions with arguments, attach listeners, modify its properties or practically anything you could do with a normal object with virtually the same syntax.


## Examples

### Minimum Example

Here is a bare minimum example, using the built-in worker messaging system as the transport layer:

**worker.js**

```javascript
import { createReceiver } from 'remote-controller'

// Create or chose an existing object to share
let testObj = {	num1: 5, str1: 'foo'}
createReceiver(testObj, globalThis)
```

**index.js**

```javascript
import { createController } from 'remote-controller'

let worker = new Worker('worker.js', {type: 'module'})

let testObj = createController(worker)
// To access properties on the remote object they must be awaited
let num = await testObj.num1 // num = 5
// Properties can be set without awaiting
testObj.num1 = 7
```
### Messenger Example
Here is a simple messenger that uses Remote Controller to share an array of messages over a websocket. It shows how you can use built-in functions like Array.push() or addEventListener() on remote objects. You can view a working version of this in the examples folder
#### index.js
```javascript
import { createController } from 'remote-controller'

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
```

#### server.js
```javascript
import { createReceiver } from 'remote-controller'
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
```

### In-Depth Examples

#### To access properties on the remote object they must be awaited
<table><tr><th>index.js</th><th>worker.js</th></tr><tr><td>

```javascript
let num = await testObj.num1
console.log(num) // 5
```
</td><td>

```javascript
let testObj = {	num1: 5, str1: 'foo' }
```

</td></tr></table>

#### Properties can be set using a local value without awaiting
<table><tr></tr><tr><td>

```javascript
testObj.num1 = 2
console.log(await testObj.num1) // 2
```
</td><td>

```javascript
let testObj = {	num1: 5, str1: 'foo' }
```

</td></tr></table>

#### Properties can be set to another remote value
<table><tr></tr><tr><td>

```javascript
testObj.num1 = testObj.num2
console.log(await testObj.num1) // 1
```
</td><td>

```javascript
let testObj = {	num1: 5, num2: 1 }
```

</td></tr></table>

#### Remote functions can be called using local values as arguments, results must be awaited
<table><tr></tr><tr><td>

```javascript
let res = testObj.fun1(7)
console.log(await res) // 20
```
</td><td>

```javascript
let testObj = {	
	num1: 5,
	fun1(arg1) {
		return arg1 + 13 
	}
}
```

</td></tr></table>

#### Remote functions can be called using remote values, or a combination of remote and local values
<table><tr></tr><tr><td>

```javascript
let val1 = 11
let res = await testObj.fun1(res, testObj.num1, val1, 7)
console.log(res) // 140
```
</td><td>

```javascript
let testObj = {	
	num1: 5,
	fun1(arg1) {
		return return arg1 + arg2 + arg3 + arg4 + 100
	}
}
```

</td></tr></table>

#### Objects can be awaited to receive a copy of that object
<table><tr></tr><tr><td>

```javascript
let localObj = await testObj.obj1
console.log(localObj) // { num2: 2, num3: 11}
```
</td><td>

```javascript
let testObj = {	
	num1: 5,
	obj1: { num2: 2, num3: 11 }
}
```

</td></tr></table>

#### local copies of objects do not affect their remote counterparts, as they are copies
<table><tr></tr><tr><td>

```javascript
let localObj = await testObj.obj1
localObj.num2 = 4
console.log(await testObj.obj1.num2) // 2
```
</td><td>

```javascript
let testObj = {	
	num1: 5,
	obj1: { num2: 2, num3: 11 }
}
```

</td></tr></table>

#### all of the above also works for arrays
<table><tr></tr><tr><td>

```javascript
console.log(await testObj.arr1)
```
</td><td>

```javascript
let testObj = {	
	num1: 5,
	arr1: [-1, -2, -3, -4, -5],
}
```

</td></tr></table>

#### nested objects and circular dependencies also work, however promises and functions on objects will be undefined
<table><tr></tr><tr><td>

```javascript
let localObj2 = await testObj.obj2
console.log(localObj2) // { str3: "I am in obj2", circular: {…}, nested: {…} }
```
</td><td>

```javascript
let testObj = {	
	num1: 5,
	arr1: [-1, -2, -3, -4, -5],
}
```

</td></tr></table>

#### callback functions can be sent as arguments, and if these functions are called they are run on the controller's side
<table><tr></tr><tr><td>

```javascript
let callback = (arg1) => { 
	console.log(arg1 + 11) // 18
}
await testObj.fun3(2, callback)
```
</td><td>

```javascript
let testObj = {	
	fun3(arg1, funArg) {
		let newArg = arg1 + 5
		funArg(newArg)
	},
}
```

</td></tr></table>

#### callback functions cannot run on the remote side, fun4 returns undefined because it attempts to get the return of a callback function
<table><tr></tr><tr><td>

```javascript
let callback2 = (arg1) => {
	let res = arg1 + 12
	return res
}
let res3 = await testObj.fun4(2, callback2)
console.log(res3) // undefined
```
</td><td>

```javascript
let testObj = {	
	fun4(arg1, funArg) {
		let newArg = arg1 + 5
		let res = funArg(newArg)
		return res
	},
}
```

</td></tr></table>

#### functions can be sent to run on the remote side using the fnArg function, this will allow fun4 to run
<table><tr></tr><tr><td>

```javascript
let notCallback = (arg1) => {
	let res = arg1 + 12
	return res
}
let res4 = await testObj.fun4(2, fnArg(notCallback)) 
console.log(res4) // 19
```
</td><td>

```javascript
let testObj = {	
	fun4(arg1, funArg) {
		let newArg = arg1 + 5
		let res = funArg(newArg)
		return res
	},
}
```

</td></tr></table>

#### If fnArgs use variables in the local scope, these can be sent with the function in order to run on the remote side
<table><tr></tr><tr><td>

```javascript
let localVar = 100
let notCallback2 = (arg1) => {
	let res = arg1 + 12 + localVar
	return res
}
let res5 = await testObj.fun4(2, fnArg(notCallback2, {localVar})) 
console.log(res5) // 119
```
</td><td>

```javascript
let testObj = {	
	fun4(arg1, funArg) {
		let newArg = arg1 + 5
		let res = funArg(newArg)
		return res
	},
}
```

</td></tr></table>

## API

### createController(Transport)

Creates the controller using a transport system, and returns the remote object. Use this on the local JavaScript instance.

### createReceiver(Object, Transport)

Creates the receiver using a transport system, and the object you would like the Controller side to have access to. This has no return value. This is used on the remote side.

### Class: Transport

This class represents a transport layer that the Controller or Receiver will be using. There are built in Transport objects for both websockets and workers, but if you would like to use something else you can declare a new Transport for Remote Controller to use.

#### new Transport(config)
- `config` {Object}
	- `adapt` {Function} A callback function used to setup message handlers on the underlying transport
	- `postMessage` {Function} A callback function to send a message over the underlying transport
	 - `destroy` {Function} An optional teardown method

Here is an example that adapts for Websockets
```javascript
new Transport({
	adapt: transport => {
		ws.onmessage = e => {
			transport.onMessage(JSON.parse(e.data))
		}
	},
	postMessage: data => {
		ws.send(JSON.stringify(data))
	}
})
```

## Uses

This library has potential to be used in any situation where two Javascript instances need to communicate. A major inspiration to this project was the desire to create an enhanced version of Google's [Comlink][comlink] so it should be a perfect fit for any project where that could be used. It is currently used in production to centrally manage a browser based peer to peer video streaming network.

The most important factor to consider when deciding to use Remote Controller is security. Because of the amount of power a controller gives over a remote it can be used freely between secured contexts, or from a secure context to control an object in an insecure context, but it should never be used to control an object in a secured context from an insecure context. For example, it is perfectly fine to use a server (secured context) to control objects on a user's browser (insecure context), or from the main Javascript thread (secure context) to a worker (secured context). However, an external user's browser (insecure context) should not be given remote control over an object on your server (secured context). Similarly, another user's browser (insecure context) should not be given control over an object in the current user's browser (secured context). 

## Further Work

There are two main enhancements that would be valuable for this library

1. Type support

2. Security

Unfortunately due to the complexity of the **Remote** type, current Typescript cannot accurately define all of its features. Hopefully in newer versions of Typescript this will be possible, or some brilliant developer finds a workaround (possibly a LSP extension?).

The main limitation in use for this library is that it shouldn't be used from insecure contexts, but I am fairly certain that a secured version of a Remote could exist which would allow this library to replace something like a REST API. I would really appreciate any ideas or discussions about how this could be achieved. 

## License

[MIT](LICENSE)

[comlink]: https://github.com/GoogleChromeLabs/comlink

