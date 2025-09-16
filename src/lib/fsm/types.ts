type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type ExtractObjectValues<Object> = Object[keyof Object]

type MapActionToInvoker<Fn, States> =
	Fn extends (...args: infer A) => infer _ ?
		((...args: A) => States) & {
			debounce: (time: number | null | undefined, ...args: A) => Promise<States>
		}
	:	never

type MapActionsToInvokers<ActionMap, States> = {
	[ActionKey in Exclude<keyof ActionMap, "_enter" | "_exit">]: ActionMap[ActionKey] extends (
		Function
	) ?
		MapActionToInvoker<ActionMap[ActionKey], States>
	: ActionMap[ActionKey] extends string ? MapActionToInvoker<() => States, States>
	: never
}

type MapMethodsOverUnion<ActionMapUnion, States> =
	ActionMapUnion extends any ? MapActionsToInvokers<ActionMapUnion, States> : never

export type StateMachine<States, EventMapByStates> = UnionToIntersection<
	MapMethodsOverUnion<ExtractObjectValues<EventMapByStates>, States>
> & { get current(): States }

export type LifecycleMeta = {
	from: string | null
	to: string
	event: string | null
	args: unknown[]
}

export type BaseEventMapByStates = Record<
	string,
	Record<string, string | ((...args: any[]) => string | void)> & {
		_enter?(meta: LifecycleMeta): void
		_exit?(meta: LifecycleMeta): void
	}
>

export type ExtractStates<EventMapByStates> = Exclude<string & keyof EventMapByStates, "*">

export type FSM = <
	EventMapByStates extends BaseEventMapByStates,
	States extends ExtractStates<EventMapByStates>
>(
	initialState: States,
	eventMapByStates: EventMapByStates
) => StateMachine<ExtractStates<EventMapByStates>, EventMapByStates>
