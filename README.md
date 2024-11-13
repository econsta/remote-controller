# Remote Controller

Remote Controller is the easiest way to interact across Websockets, Webworkers and WebRTC. The library is small, dependancy free, performant and powerful.

```
$ npm install --save remote-controller
```

## Introduction

Whether it is a browser talking to a NodeJs server, or a the main Javascript thread talking to a Webworker, a frightening amount of code is dedicated to solving one fundimental problem: allowing two Javascript instances to communicate with each other.

This library is an attempt to create the most seamless communication system possible within the limits of the Javascript language. It accomplishes this by allowing you to create a controller for a remote Javascript object that exists on another Javascript instance.

This controller give you access to all of the properties of the remote instance, lets you call its functions with arguments, attach listeners, modify its properties or practically anything you could do a normal object with virtually the same sytax.


## Examples

### Minimum Example

Here is a bare minumum example, using the built in worker messaging system as the transport layer:

**worker.js**

```javascript
import { createReceiver } from './remote.js'

// Create or chose an existing object to share
let testObj = {	num1: 5, str1: 'foo'}
createReceiver(testObj, globalThis)
```

**index.js**

```javascript
import { createController } from './remote.js'

let worker = new Worker('worker.js', {type: 'module'})

let testObj = createController(worker)
// To access properties on the remote object they must be awaited
let num = await testObj.num1 // num = 5
// Properties can be set without awaiting
testObj.num1 = 7
```

### In-Depth Example

Here is an example with a much more complex object and many more operations

**worker.js**

```javascript
import { createReceiver } from './remote.js'

let testObj = {
	num1: 5,
	num2: 7,
	num3: 1,
	obj1: {
		num3: 2,
		num4: 11
	},
	arr1: [-1, -2, -3, -4, -5],
	fun1(arg1) {
		return arg1 + 13 
	},
	fun2(arg1, arg2, arg3, arg4) {
		return arg1 + arg2 + arg3 + arg4 + 100 
	},
	fun3(arg1, funArg) {
		let newArg = arg1 + 5
		funArg(newArg)
	},
	fun4(arg1, funArg) {
		let newArg = arg1 + 5
		let res = funArg(newArg)
		return res
	},
	obj2: {
		str1: 'I am in obj2',
		circular: {},
		nested: {
			str2: 'I am in nested'
		}
	}
}

testObj.obj2.circular = testObj

createReceiver(testObj, globalThis)
```
**index.js**

```javascript
import { createController, fnArg } from './remote.js'

let worker = new Worker('worker.js', {type: 'module'})
let testObj = createController(worker)

// To access properties on the remote object they must be awaited
let num = await testObj.num1 // num = 5
console.log(num) // 5

// Properties can be set using a local value without awaiting
testObj.num1 = 2 // Remote<testObj.num1> = Remote<2>
console.log(await testObj.num1) // 2

// Properties can be set to another remote value
testObj.num2 = testObj.num3 // Remote<testObj.num2> = Remote<1>
console.log(await testObj.num2) // 1

//Remote functions can be called using local values as arguments, results must be awaited
let res = testObj.fun1(7) // res = Remote<20>
console.log(await res) // 20

// Remote functions can be called using remote values, or a combination of remote and local values
let val1 = 11
let res2 = await testObj.fun2(res, testObj.num1, val1, 7) // res2 = 140
console.log(res2) // 140

// Objects can be awaited to receive a copy of that object
let localObj = await testObj.obj1 // localObj = { num3: 2, num4: 11}
console.log(localObj) // { num3: 2, num4: 11}

// local copies of objects do not effect their remote counterparts, as they are copies
localObj.num3 = 4
console.log(await testObj.obj1.num3) // 2

// the same is true for arrays
console.log(await testObj.arr1) // [-1, -2, -3, -4, -5]

// nested objects and cirular dependancies also work, however promise and functions on objects will be undefined
let localObj2 = await testObj.obj2 // localObj2 = { str3: "I am in obj2", circular: {…}, nested: {…} }
console.log(localObj2)

// callback functions can be sent as arguments, and if these functions are called they are run on the controller's side
let callback = (arg1) => { 
	console.log(arg1 + 11) // 18
}
await testObj.fun3(2, callback) // await ensures this runs synchronously, but is not required for function to run

// callback functions cannot run on the remote side, fun4 returns undefined bcause it attempts to get the return of a callback function
let callback2 = (arg1) => {
	let res = arg1 + 12
	return res
}
let res3 = await testObj.fun4(2, callback2)
console.log(res3) // undefined

// functions can be sent to run on the remote side using the fnArg function, this will allow fun4 to run
let notCallback = (arg1) => {
	let res = arg1 + 12
	return res
}
let res4 = await testObj.fun4(2, fnArg(notCallback)) 
console.log(res4) // 19

// If fnArgs use variables in the local scope, these can be sent with the function in order to run on the remote side
let localVar = 100
let notCallback2 = (arg1) => {
	let res = arg1 + 12 + localVar
	return res
}
let res5 = await testObj.fun4(2, fnArg(notCallback2, {localVar})) 
console.log(res5) // 119
```
## Table

#### To access properties on the remote object they must be awaited
<table><tr><th>index.js</th><th>worker.js</th></tr><tr><td>

```javascript
let num = await testObj.num1 // num = 5
console.log(num) // 5
```
</td><td>

```javascript
let testObj = {	num1: 5, str1: 'foo'}
```

</td></tr></table>

#### Properties can be set using a local value without awaiting
<table><tr><th>index.js</th><th>worker.js</th></tr><tr><td>

```javascript
testObj.num1 = 2 // Remote<testObj.num1> = Remote<2>
console.log(await testObj.num1) // 2
```
</td><td>

```javascript
let testObj = {	num1: 5, str1: 'foo'}
```

</td></tr></table>

#### Properties can be set to another remote value
<table><tr><th>index.js</th><th>worker.js</th></tr><tr><td>

```javascript
testObj.num1 = testObj.num2 // Remote<testObj.num2> = Remote<1>
console.log(await testObj.num2) // 1
```
</td><td>

```javascript
let testObj = {	num1: 5, num2: 1}
```

</td></tr></table>

## API

## Uses

This library has potential to be used in any situation where two Javascript instances need to communicate. A major inspiration to this project was the desire to create an enhanced version of Google's [Comlink][comlink] so it should be a perfect fit for any project where that could be used. It is currently in use by Chthonic Software Inc. to centrally manage a browser based peer to peer video streaming network.

The most important factor to consider when deciding whether or not to use Remote Controller is security. Because of the amount of power a controller gives over a remote it can be used freely between secured contexts, or from a secure context to control an object in an insecure context, but it should never be used to control an object in a secured context from an insecure context. For example it is perfectly fine to use a server (secured context) to control objects on a user's browser (insecure context), or from the main Javascript thread (secure context) to a worker (secured context). However, an external user's browser (insecure context) should not be given remote control over an object on your server (secured context). Similarly, another user's browser (insecured context) should not be given control over an object in the current user's browser (secured context). 

## Further Work

There are two main enhancements that would be valuable for this library

1. Type support

2. Security

Unfortunately due to the complexity of the **Remote** type, current Typescript cannot accurately define all of its features. Hopefully in newer versions of Typescript this will be possible, or some brilliant developer finds a workaround (possilby a LSP extension?).

The main limitation in use for this library is that it shouldn't be used from insecure contexts, but I am fairly certain that a secured version of a Remote could exist which would allow this library to replace something like a REST API. I would really appreciate any ideas or discussions about how this could be achieved. 

[comlink]: https://github.com/GoogleChromeLabs/comlink

--

License Apache-2.0
