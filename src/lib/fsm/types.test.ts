import { fsm } from "./index.js"

// @ts-expect-error fsm expects 2 arguments (0 provided)
const invalid1 = fsm()
// @ts-expect-error fsm expects 2 arguments (1 provided)
const invalid2 = fsm("foo")
// @ts-expect-error fsm expects string or symbol for initial state (null provided)
const invalid3 = fsm(null, {})
// @ts-expect-error fsm expects string or symbol for initial state (number provided)
const invalid4 = fsm(1, {})
// @ts-expect-error fsm expects object for states (string provided)
const invalid5 = fsm("foo", "bar")
// @ts-expect-error fsm expects initial state to match a defined state or fallback
const invalid6 = fsm("foo", {})

const invalid7 = fsm("foo", {
	foo: {
		// @ts-expect-error state expects action to be string or function (object provided)
		bar: {},
		// @ts-expect-error state expects action to be string or function (number provided)
		baz: 1,
		// @ts-expect-error state expects lifecycle action to be function (string provided)
		_enter: "bar"
	}
})

// A simple, valid state machine
const valid1 = fsm("off", {
	off: {
		toggle: "on"
	},
	on: {
		toggle() {
			return "off"
		},
		turnOff(message: string) {
			return "off"
		}
	}
})

// @ts-expect-error Cannot assign to 'current' because it is a read-only property.
valid1.current = "on"

// @ts-expect-error state machine expects valid event invocation
valid1.noSuchAction()

valid1.toggle()
valid1.turnOff("")
// @ts-expect-error arguments are strongly typed
valid1.toggle(1)
// @ts-expect-error arguments are strongly typed
valid1.toggle(true, 1)
// @ts-expect-error arguments are strongly typed
valid1.turnOff()

// @ts-expect-error
valid1.toggle("test", true, 1)

// can call debounce
valid1.toggle.debounce(100)

const toggleResultValid: string = valid1.toggle()
// @ts-expect-error toggle returns string
const toggleResultInvalid: number = valid1.toggle()

// A state machine with fallback state (any initial state permitted)
// @ts-expect-error
const valid2 = fsm("initial", {
	"*": {
		foo: () => {}
	}
})
valid2.foo()

// A state machine with overloaded action signatures
const valid3 = fsm("foo", {
	"*": {
		overloaded(one: number) {
			return "foo"
		}
	},
	foo: {
		overloaded(one: string, two: number) {}
	}
})

// @ts-expect-error overloaded expects 1 or 2 args (0 provided)
valid3.overloaded()
valid3.overloaded.debounce(2, 1)
valid3.overloaded.debounce(2, "", 1)

// @ts-expect-error overloaded debounce expects first argument as number
valid3.overloaded.debounce(2, 2, 1)
// @ts-expect-error overloaded expects first argument as number
valid3.overloaded("string")
valid3.overloaded(1)
// @ts-expect-error overloaded expects first argument as string
valid3.overloaded(1, 2)
valid3.overloaded("string", 2)
// @ts-expect-error overloaded expects 1 or 2 args (3 provided)
valid3.overloaded(1, 2, 3)

// @ts-expect-error overloaded with single argument returns "foo"
const overloadedResult1Invalid: void = valid3.overloaded(1)
const overloadedResult1Valid: string = valid3.overloaded(1)

// @ts-expect-error overloaded with two arguments returns "foo"
const overloadedResult2Invalid: void = valid3.overloaded("string", 1)
const overloadedResult2Valid: string = valid3.overloaded("string", 1)
