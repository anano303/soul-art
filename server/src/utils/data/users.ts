import { Role } from '@/types/role.enum';
import { hashPassword } from '../password';

export const users = async () => [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: await hashPassword('123456'),
    role: Role.Admin,
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: await hashPassword('123456'),
    role: Role.User,
  },
  {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: await hashPassword('123456'),
    role: Role.Seller,
  },
];
