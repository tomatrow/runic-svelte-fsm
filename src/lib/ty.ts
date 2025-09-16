type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type ExtractObjectValues<Object> = Object[keyof Object]
type GetStates<EventMapByStates> = Exclude<keyof EventMapByStates, "*">
type GetEvents<EventMapByStates> = null

export type LifecycleAction = (meta: {
	from: string | null
	to: string
	event: string | null
	args: unknown[]
}) => void

type AddDebounceToFn<F> =
	F extends (...args: infer A) => infer R ?
		((...args: A) => R) & { debounce: (time: number, ...args: A) => R }
	:	never

type MapMethods<T> = {
	[K in GetStates<T>]: T[K] extends Function ? AddDebounceToFn<T[K]>
	: T[K] extends string ? AddDebounceToFn<() => T[K]>
	: never
}

// distribute MapMethods over a union of object-types
type MapMethodsOverUnion<T> = T extends any ? MapMethods<T> : never

// convert the mapped union back into an intersection (so same-property names are merged into overloads)
type MapOverloadsFromUnion<TUnion> = UnionToIntersection<MapMethodsOverUnion<TUnion>>

type StateMachine<EventMapByStates> = MapOverloadsFromUnion<
	ExtractObjectValues<EventMapByStates>
> & {
	readonly current: GetStates<EventMapByStates>
}

type BaseEventMapByStates = Record<
	string,
	Record<string, string | ((...args: any[]) => string | void)> & {
		_enter?: LifecycleAction
		_exit?: LifecycleAction
	}
>

function fsm<EventMapByStates extends BaseEventMapByStates>(
	initialStatus: GetStates<EventMapByStates>,
	input: EventMapByStates
): StateMachine<EventMapByStates> {
	return null as any
}

let machine = fsm("on", {
	on: {
		toggle: "off",
		overloaded(one: number) {
			return "off"
		},
		halfString(value: number) {
			return "off"
		},
		_enter(meta) {},
		_exit(meta) {}
	},
	off: {
		toggle: "on",
		overloaded(one: string, two: number) {
			return "on"
		},
		halfString: "on"
	},
	"*": {
		_enter(meta) {}
	}
})

machine._enter
machine.toggle
machine.toggle.debounce
let x = machine.overloaded("", 2)
machine.overloaded.debounce
machine.halfString
machine.halfString.debounce
