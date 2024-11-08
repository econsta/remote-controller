import { Remote } from '../src/remote2.js'

const remote = new Remote()
const proxy = remote.track({
	a: [
		{
			c: false
		}
	]
})

const a = proxy.a
const b = a[0]
const c = b.c

console.log(Remote.isProxy(a), Remote.isProxy(b), c)
