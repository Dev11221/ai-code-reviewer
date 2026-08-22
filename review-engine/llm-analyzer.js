const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// This function sends a code diff to Gemini and asks it to review it
async function analyzeDiff(diff) {
  const prompt = `
You are an expert code reviewer. Review the following git diff and identify:
1. Bugs or logic errors
2. Security vulnerabilities or loopholes
3. Code quality issues (naming, structure, readability)

For each issue found, respond in this exact format:
- File: <filename>
- Severity: <blocking | warning | nitpick>
- Issue: <short description>
- Suggestion: <how to fix it>

If no issues are found, respond with: "No issues found."

Here is the diff:
${diff}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });

  return response.text;
}

module.exports = { analyzeDiff };