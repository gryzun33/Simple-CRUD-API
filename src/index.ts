import http, { IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';
import { User } from './utils/types.js';
import { getUsers } from './responses/responses.js';

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
  (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (req.method === 'GET' && req.url === '/users') {
        throw new Error('hey');
        getUsers(res, users);
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
