import { User } from './types.js';

function isTypeUser(body: any): body is User {
  return (
    typeof body === 'object' &&
    body !== null &&
    'username' in body &&
    'age' in body &&
    'hobbies' in body &&
    typeof body.username === 'string' &&
    typeof body.age === 'number' &&
    Array.isArray(body.hobbies) &&
    body.hobbies.every((hobby: any) => typeof hobby === 'string')
  );
}

export { isTypeUser };
