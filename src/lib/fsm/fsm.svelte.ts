type States = Record<string | symbol, Record<string, string | Function>>
type InvocationProxy = Record<string, Function & { debounce: Function }> & { current: string }

export function fsm(initialStatus: string, states: States = {}) {
	/*
	 * Core Finite State Machine functionality
	 * - invoked events are dispatched to handler of current state
	 * - transitions to returned state (or value if static property)
	 * - calls _exit() and _enter() methods if they are defined on exited/entered state
	 */
	let status = $state(initialStatus)
	let proxy: InvocationProxy

	function transition(newStatus: string, event: string, args: unknown[]) {
		const metadata = { from: status, to: newStatus, event, args }
		dispatch("_exit", metadata)
		status = newStatus
		dispatch("_enter", metadata)
	}

	function dispatch(event: string, ...args: unknown[]) {
		const action = states[status]?.[event] ?? states["*"]?.[event]
		if (action === undefined && event !== "_enter" && event !== "_exit")
			console.warn("No action defined for event", event, "in state", status)
		return action instanceof Function ? action.apply(proxy, args) : action
	}

	function invoke(event: string, ...args: unknown[]) {
		const newStatus = dispatch(event, ...args)
		if (["string", "symbol"].includes(typeof newStatus) && newStatus !== status)
			transition(newStatus, event, args)
		return status
	}

	/*
	 * Debounce functionality
	 * - `debounce` is lazily bound to dynamic event invoker methods (see Proxy section below)
	 * - `event.debounce(wait, ...args)` calls event with args after wait (unless called again first)
	 * - cancels all prior invocations made for the same event
	 * - cancels entirely when called with `wait` of `null`
	 */
	const timeout: Record<string, NodeJS.Timeout> = {}

	async function debounce(event: string, wait: number | null = 100, ...args: unknown[]) {
		clearTimeout(timeout[event])
		if (wait === null) return status

		await new Promise((resolve) => (timeout[event] = setTimeout(resolve, wait)))
		delete timeout[event]
		return invoke(event, ...args)
	}

	/*
	 * Proxy-based event invocation API:
	 * - return a proxy object with a getter for the current status
	 * - all other properties act as dynamic event invocation methods
	 * - event invokers also respond to .debounce(wait, ...args) (see above)
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
	dispatch("_enter", { from: null, to: initialStatus, event: null, args: [] })
	return proxy
}
