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
import fs from 'fs/promises';
import path from 'path';

config();

interface Message {
  type: 'sendUsers' | 'requestUsers' | 'updateUsers';
  users?: User[];
}

const masterPort = process.env.PORT || '3000';

const numbOfCPUs = availableParallelism() - 1;

let users: User[] = [];

const workerPorts = Array.from(
  { length: numbOfCPUs },
  (_, i) => Number(masterPort) + 1 + i
);

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`);

  workerPorts.forEach((port) => cluster.fork({ WORKER_PORT: port }));

  cluster.on('message', (worker, message: Message) => {
    if (message.type === 'requestUsers') {
      worker.send({ type: 'sendUsers', users });
    } else if (message.type === 'updateUsers' && message.users) {
      users = [...message.users];
    }
  });

  let currentWorkerIndex = 0;

  const mainserver = http.createServer((req, res) => {
    try {
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
          res.writeHead(statusCode, resFromWorker.headers);
          resFromWorker.pipe(res);
        }
      );

      req.pipe(requestToWorker);

      currentWorkerIndex = (currentWorkerIndex + 1) % workerPorts.length;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          message:
            'Oops! There was an error on the server. Please try again later.',
        })
      );
    }
  });

  mainserver.listen(masterPort, () => {
    console.log(`Server is running on port ${masterPort}`);
  });

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  const workerPort = process.env.WORKER_PORT;
  let workerUsers: User[] = [];

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      console.log(`Request to worker on port ${workerPort}`);

      try {
        workerUsers = await updateUsers();
        if (
          req.method === 'GET' &&
          (req.url === '/api/users' || req.url === '/api/users/')
        ) {
          getUsers(res, workerUsers);
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
            workerUsers.push(newUser);

            if (process.send) {
              process.send({ type: 'updateUsers', users: workerUsers });
            }

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
          if (isValidUserID(res, userId, workerUsers)) {
            const user = workerUsers.find((currUser) => currUser.id === userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));
          }
        } else if (req.method === 'PUT' && req.url?.startsWith('/api/users/')) {
          const path = req.url;
          const userId = path.replace('/api/users/', '');
          if (isValidUserID(res, userId, workerUsers)) {
            const userIndex = workerUsers.findIndex(
              (currUser) => currUser.id === userId
            );

            const body = await getParsedBody(req);

            if (isTypeUser(body)) {
              workerUsers[userIndex] = {
                id: userId,
                ...body,
              };

              if (process.send) {
                process.send({ type: 'updateUsers', users: workerUsers });
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(workerUsers[userIndex]));
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
          if (isValidUserID(res, userId, workerUsers)) {
            const userIndex = workerUsers.findIndex(
              (user) => user.id === userId
            );
            if (userIndex !== -1) {
              workerUsers.splice(userIndex, 1);

              if (process.send) {
                process.send({ type: 'updateUsers', users: workerUsers });
              }

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

  function updateUsers() {
    return new Promise<User[]>((resolve) => {
      if (process.send) {
        process.send({ type: 'requestUsers' });
      }

      process.once('message', (message: Message) => {
        if (message.type === 'sendUsers' && message.users) {
          workerUsers = message.users;
          resolve(workerUsers);
        }
      });
    });
  }
}
