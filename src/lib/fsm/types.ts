export type BaseState = string | symbol

export type BaseAction = string

export type BaseStates<State extends BaseState = BaseState> = Record<State, BaseActions>

export type Args = any[]

export type LifecycleAction = (arg: {
	from: BaseState | null
	to: BaseState
	event: BaseAction | null
	args: Args
}) => void

export type AllArgsAction = (...args: Args) => BaseState

export type VoidFunction = (...args: Args) => void

export type ActionFunction = BaseState | AllArgsAction | VoidFunction

export type BaseActions = {
	[key: BaseAction]: ActionFunction
} & {
	_enter?: LifecycleAction
	_exit?: LifecycleAction
}

export type DetectFallBackState<State extends BaseState> = State extends "*" ? string : State

export type ExtractStates<States extends BaseStates> = DetectFallBackState<
	Exclude<keyof States, number>
>

export type ExtractObjectValues<Object> = Object[keyof Object]

export type GetActionFunctionMapping<Actions extends BaseActions> = {
	[Key in Exclude<keyof Actions, "_enter" | "_exit">]: Actions[Key] extends BaseState ?
		() => Actions[Key] extends void ? BaseState : Actions[Key]
	: Actions[Key] extends VoidFunction ? (...args: Parameters<Actions[Key]>) => BaseState
	: Actions[Key]
}

export type GetActionMapping<States extends BaseStates> = ExtractObjectValues<{
	[Key in keyof States]: GetActionFunctionMapping<States[Key]>
}>

export type ExtractActions<States extends BaseStates> = GetActionMapping<States>

export type StateMachine<State extends BaseState, Actions> = {
	[Key in keyof Actions]: (Actions[Key] | AllArgsAction) & {
		debounce: Actions[Key] extends VoidFunction ?
			(time: number, ...args: Parameters<Actions[Key]>) => Promise<BaseState>
		:	(time: number) => Promise<BaseState>
	}
} & {
	readonly current: State
}

export type UnionToIntersection<U> =
	(U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type FSM = <Sts extends Readonly<BaseStates>, S extends ExtractStates<Sts>>(
	state: S,
	states: Sts
) => StateMachine<ExtractStates<Sts>, UnionToIntersection<ExtractActions<Sts>>>
