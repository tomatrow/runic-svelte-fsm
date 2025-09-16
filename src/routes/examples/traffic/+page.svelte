<script lang="ts">
	import { fsm, type LifecycleMeta } from "$lib/index.js"

	let metas = $state<LifecycleMeta[]>([])

	let machine = fsm("green", {
		green: {
			_enter(meta) {
				// this is the edgiest of cases
				// _enter is called on green right before machine in initialized
				function change() {
					machine.change.debounce(2000)
				}
				if (meta.from === null) queueMicrotask(change)
				else change()
				metas.push(meta)
			},
			change: "yellow"
		},
		yellow: {
			_enter(meta) {
				machine.change.debounce(500)
				metas.push(meta)
			},
			change: "red"
		},
		red: {
			_enter(meta) {
				machine.change.debounce(2000)
				metas.push(meta)
			},
			change: "green"
		}
	})
</script>

<p>{machine.current}</p>

<ul>
	{#each metas as meta}
		<li>{JSON.stringify(meta)}</li>
	{/each}
</ul>
