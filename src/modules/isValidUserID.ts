import { ServerResponse } from 'http';
import { User } from '../utils/types';
import { validate } from 'uuid';

function isValidUserID(
  res: ServerResponse,
  userId: string,
  users: User[]
): boolean {
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

export { isValidUserID };
