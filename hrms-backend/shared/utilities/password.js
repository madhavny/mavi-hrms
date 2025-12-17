import bcrypt from 'bcrypt';
import logger from './logger.js';

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Invalid password provided');
    }

    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

export async function comparePassword(plainPassword, hashedPassword) {
  try {
    if (!plainPassword || !hashedPassword) {
      return false;
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    return false;
  }
}

export function isPasswordHashed(password) {
  return password && /^\$2[aby]\$\d{2}\$.{53}$/.test(password);
}