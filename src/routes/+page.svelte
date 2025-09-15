<script lang="ts">
	import { fsm } from "$lib/index.js"

	let machine = fsm("off", {
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
<button onclick={machine.toggle}>toggle</button>
