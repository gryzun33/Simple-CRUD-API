import { User } from '../utils/types.js';
import { ServerResponse } from 'http';

function getUsers(res: ServerResponse, users: User[]) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(users));
}

export { getUsers };
