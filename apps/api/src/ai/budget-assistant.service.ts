import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { EmbeddingsService } from './embeddings.service';

@Injectable()
export class AiBudgetAssistantService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  constructor(private readonly embeddingsService: EmbeddingsService) {}

  async suggestBudget(description: string) {
    const similar = await this.embeddingsService.semanticSearch(description, 5);
    const context = similar.map((x) => `- ${x.text}`).join('\n');

    const prompt = `
        Você é um assistente que cria orçamentos de projetos.
        Descrição do novo projeto:
        ${description}

        Projetos semelhantes:
        ${context}

        Gere um orçamento resumido em formato JSON:
        {
        "estimativa_tempo_dias": number,
        "estimativa_custo": number,
        "recursos_necessarios": string[]
        }
    `;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return completion.choices[0].message.content;
  }
}
