import { fsm } from "./index.js"
import type { InferStates, InferTransitions, TransitionEvent } from "./types.js"

// Type assertion helpers
type Assert<T extends true> = T
type Equals<A, B> =
	[A] extends [B] ?
		[B] extends [A] ?
			true
		:	false
	:	false
type Has<Union, Member> = Member extends Union ? true : false

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

// Note: function return types CANNOT be validated at compile time because
// TypeScript widens `return "typo"` to `string`. Only string action values
// (like `toggle: "typo"`) can be validated. To get compile-time validation
// on function returns, users must add explicit return type annotations.

// Invalid: string transition to wrong state
const invalidReturn2 = fsm("off", {
	off: {
		// @ts-expect-error "typo" is not a valid state
		toggle: "typo"
	},
	on: {
		toggle: "off"
	}
})

// Valid: function returns void (no transition)
const validVoid = fsm("off", {
	off: {
		doSomething() {
			console.log("side effect only")
			// no return — void is fine
		},
		toggle: "on"
	},
	on: {
		toggle: "off"
	}
})
validVoid.doSomething()
validVoid.toggle()

// Valid: function returns undefined explicitly
const validUndefined = fsm("off", {
	off: {
		doSomething() {
			return undefined
		},
		toggle: "on"
	},
	on: {
		toggle: "off"
	}
})
validUndefined.doSomething()
validUndefined.toggle()

// --- Inference utility tests ---

// InferStates: extracts the state union
type _inferStates = Assert<Equals<InferStates<typeof valid1>, "off" | "on">>

// InferTransitions: produces TransitionEvent-shaped objects
type Transitions1 = InferTransitions<typeof valid1>

// String transition: "off" → "on" via "toggle" — exact target, no args
type _transitionOffToggle = Assert<Has<Transitions1, TransitionEvent<"off", "on", "toggle", []>>>

// Function transitions: target widens to States because return type is `string`
type _transitionOnToggle = Assert<
	Has<Transitions1, TransitionEvent<"on", "off" | "on", "toggle", []>>
>
type _transitionOnTurnOff = Assert<
	Has<Transitions1, TransitionEvent<"on", "off" | "on", "turnOff", [message: string]>>
>

// Invalid transitions should not be assignable
// @ts-expect-error "off" state has no "turnOff" action
type _invalidTransition1 = Assert<Has<Transitions1, TransitionEvent<"off", "on", "turnOff", []>>>

// Wildcard state is excluded
type _noWildcardStates = Assert<Equals<InferStates<typeof valid3>, "foo">>

// InferTransitions includes wildcard actions distributed over concrete states
type Transitions3 = InferTransitions<typeof valid3>
// wildcard: overloaded(one: number) fires from "foo" with target "foo"
type _wildcardTransition = Assert<
	Has<Transitions3, TransitionEvent<"foo", "foo", "overloaded", [one: number]>>
>
// state-specific: overloaded(one: string, two: number) returns void — excluded from transitions
type _stateTransition = Assert<
	Equals<
		Has<Transitions3, TransitionEvent<"foo", "foo", "overloaded", [one: string, two: number]>>,
		false
	>
>

// Multi-state machine: wildcard distributes across all concrete states
const wildcardMulti = fsm("idle", {
	"*": { reset: "idle" },
	idle: { start: "running" },
	running: { stop: "idle" }
})
type TWild = InferTransitions<typeof wildcardMulti>
// state-specific transitions
type _wildcardMultiStart = Assert<Has<TWild, TransitionEvent<"idle", "running", "start", []>>>
type _wildcardMultiStop = Assert<Has<TWild, TransitionEvent<"running", "idle", "stop", []>>>
// wildcard transitions distributed over each concrete state
type _wildcardMultiResetFromIdle = Assert<Has<TWild, TransitionEvent<"idle", "idle", "reset", []>>>
type _wildcardMultiResetFromRunning = Assert<
	Has<TWild, TransitionEvent<"running", "idle", "reset", []>>
>

// InferTransitions: when state and wildcard define the same action with different targets,
// the type includes both. At runtime, state-specific handlers take priority (fsm.svelte.ts:22),
// so the wildcard target never fires — but the type conservatively over-approximates.
const wildcardOverlap = fsm("idle", {
	"*": { reset: "idle" },
	idle: { reset: "running", start: "running" },
	running: { stop: "idle" }
})
type TOverlap = InferTransitions<typeof wildcardOverlap>
// state-specific "reset" from idle targets "running"
type _overlapStateSpecific = Assert<Has<TOverlap, TransitionEvent<"idle", "running", "reset", []>>>
// wildcard "reset" also included for idle — over-approximation (at runtime, this never fires)
type _overlapWildcard = Assert<Has<TOverlap, TransitionEvent<"idle", "idle", "reset", []>>>
// wildcard "reset" from running is real (no state-specific override)
type _overlapWildcardReal = Assert<Has<TOverlap, TransitionEvent<"running", "idle", "reset", []>>>

// InferTransitions: string | void return should widen to States (conservative)
const validStringOrVoid = fsm("off", {
	off: {
		maybeTransition(): string | void {
			if (Math.random() > 0.5) return "on"
		},
		toggle: "on"
	},
	on: {
		toggle: "off"
	}
})
type TransitionsSV = InferTransitions<typeof validStringOrVoid>
// string|void action widens to States since string can't be narrowed
type _stringVoidWidens = Assert<
	Has<TransitionsSV, TransitionEvent<"off", "off" | "on", "maybeTransition", []>>
>

// InferTransitions: void actions are excluded from transitions
type TransitionsVoid = InferTransitions<typeof validVoid>
type _voidActionExcluded = Assert<
	Equals<Has<TransitionsVoid, TransitionEvent<"off", "off" | "on", "doSomething", []>>, false>
>
type _voidMachineTransitions = Assert<
	Equals<
		TransitionsVoid,
		TransitionEvent<"off", "on", "toggle", []> | TransitionEvent<"on", "off", "toggle", []>
	>
>

// InferTransitions: undefined-returning actions are excluded from transitions
type TransitionsUndef = InferTransitions<typeof validUndefined>
type _undefActionExcluded = Assert<
	Equals<Has<TransitionsUndef, TransitionEvent<"off", "off" | "on", "doSomething", []>>, false>
>
type _undefMachineTransitions = Assert<
	Equals<
		TransitionsUndef,
		TransitionEvent<"off", "on", "toggle", []> | TransitionEvent<"on", "off", "toggle", []>
	>
>

// InferTransitions with pure string shorthand — should produce exact transition metadata
const tripleTest = fsm("a", {
	a: { go: "b" },
	b: { back: "a" }
})
type TT = InferTransitions<typeof tripleTest>
type _exactTransitions = Assert<
	Equals<TT, TransitionEvent<"a", "b", "go", []> | TransitionEvent<"b", "a", "back", []>>
>
