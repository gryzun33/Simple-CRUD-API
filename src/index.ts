import http, { IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';
import { User } from './utils/types.js';
import { getUsers } from './responses/responses.js';
import { isTypeUser } from './utils/helpers.js';
import { v4 as uuidv4, validate } from 'uuid';

config();

const PORT = process.env.PORT || 3000;

let users: User[] = [
  {
    id: '123',
    username: 'masha',
    age: 15,
    hobbies: ['11', '22', '33'],
  },
  {
    id: '124',
    username: 'masha',
    age: 15,
    hobbies: ['11', '22', '33'],
  },
];

const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!req.url || !req.url.startsWith('/users')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            message: `Such resource not found. Please check the URL`,
          })
        );
      }

      if (req.method === 'GET' && req.url === '/users') {
        getUsers(res, users);
      } else if (req.method === 'POST' && req.url === '/users') {
        const body = await getParsedBody(req);

        if (isTypeUser(body)) {
          const newUser: User = {
            id: uuidv4(),
            ...body,
          };
          users.push(newUser);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newUser));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              message:
                'Request body does not contain the required fields or types of the fields do not match the expectations.',
            })
          );
        }
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          message:
            'Oops! There was an error on the server. Please try again later.',
        })
      );
    }
  }
);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function getParsedBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(JSON.parse(body));
    });
  });
}
