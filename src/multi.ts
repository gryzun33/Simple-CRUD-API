import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';
import http from 'http';
import { config } from 'dotenv';
import { User } from './utils/types';
import path from 'path';

config();

interface Message {
  type: 'sendUsers' | 'requestUsers' | 'updateUsers';
  users?: User[];
}

const masterPort = process.env.PORT;

const pathToWorker = path.resolve(__dirname, 'worker.ts');

const numbOfCPUs = availableParallelism() - 1;

let users: User[] = [];

const workerPorts = Array.from(
  { length: numbOfCPUs },
  (_, i) => Number(masterPort) + 1 + i
);

console.log(`Master process ${process.pid} is running`);

cluster.setupPrimary({
  exec: pathToWorker,
});

workerPorts.forEach((port) => cluster.fork({ WORKER_PORT: port }));

cluster.on('message', (worker, message: Message) => {
  if (message.type === 'requestUsers') {
    worker.send({ type: 'sendUsers', users });
  } else if (message.type === 'updateUsers' && message.users) {
    users = [...message.users];
  }
});

let currentWorkerIndex = 0;

const server = http.createServer((req, res) => {
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

server.listen(masterPort, () => {
  console.log(`Server is running on port ${masterPort}`);
});

cluster.on('exit', (worker) => {
  console.log(`Worker ${worker.process.pid} died`);
});

export { server };
