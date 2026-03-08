import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const diff = body.diff

    if (!diff) {
      return Response.json(
        { error: "Git diff is required" },
        { status: 400 }
      )
    }

    const MAX_DIFF_LENGTH = 4000

    const trimmedDiff =
      diff.length > MAX_DIFF_LENGTH
        ? diff.slice(0, MAX_DIFF_LENGTH)
        : diff

const prompt = `
You are a senior software engineer.

Analyze the following git diff and generate a GitHub PR description.

Return the response strictly in JSON format like this:

{
  "summary": "...",
  "keyChanges": ["...", "..."],
  "testingSteps": ["...", "..."],
  "changelog": "..."
}

Git diff:
${trimmedDiff}
`

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "user", content: prompt }
      ],
    })

const content = completion.choices[0]?.message.content

if (!content || typeof content !== "string") {
  return Response.json(
    { error: "Empty response from OpenAI" },
    { status: 500 }
  );
}

let parsed

try {
  parsed = JSON.parse(content)
} catch {
  parsed = {
    summary: "Unable to parse AI response",
    keyChanges: [],
    testingSteps: [],
    changelog: ""
  }
}

return Response.json(parsed)

  } catch (error) {
    console.error(error)

    return Response.json(
      { error: "AI generation failed" },
      { status: 500 }
    )
  }
}
