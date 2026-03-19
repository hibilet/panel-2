const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3.1-flash-lite-preview";

/**
 * Sends a prompt to OpenRouter and returns the model response.
 * @param {Object} options
 * @param {string} options.systemPrompt - System message (master prompt)
 * @param {string} options.userPrompt - User message
 * @param {string} [options.model] - Model ID (default: minimax/minimax-m2)
 * @returns {Promise<string>} The content of the assistant's response
 */
export async function chatCompletion({ systemPrompt, userPrompt, model = DEFAULT_MODEL }) {
	const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error("VITE_OPENROUTER_API_KEY is not configured");
	}

	const res = await fetch(OPENROUTER_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
		}),
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err?.error?.message ?? res.statusText ?? "OpenRouter request failed");
	}

	const data = await res.json();
	const content = data?.choices?.[0]?.message?.content ?? "";
	return content;
}
