import http, { IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';
import { User } from './utils/types';
import { getUsers } from './responses/responses';
import { isTypeUser } from './utils/helpers';
import { v4 as uuidv4, validate } from 'uuid';

config();

const PORT = process.env.PORT || 3000;

let users: User[] = [];

const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    try {
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
      } else if (req.method === 'GET' && req.url?.startsWith('/users/')) {
        const path = req.url;
        const userId = path.replace('/users/', '');
        if (isValid(res, userId)) {
          const user = users.find((currUser) => currUser.id === userId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(user));
        }
      } else if (req.method === 'PUT' && req.url?.startsWith('/users/')) {
        const path = req.url;
        const userId = path.replace('/users/', '');
        if (isValid(res, userId)) {
          const user = users.find((currUser) => currUser.id === userId);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(user));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            message: `Such resource not found. Please check the URL`,
          })
        );
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

function isValid(res: ServerResponse, userId: string): boolean {
  const userIds = users.map((user) => user.id);

  if (!validate(userId)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: `UserId is not valid`,
      })
    );
    return false;
  } else if (!userIds.some((el) => el === userId)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        message: `User with such id doesn't exist`,
      })
    );
    return false;
  }

  return true;
}
