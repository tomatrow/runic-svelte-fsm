<script lang="ts">
	import { fsm, type TransitionEvent } from "$lib/index.js"

	let events = $state<TransitionEvent[]>([])

	let machine = fsm("off", {
		"*": {
			_enter(event) {
				events.push(event)
			}
		},
		on: {
			turnOff: "off",
			toggle() {
				return "off"
			}
		},
		off: {
			turnOn: "on",
			toggle() {
				return "on"
			}
		}
	})
</script>

<p>{machine.current}</p>

<button onclick={() => machine.toggle()}>toggle</button>
<button onclick={() => machine.turnOff()}>turn off</button>
<button onclick={() => machine.turnOn()}>turn on</button>
<button onclick={() => machine.toggle.debounce(1000)}>debounced toggle</button>
<button onclick={() => machine.turnOff.debounce(1000)}>debounced turn off</button>
<button onclick={() => machine.turnOn.debounce(1000)}>debounced turn on</button>

<ul>
	{#each events as event}
		<li>{JSON.stringify(event)}</li>
	{/each}
</ul>
