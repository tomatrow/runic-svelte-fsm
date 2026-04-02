type UnionToIntersection<U> =
	(U extends U ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type HookKeys = "_enter" | "_exit"

type MapActionToInvoker<Fn, States> =
	Fn extends (...args: infer A) => infer _ ?
		((...args: A) => States) & {
			debounce: (time: number | null | undefined, ...args: A) => Promise<States>
		}
	:	never

type MapActionsToInvokers<ActionMap, States> = {
	[ActionKey in Exclude<keyof ActionMap, HookKeys>]: ActionMap[ActionKey] extends Function ?
		MapActionToInvoker<ActionMap[ActionKey], States>
	: ActionMap[ActionKey] extends string ? MapActionToInvoker<() => States, States>
	: never
}

type MapMethodsOverUnion<ActionMapUnion, States> =
	ActionMapUnion extends ActionMapUnion ? MapActionsToInvokers<ActionMapUnion, States> : never

export type StateMachine<States, ActionMapByStates> = UnionToIntersection<
	MapMethodsOverUnion<ActionMapByStates[keyof ActionMapByStates], States>
> & {
	/** The current active state of the state machine. */
	get current(): States
	/** For type checking capabilities only. Does not exist at runtime. DO NOT USE! */
	readonly "~types": { states: States; actionMap: ActionMapByStates }
}

export type TransitionEvent<
	From extends string | null = string | null,
	To extends string = string,
	Action extends string | null = string | null,
	Args extends unknown[] = unknown[]
> = { from: From; to: To; action: Action; args: Args }

type BaseActionMapByStates = Record<
	string,
	Record<string, string | ((...args: any[]) => string | void)> & {
		_enter?(event: TransitionEvent): void
		_exit?(event: TransitionEvent): void
	}
>

type ExtractStates<ActionMapByStates> = Exclude<string & keyof ActionMapByStates, "*">

type ValidateAction<Action, States extends string> =
	Action extends (...args: any[]) => any ? Action
	: Action extends string ?
		Action extends States ?
			Action
		:	States
	:	Action

type StrictActions<Actions, States extends string> = {
	[K in keyof Actions]: K extends HookKeys ? Actions[K] : ValidateAction<Actions[K], States>
}

type StrictActionMapByStates<T extends BaseActionMapByStates> = {
	[K in keyof T]: StrictActions<T[K], ExtractStates<T>>
}

export type FSM = <ActionMapByStates extends BaseActionMapByStates>(
	initialState: ExtractStates<ActionMapByStates>,
	actionMapByStates: ActionMapByStates & StrictActionMapByStates<ActionMapByStates>
) => StateMachine<ExtractStates<ActionMapByStates>, ActionMapByStates>

type ActionArgs<ActionValue> = ActionValue extends (...args: infer A) => any ? A : []

type ActionTarget<ActionValue, States extends string> =
	ActionValue extends States ? ActionValue
	: ActionValue extends (...args: any[]) => infer R ?
		[Extract<R, States>] extends [never] ?
			[Extract<R, string>] extends [never] ?
				never
			:	States
		:	Extract<R, States>
	:	States

type StateTransitions<From extends string, Config, States extends string> = {
	[A in Exclude<keyof Config, HookKeys> & string]: [ActionTarget<Config[A], States>] extends (
		[never]
	) ?
		never
	:	TransitionEvent<From, ActionTarget<Config[A], States>, A, ActionArgs<Config[A]>>
}[Exclude<keyof Config, HookKeys> & string]

export type InferTransitions<M> =
	M extends { "~types": { states: infer S extends string; actionMap: infer E } } ?
		{
			[K in S]:
				| (K extends keyof E ? StateTransitions<K, E[K], S> : never)
				| ("*" extends keyof E ? StateTransitions<K, E[Extract<"*", keyof E>], S> : never)
		}[S]
	:	never

export type InferStates<M> = M extends { "~types": { states: infer S } } ? S : never
