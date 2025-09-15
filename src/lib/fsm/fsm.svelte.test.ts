import { beforeEach, describe, expect, it, vi } from "vitest"
import { fsm } from "./index.js"

describe("FSM of a simple toggle switch", () => {
	const offEnterHandler = vi.fn()
	const offExitHandler = vi.fn()
	const onEnterHandler = vi.fn()
	const onExitHandler = vi.fn()

	function createMachine() {
		return fsm("off", {
			off: {
				toggle: "on",
				_enter: offEnterHandler,
				_exit: offExitHandler
			},
			on: {
				toggle: "off",
				_enter: onEnterHandler,
				_exit: onExitHandler
			}
		})
	}

	let f: ReturnType<typeof createMachine>

	beforeEach(() => {
		offEnterHandler.mockClear()
		offExitHandler.mockClear()
		onEnterHandler.mockClear()
		onExitHandler.mockClear()
		f = createMachine()
	})

	it("starts in the off state", () => {
		expect(f.current).toBe("off")
	})

	it("toggles to on", () => {
		f.toggle()
		expect(f.current).toBe("on")
	})

	it("toggles to off", () => {
		f.toggle()
		f.toggle()
		expect(f.current).toBe("off")
	})

	it("does nothing for missing events", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		// @ts-expect-error this action is missing
		f.missing()
		expect(f.current).toBe("off")
		expect(warnSpy).toHaveBeenCalledTimes(1)
		expect(warnSpy).toHaveBeenCalledWith(
			"No action defined for event",
			"missing",
			"in state",
			"off"
		)
		warnSpy.mockRestore()
	})

	it("synthetically calls _enter handler for initial state", () => {
		expect(f.current).toBe("off")
		expect(offEnterHandler).toHaveBeenCalledTimes(1)
		expect(offExitHandler).not.toHaveBeenCalled()
		expect(onEnterHandler).not.toHaveBeenCalled()
		expect(onExitHandler).not.toHaveBeenCalled()
	})

	it("calls _enter and _exit handlers", () => {
		f.toggle()
		expect(f.current).toBe("on")
		expect(offEnterHandler).toHaveBeenCalledTimes(1)
		expect(offExitHandler).toHaveBeenCalledTimes(1)
		expect(onEnterHandler).toHaveBeenCalledTimes(1)
		expect(onExitHandler).not.toHaveBeenCalled()
	})

	it("passes arguments array to _enter and _exit handlers", () => {
		const args = [1, 2, 3]
		f.toggle(...args)
		expect(offEnterHandler).toHaveBeenCalledWith({ from: null, to: "off", event: null, args: [] })
		expect(offExitHandler).toHaveBeenCalledWith({ from: "off", to: "on", event: "toggle", args })
		expect(onEnterHandler).toHaveBeenCalledWith({ from: "off", to: "on", event: "toggle", args })
		expect(onExitHandler).not.toHaveBeenCalled()
	})

	it("passes a single argument to _enter and _exit handlers", () => {
		const origin = { x: 0, y: 0 }
		f.toggle(origin)
		expect(offEnterHandler).toHaveBeenCalledWith({ from: null, to: "off", event: null, args: [] })
		expect(offExitHandler).toHaveBeenCalledWith({
			from: "off",
			to: "on",
			event: "toggle",
			args: [origin]
		})
		expect(onEnterHandler).toHaveBeenCalledWith({
			from: "off",
			to: "on",
			event: "toggle",
			args: [origin]
		})
		expect(onExitHandler).not.toHaveBeenCalled()
	})
})

describe("FSM which uses action handlers instead of strings", () => {
	const offEnterHandler = vi.fn()
	const offExitHandler = vi.fn()
	const onEnterHandler = vi.fn()
	const onExitHandler = vi.fn()
	const toggleOnAction = vi.fn(() => "on")
	const toggleOffAction = vi.fn(() => "off")

	function createMachine() {
		return fsm("off", {
			off: {
				toggle: toggleOnAction,
				_enter: offEnterHandler,
				_exit: offExitHandler
			},
			on: {
				toggle: toggleOffAction,
				_enter: onEnterHandler,
				_exit: onExitHandler
			}
		})
	}

	let f: ReturnType<typeof createMachine>

	beforeEach(() => {
		offEnterHandler.mockClear()
		offExitHandler.mockClear()
		onEnterHandler.mockClear()
		onExitHandler.mockClear()
		toggleOnAction.mockClear()
		toggleOffAction.mockClear()
		f = createMachine()
	})

	it("toggles to another state", () => {
		f.toggle()
		expect(toggleOnAction).toHaveBeenCalledTimes(1)
		expect(toggleOffAction).not.toHaveBeenCalled()
		expect(f.current).toBe("on")
	})

	it("does nothing for missing events", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		// @ts-expect-error missing event
		f.notAnEvent()
		expect(toggleOnAction).not.toHaveBeenCalled()
		expect(toggleOffAction).not.toHaveBeenCalled()
		expect(f.current).toBe("off")
		warnSpy.mockRestore()
	})
})

describe("FSM which uses wildcard handlers", () => {
	const offEnterHandler = vi.fn()
	const offExitHandler = vi.fn()
	const onEnterHandler = vi.fn()
	const onExitHandler = vi.fn()
	const wildcardHandler = vi.fn(() => "off")

	function createMachine() {
		return fsm("off", {
			off: {
				toggle: "on",
				_enter: offEnterHandler,
				_exit: offExitHandler
			},
			on: {
				toggle: "off",
				_enter: onEnterHandler,
				_exit: onExitHandler
			},
			"*": {
				foo: wildcardHandler,
				toggle: wildcardHandler
			}
		})
	}
	let f: ReturnType<typeof createMachine>

	beforeEach(() => {
		offEnterHandler.mockClear()
		offExitHandler.mockClear()
		onEnterHandler.mockClear()
		onExitHandler.mockClear()
		wildcardHandler.mockClear()
		f = createMachine()
	})

	it("falls back to the wildcard state for missing events", () => {
		f.toggle()
		f.foo()
		expect(wildcardHandler).toHaveBeenCalledTimes(1)
		expect(f.current).toBe("off")
	})

	it("does not fall back to the wildcard state when it does not need to", () => {
		f.toggle()
		expect(wildcardHandler).not.toHaveBeenCalled()
		expect(f.current).toBe("on")
	})
})

describe("FSM which uses async debounce", () => {
	const toggleOnAction = vi.fn(() => "on")
	const toggleOffAction = vi.fn(() => "off")
	const offEnterHandler = vi.fn()
	const offExitHandler = vi.fn()
	const onEnterHandler = vi.fn()
	const onExitHandler = vi.fn()

	function createMachine() {
		return fsm("off", {
			off: {
				toggle: toggleOnAction,
				_enter: offEnterHandler,
				_exit: offExitHandler
			},
			on: {
				toggle: toggleOffAction,
				_enter: onEnterHandler,
				_exit: onExitHandler
			}
		})
	}
	let f: ReturnType<typeof createMachine>

	beforeEach(() => {
		toggleOnAction.mockClear()
		toggleOffAction.mockClear()
		offEnterHandler.mockClear()
		offExitHandler.mockClear()
		onEnterHandler.mockClear()
		onExitHandler.mockClear()
		f = createMachine()
	})

	it("debounces the event", async () => {
		await Promise.any([f.toggle.debounce(50), f.toggle.debounce(50)])
		expect(toggleOnAction).toHaveBeenCalledTimes(1)
		expect(toggleOffAction).not.toHaveBeenCalled()
		expect(f.current).toBe("on")
	})

	it("debounces the event with different wait times", async () => {
		await Promise.any([f.toggle.debounce(100), f.toggle.debounce(50)])
		expect(toggleOnAction).toHaveBeenCalledTimes(1)
		expect(toggleOffAction).not.toHaveBeenCalled()
		expect(f.current).toBe("on")
	})

	it("invokes enter and exit handlers for debounced events", async () => {
		await f.toggle.debounce(100)
		expect(offEnterHandler).toHaveBeenCalledTimes(1)
		expect(offExitHandler).toHaveBeenCalledTimes(1)
		expect(onEnterHandler).toHaveBeenCalledTimes(1)
		expect(onExitHandler).not.toHaveBeenCalled()
	})
})
