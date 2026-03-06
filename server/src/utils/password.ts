import * as argon2 from 'argon2';

// Use 2^14 (16 MiB) in production to avoid RAM spikes; 2^16 (64 MiB) per hash
// can cause high memory usage with concurrent logins on small instances (e.g. DO).
const ARGON2_MEMORY_COST = process.env.ARGON2_MEMORY_COST
  ? parseInt(process.env.ARGON2_MEMORY_COST, 10)
  : 2 ** 14;

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyPassword = async (
  hashedPassword: string,
  plainPassword: string,
): Promise<boolean> => {
  try {
    return await argon2.verify(hashedPassword, plainPassword);
  } catch {
    return false;
  }
};
