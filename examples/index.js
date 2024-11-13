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
