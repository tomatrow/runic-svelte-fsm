import { error, text } from "@sveltejs/kit"
import type { RequestHandler } from "./$types.js"

export const POST = async function ({ request }) {
	const bodyText = await request.text()

	if (bodyText !== "svelte") error(400, "invalid answer")

	return text("success")
} satisfies RequestHandler
