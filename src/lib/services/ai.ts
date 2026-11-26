// One AI service interface for every smart feature. OFF by default (AI_PROVIDER="off"):
// every feature then uses its plain-statistics fallback. With AI_PROVIDER="anthropic" and ANTHROPIC_API_KEY set,
// Claude only adds plain-English explanations and review summaries on top of the numbers.
import Anthropic from "@anthropic-ai/sdk";

export interface AIService {
  enabled: boolean;
  /** Explain some numbers to a restaurant owner in 2–4 simple sentences. null = AI off or failed. */
  explain(topic: string, data: unknown): Promise<string | null>;
  /** Summarise reviews into short key points. null = AI off or failed. */
  summarizeReviews(comments: string[]): Promise<string[] | null>;
}

class OffAI implements AIService {
  enabled = false;
  async explain() { return null; }
  async summarizeReviews() { return null; }
}

class ClaudeAI implements AIService {
  enabled = true;
  private client = new Anthropic();
  private model = process.env.AI_MODEL || "claude-opus-5-5";
  private async ask(system: string, user: string): Promise<string | null> {
    try {
      const res: any = await (this.client.beta.messages.create as any)({
        model: this.model, max_tokens: 1024, system,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        messages: [{ role: "user", content: user }],
      });
      if (res.stop_reason === "refusal") return null;
      const text = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
      return text || null;
    } catch (e) {
      console.error("AI request failed – using fallback", (e as Error).message);
      return null;
    }
  }
  explain(topic: string, data: unknown) {
    return this.ask("You help small restaurant owners in India understand their numbers. Write 2–4 short, plain sentences. No jargon, no markdown. Money is in rupees.", `${topic}\n\nData (JSON):\n${JSON.stringify(data).slice(0, 12000)}`);
  }
  async summarizeReviews(comments: string[]) {
    const t = await this.ask("Summarise restaurant customer reviews for the owner. Return 3–6 short bullet points, one per line starting with '- ', most important first. Mention what to fix.", comments.slice(0, 300).map((c) => `• ${c}`).join("\n"));
    return t ? t.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean) : null;
  }
}

let ai: AIService | null = null;
export function getAI(): AIService {
  if (!ai) ai = process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY ? new ClaudeAI() : new OffAI();
  return ai;
}
