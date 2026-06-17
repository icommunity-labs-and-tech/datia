import type { ChatMessage } from '../openai/types';
import { OpenAIConfigError, OpenAIHTTPError, OpenAIResponseParseError, OpenAIRateLimitError } from '../openai/errors';

export interface OpenAIService {
  chatComplete(args: {
    model: string;
    messages: ReadonlyArray<ChatMessage>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string }>;

  fillItemFields(args: {
    itemName: string;
    itemDescription?: string | null;
    fields: Array<{ name: string; label: string; type: string }>;
  }): Promise<Record<string, unknown>>;
}

function buildPrompt(itemName: string, itemDescription: string | null | undefined, fields: Array<{ name: string; label: string; type: string }>): string {
  return `Eres un asistente especializado en completar información técnica de productos y equipos industriales.

Basándote en el nombre y descripción del item proporcionados, busca información actualizada en internet y completa los siguientes campos:

NOMBRE DEL ITEM: "${itemName}"
DESCRIPCIÓN: "${itemDescription || 'No proporcionada'}"

CAMPOS A COMPLETAR:
${fields.map(field => `- ${field.label} (${field.name}): ${field.type}`).join('\n')}

INSTRUCCIONES:
1. Busca información específica y actualizada sobre este producto/equipo
2. Completa SOLO los campos que puedas encontrar información confiable
3. Para campos de tipo 'select', elige la opción más apropiada de las disponibles
4. Para campos numéricos, proporciona valores reales y específicos
5. Para campos de texto, sé conciso pero informativo
6. NO inventes información si no estás seguro
7. Si un campo es muy específico o técnico, déjalo vacío

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido que contenga los campos completados. Ejemplo:
{
  "campo1": "valor1",
  "campo2": "valor2",
  "campo3": ""
}

NO incluyas explicaciones adicionales, solo el JSON.`;
}

export function createOpenAIService(): OpenAIService {
  return {
    async chatComplete({ model, messages, temperature, maxTokens }): Promise<{ content: string }> {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw new OpenAIConfigError('OPENAI_API_KEY is not configured');
      }

      let res: Response;
      try {
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: temperature ?? 0.3,
            max_tokens: maxTokens ?? 1500,
          }),
        });
      } catch (e) {
        throw new OpenAIHTTPError(0, 'Network error', String(e));
      }

      if (res.status === 429) {
        throw new OpenAIRateLimitError('Rate limited by OpenAI');
      }

      if (!res.ok) {
        let body = '';
        try {
          body = await res.text();
        } catch {
          // Ignore
        }
        throw new OpenAIHTTPError(res.status, res.statusText, body);
      }

      let data: any;
      try {
        data = await res.json();
      } catch (e) {
        throw new OpenAIResponseParseError('Invalid JSON from OpenAI', String(e));
      }

      const content = data?.choices?.[0]?.message?.content as string | undefined;
      if (!content) {
        throw new OpenAIResponseParseError('Missing message content');
      }

      return { content };
    },

    async fillItemFields({ itemName, itemDescription, fields }): Promise<Record<string, unknown>> {
      const prompt = buildPrompt(itemName, itemDescription ?? null, fields);
      const completion = await this.chatComplete({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Eres un asistente especializado en completar información técnica de productos industriales. Responde siempre con JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 1500,
      });

      const match = completion.content.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new OpenAIResponseParseError('No JSON found in AI response', completion.content);
      }
      
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch (e) {
        throw new OpenAIResponseParseError('Invalid JSON in AI response', String(e));
      }
    },
  };
}

export const openAIService = createOpenAIService();
