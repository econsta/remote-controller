import { createReceiver } from '../../src/remote.js'

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