import request from 'supertest';
import { server } from '../index';
import { validate } from 'uuid';

afterAll((done) => {
  server.close(done);
});

let userId = '';

const user = {
  username: 'Masha',
  age: 30,
  hobbies: ['books', 'singing', 'sport'],
};

describe('get Users', () => {
  it('request GET /api/users should return empty array ', async () => {
    const response = await request(server).get('/api/users');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });
});

describe('create User', () => {
  it('should create a new user with a valid UUID', async () => {
    const response = await request(server).post('/api/users').send(user);

    userId = response.body.id;

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      ...user,
    });
    expect(validate(response.body.id)).toBe(true);
  });
});

describe('get User', () => {
  it('should return the user by ID', async () => {
    const response = await request(server).get(`/api/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: userId,
      ...user,
    });
  });
});

describe('update User', () => {
  it('should update the user by ID', async () => {
    const updatedUser = {
      username: 'Masha',
      age: 30,
      hobbies: ['swimming'],
    };

    const response = await request(server)
      .put(`/api/users/${userId}`)
      .send(updatedUser);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: userId,
      ...updatedUser,
    });
  });
});

describe('get non-existent user', () => {
  it('should return 404 for a non-existent user', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174111';

    const response = await request(server).get(`/api/users/${id}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: `User with such id doesn't exist`,
    });
  });
});
