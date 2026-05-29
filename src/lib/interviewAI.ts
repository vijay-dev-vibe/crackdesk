// src/lib/interviewAI.ts

interface CallInterviewAIParams {
  action: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

export async function callInterviewAI({
  systemPrompt,
  userMessage,
  maxTokens,
}: CallInterviewAIParams): Promise<string> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // or any OpenRouter model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('AI API Error:', errorData);
      throw new Error(
        errorData.error?.message || errorData.error || `API request failed: ${response.status}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from AI');
    }

    return content;
  } catch (error) {
    console.error('Interview AI Error:', error);
    throw error;
  }
}

// Helper function to parse AI JSON responses
export function parseAIJson(text: string): any {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI JSON:', error);
    console.error('Raw text:', text);

    // Try to extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fall through to return error object
      }
    }

    // Return a fallback object
    return {
      error: true,
      message: 'Failed to parse response',
      raw: text,
    };
  }
}