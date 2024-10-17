import { IncomingMessage } from 'http';

function getParsedBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(JSON.parse(body));
    });
  });
}

export { getParsedBody };
