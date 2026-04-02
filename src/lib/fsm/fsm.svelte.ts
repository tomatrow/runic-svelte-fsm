type States = Record<string, Record<string, string | Function>>
type InvocationProxy = Record<string, Function & { debounce: Function }> & { current: string }

export function fsm(initialStatus: string, states: States = {}) {
	/*
	 * Core Finite State Machine functionality
	 * - invoked actions are dispatched to handler of current state
	 * - transitions to returned state (or value if static property)
	 * - calls _exit() and _enter() methods if they are defined on exited/entered state
	 */
	let status = $state(initialStatus)
	let proxy: InvocationProxy

	function transition(newStatus: string, action: string, args: unknown[]) {
		const event = { from: status, to: newStatus, action, args }
		dispatch("_exit", event)
		status = newStatus
		dispatch("_enter", event)
	}

	function dispatch(action: string, ...args: unknown[]) {
		const handler = states[status]?.[action] ?? states["*"]?.[action]
		if (handler === undefined && action !== "_enter" && action !== "_exit")
			console.warn("No handler defined for action", action, "in state", status)
		return handler instanceof Function ? handler.apply(proxy, args) : handler
	}

	function invoke(action: string, ...args: unknown[]) {
		const newStatus = dispatch(action, ...args)
		if (typeof newStatus === "string" && newStatus !== status) transition(newStatus, action, args)
		return status
	}

	/*
	 * Debounce functionality
	 * - `debounce` is lazily bound to dynamic action invoker methods (see Proxy section below)
	 * - `action.debounce(wait, ...args)` calls action with args after wait (unless called again first)
	 * - cancels all prior invocations made for the same action
	 * - cancels entirely when called with `wait` of `null`
	 */
	const timeout: Record<string, NodeJS.Timeout> = {}

	async function debounce(action: string, wait: number | null = 100, ...args: unknown[]) {
		clearTimeout(timeout[action])
		if (wait === null) return status

		await new Promise((resolve) => (timeout[action] = setTimeout(resolve, wait)))
		delete timeout[action]
		return invoke(action, ...args)
	}

	/*
	 * Proxy-based action invocation API:
	 * - return a proxy object with a getter for the current status
	 * - all other properties act as dynamic action invocation methods
	 * - action invokers also respond to .debounce(wait, ...args) (see above)
	 */
	proxy = new Proxy(
		{
			get current() {
				return status
			}
		} as InvocationProxy,
		{
			get(target, property: string) {
				if (!Reflect.has(target, property))
					target[property] = Object.assign(invoke.bind(null, property), {
						debounce: debounce.bind(null, property)
					})
				return Reflect.get(target, property)
			}
		}
	)

	/** `_enter` initial state and return the proxy object */
	dispatch("_enter", { from: null, to: initialStatus, action: null, args: [] })
	return proxy
}
