import { handleSignatureWebhook } from '../handler';

export async function POST(request: Request) {
  return handleSignatureWebhook(request);
}
