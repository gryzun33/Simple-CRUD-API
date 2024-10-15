import { sum } from './module-one.js';
console.log('Hello!');

type User = {
  id: string;
  name: string;
};

const user: User = {
  id: '12345',
  name: 'Olga',
};

console.log(user);
console.log('sum=', sum(1, 2));
