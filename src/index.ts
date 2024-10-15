import http from 'http';
import { config } from 'dotenv';

config();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello!\n');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
