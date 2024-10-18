import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';
import http, { IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';
import { User } from './utils/types';
import { getUsers } from './modules/getUsers';
import { getParsedBody } from './modules/getParsedBody';
import { isTypeUser } from './utils/helpers';
import { isValidUserID } from './modules/isValidUserID';
import { v4 as uuidv4 } from 'uuid';

config();

const masterPort = process.env.PORT || '3000';

let users: User[] = [];

const numbOfCPUs = availableParallelism() - 1;

const workerPorts = Array.from(
  { length: numbOfCPUs },
  (_, i) => Number(masterPort) + 1 + i
);

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`);

  workerPorts.forEach((port) => cluster.fork({ WORKER_PORT: port }));

  let currentWorkerIndex = 0;

  http
    .createServer((req, res) => {
      const currPort: number = workerPorts[currentWorkerIndex];

      const requestToWorker = http.request(
        {
          port: currPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (resFromWorker) => {
          const statusCode = resFromWorker.statusCode ?? 500;
          console.log('code=', statusCode);
          res.writeHead(statusCode, resFromWorker.headers);
          resFromWorker.pipe(res);
        }
      );

      req.pipe(requestToWorker);

      currentWorkerIndex = (currentWorkerIndex + 1) % workerPorts.length;
    })
    .listen(masterPort, () => {
      console.log(`Server is running on port ${masterPort}`);
    });

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  const workerPort = process.env.WORKER_PORT;

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      console.log(`Request to worker on port ${workerPort}`);
      try {
        if (
          req.method === 'GET' &&
          (req.url === '/api/users' || req.url === '/api/users/')
        ) {
          getUsers(res, users);
        } else if (
          req.method === 'POST' &&
          (req.url === '/api/users' || req.url === '/api/users/')
        ) {
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
        } else if (req.method === 'GET' && req.url?.startsWith('/api/users/')) {
          const path = req.url;
          const userId = path.replace('/api/users/', '');
          if (isValidUserID(res, userId, users)) {
            const user = users.find((currUser) => currUser.id === userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));
          }
        } else if (req.method === 'PUT' && req.url?.startsWith('/api/users/')) {
          const path = req.url;
          const userId = path.replace('/api/users/', '');
          if (isValidUserID(res, userId, users)) {
            const userIndex = users.findIndex(
              (currUser) => currUser.id === userId
            );

            const body = await getParsedBody(req);

            if (isTypeUser(body)) {
              users[userIndex] = {
                id: userId,
                ...body,
              };

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(users[userIndex]));
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
        } else if (
          req.method === 'DELETE' &&
          req.url?.startsWith('/api/users/')
        ) {
          const path = req.url;
          const userId = path.replace('/api/users/', '');
          if (isValidUserID(res, userId, users)) {
            const userIndex = users.findIndex((user) => user.id === userId);
            if (userIndex !== -1) {
              users.splice(userIndex, 1);
              res.writeHead(204);
              res.end();
            }
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              message: `Such URL not found`,
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

  server.listen(workerPort, () => {
    console.log(`Server is running on port ${workerPort}`);
  });
}
