<script lang="ts">
	import { fsm, type LifecycleMeta } from "$lib/index.js"

	let metas = $state<LifecycleMeta[]>([])

	let machine = fsm("off", {
		"*": {
			_enter(meta) {
				metas.push(meta)
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
	{#each metas as meta}
		<li>{JSON.stringify(meta)}</li>
	{/each}
</ul>
