<script lang="ts">
	import { fsm } from "$lib/index.js"

	let value = $state("")
	let error = $state<Error>()

	const form = fsm("entering", {
		entering: {
			submit: "submitting"
		},

		submitting: {
			_enter() {
				fetch("/examples/form/endpoint", { method: "POST", body: value })
					.then((response) => {
						if (response.ok) form.success()
						else throw new Error(response.statusText)
					})
					.catch(form.error)
			},

			success: "completed",

			error(newError: Error) {
				error = newError
				return "invalid"
			}
		},

		invalid: {
			input: "entering"
		},

		completed: {}
	})
</script>

<h1>Svelte FSM</h1>
<h2>Very Biased Survey</h2>

<form onsubmit={form.submit}>
	<label>
		What's your favorite web framework?
		<input bind:value oninput={form.input} />
	</label>
	<button type="submit" disabled={form.current !== "entering"}>Submit</button>
</form>

{#if form.current === "completed"}
	<div>Your response has been recorded!</div>
{/if}

{#if form.current === "invalid"}
	<div class="error">
		{error?.message}
		Modify value and try again.
	</div>
{/if}

<style>
	.error {
		color: red;
	}
</style>
