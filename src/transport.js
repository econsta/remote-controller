/**@typedef {import('./controller.js').Controller} Controller*/
/**@typedef {import('./receiver.js').Receiver} Receiver*/

/**
 * @callback Adapt
 * @param {Transport} shim
 * @returns {void}
 */

/**
 * @callback PostMessage
 * @param {any} data
 * @returns {void | PromiseLike<void>}
 */

/**
 * @callback Destroy
 * @returns {void | PromiseLike<void>}
 */

export class Transport {
	/**
	 * @param {object} config
	 * @param {Adapt} config.adapt - A callback function used to setup message handlers on the underlying transport
	 * @param {PostMessage} config.postMessage - A callback function to send a message over the underlying transport
	 * @param {Destroy} [config.destroy] - An optional teardown method
	 */
	constructor(config) {
		/** @type {Controller | Receiver | undefined} */
		this.remoter = undefined
		this.postMessage = config.postMessage
		/** @private */
		this._destroy = config.destroy
		/** @private */
		this._destroyed = false
		config.adapt(this)
	}

	get destroyed() {
		return this._destroyed
	}

	/**
	 * Sends messages coming off the underlying transport to the receiver instance
	 * @param {any} data
	 */
	onMessage(data) {
		if (!this.remoter) {
			throw new Error("shim wasn't bound to a receiver")
		}
		this.remoter.onMessage(data)
	}

	/**
	 * Override this method so that custom transports can have a convenient way of
	 * shutting down without overwriting the public destroy method.
	 * @protected
	 * @returns {void | PromiseLike<void>}
	 */
	teardown() {}

	destroy() {
		if (!this._destroyed) {
			this._destroyed = true
			Promise.allSettled([
				Promise.resolve(() => this.teardown()),
				Promise.resolve(() => this._destroy?.())
			])
		}
	}
}
