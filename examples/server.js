import * as http from 'http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { startFileServer } from './static/static.js'

const server = http.createServer()

async function start() {
	await startFileServer(server)
	server.listen(3000, () => {
		console.log('server started')
	})
}
start()