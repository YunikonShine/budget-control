import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OpenAIEmbeddings } from '@langchain/openai';
import { prisma } from '@repo/db';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    model: process.env.EMBEDDINGS_MODEL!,
  });

  async generateAndSave(cardId: string, text: string) {
    if (!text || text.trim().length === 0) return;

    try {
      const [vector] = await this.embeddings.embedDocuments([text]);
      const id = randomUUID();

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "CardEmbedding" ("id", "cardId", "vector", "text")
        VALUES ($1, $2, $3::vector, $4)
        ON CONFLICT ("cardId") DO UPDATE
          SET "vector" = EXCLUDED."vector",
              "text" = EXCLUDED."text",
              "updatedAt" = now();
        `,
        id,
        cardId,
        vector,
        text,
      );
      this.logger.log(`Embedding atualizado para card ${cardId}`);
    } catch (err) {
      this.logger.error('Erro ao gerar embedding', err);
    }
  }

  async semanticSearch(query: string, limit = 5) {
    const [queryVector] = await this.embeddings.embedDocuments([query]);
    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "cardId", "text",
             (1 - ("vector" <=> '${JSON.stringify(queryVector)}'::vector)) AS similarity
      FROM "CardEmbedding"
      ORDER BY "vector" <=> '${JSON.stringify(queryVector)}'::vector
      LIMIT ${limit};
    `);
    return results;
  }
}
