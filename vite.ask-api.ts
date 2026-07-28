/**
 * Dev middleware stub for /api/ask when using Vite alone.
 * Full Ask needs `npm run pages:dev` with provider keys in .dev.vars.
 */
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function askApiDevPlugin(): Plugin {
  return {
    name: 'babywise-ask-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';

        if (url === '/api/ask' && req.method === 'GET') {
          json(res, 200, {
            ok: true,
            providers: ['gemini', 'openai', 'grok', 'claude'],
            available: [],
            default: 'gemini',
            note: 'Vite-only stub — run pages:dev for real providers.',
          });
          return;
        }

        if (url === '/api/ask' && req.method === 'POST') {
          await readBody(req);
          json(res, 503, {
            ok: false,
            error:
              'Ask needs Cloudflare Pages Functions + AI API keys. Run: npm run pages:dev (see docs/DEPLOY.md).',
            code: 'provider_not_configured',
          });
          return;
        }

        next();
      });
    },
  };
}
