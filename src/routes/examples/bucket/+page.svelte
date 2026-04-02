<script lang="ts">
	import { fsm, type TransitionEvent } from "$lib/index.js"

	let events = $state<TransitionEvent[]>([])

	const max = 10

	let level = $state(0)
	let spillage = $state(0)

	let bucket = fsm("notFull", {
		"*": {
			empty() {
				level = 0
				spillage = 0
				return "notFull"
			},
			_enter(event) {
				events.push(event)
			}
		},
		notFull: {
			add(amount: number) {
				level += amount
				if (level === max) {
					return "full"
				} else if (level > max) {
					return "overflowing"
				}
			}
		},
		full: {
			add(amount: number) {
				level += amount
				return "overflowing"
			}
		},
		overflowing: {
			_enter() {
				spillage = level - max
				level = max
			},
			add(amount: number) {
				spillage += amount
			}
		}
	})
</script>

<p>max {max}</p>
<p>level {level}</p>
<p>spillage {spillage}</p>
<p>status {bucket.current}</p>

<button onclick={() => bucket.add(5)}>Add 5</button>
<button onclick={() => bucket.empty()}>Empty</button>

<ul>
	{#each events as event}
		<li>{JSON.stringify(event)}</li>
	{/each}
</ul>
