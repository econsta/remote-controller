import {Server} from 'http'
import {readdir, readFile} from 'fs/promises'
import { resolve } from 'path'
import mime from './mime.js'
import {FileUpdate, hotReload} from './reload.js'
import {join, normalize} from 'path'

/**@returns {Promise<string[]>}*/
async function getFiles(/**@type {string}*/ dir) {
	try{
		const dirents = await readdir(dir, { withFileTypes: true })
		const files = await Promise.all(dirents.map((dirent) => {
			const res = resolve(dir, dirent.name)
			return dirent.isDirectory() ? getFiles(res) : res
		}))
		return Array.prototype.concat(...files)
	} catch(e) {
		return [dir]

	}	
}

function fileToURL(/**@type {string}*/ filename) {
	return normalize(filename).replace(join(process.cwd(), 'src'), '').replace(join(process.cwd(), 'examples'), '').replace('\\', '/')
}

export async function hostDir(/**@type {string[]}*/ ...dirs) {
	let res = (await Promise.all(
		dirs.map(dir => getFiles(dir))
	)).flat()
	
	let files = await Promise.all(res.map(async (/**@type {string}*/ filename) => {
		return [fileToURL(filename), (await readFile(filename))]
	}))
	return Object.fromEntries(files)
}

export async function startFileServer(/**@type {Server}*/ server) {
	const dir1 = join(process.cwd(), 'examples')
	const dir2 = join(process.cwd(), 'src')
	let urls = await hostDir(dir1, dir2)
	fileUpdated.addEventListener('fileUpdate', async (/**@type {FileUpdate}*/ e) => {
		let val = Object.keys(urls).find(dir => e.filename.search(join(process.cwd(), dir).replaceAll('/', '\\')))
		if(val) {
			urls[fileToURL(e.filename)] = (await readFile(e.filename))
		}
	})
	server.addListener('request', (req, res) => {
		/**@type {string}*/ let url = req.url?.split('?')[0]
		if(url == '/' || url == undefined) {
			url = '/index.html'
		}

		let ext = url.slice(url.lastIndexOf('.') + 1)
		let type = mime[ext]
		let file = urls[url]
		if(file) {
			res.setHeader('Content-Type', type)
			res.end(file)
		}
	})
}