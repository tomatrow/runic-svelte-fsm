<script lang="ts">
	import { fsm, type TransitionEvent } from "$lib/index.js"

	let events = $state<TransitionEvent[]>([])

	let machine = fsm("green", {
		green: {
			_enter(event) {
				// this is the edgiest of cases
				// _enter is called on green right before machine in initialized
				function change() {
					machine.change.debounce(2000)
				}
				if (event.from === null) queueMicrotask(change)
				else change()
				events.push(event)
			},
			change: "yellow"
		},
		yellow: {
			_enter(event) {
				machine.change.debounce(500)
				events.push(event)
			},
			change: "red"
		},
		red: {
			_enter(event) {
				machine.change.debounce(2000)
				events.push(event)
			},
			change: "green"
		}
	})
</script>

<p>{machine.current}</p>

<ul>
	{#each events as event}
		<li>{JSON.stringify(event)}</li>
	{/each}
</ul>
