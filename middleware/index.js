const crypto = require('crypto');
const logger = require('../config/logger');

// Encryption and decryption functions
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); // Generate a random key for encryption

/**
 * Decrypts text encrypted with the encrypt function.
 *
 * @param {string} text - The encrypted text to decrypt.
 * @returns {string} The decrypted text.
 */
function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypts text using a random initialization vector.
 *
 * @param {string} text - The text to encrypt.
 * @returns {string} The encrypted text with the initialization vector prepended.
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16); // Generate a random initialization vector
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Middleware to retrieve the threadId from a cookie, decrypt it, and attach it to the request object.
 *
 * @param {import('express').Request} req - The request object.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function in the stack.
 */
function getThreadId(req, res, next) {
  const encryptedId = req.cookies.threadId; // Retrieve the encrypted threadId from the cookie
  let threadId;

  try {
    if (encryptedId) {
      logger.debug(`encryptedId: ${encryptedId}`);
      threadId = decrypt(encryptedId);
    }

    logger.debug(`threadId: ${threadId}`);
    req.threadId = threadId;

  } catch (error) {
    logger.error(JSON.stringify(error, null, 2));

  } finally {
    next();
  }
}

/**
 * Middleware to encrypt the threadId and set it in a cookie.
 *
 * @param {import('express').Request} req - The request object.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function in the stack.
 */
function setThreadId(req, res, next) {
  const { threadId } = req;

  if (threadId) {
    logger.debug(`req.threadId: ${threadId}`);

    try {
      const expirationDate = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
      const encryptedId = encrypt(threadId);

      logger.debug(`encryptedId: ${encryptedId}`);
      logger.debug(`expirationDate: ${(new Date(expirationDate)).toISOString()}`);
      res.cookie('threadId', encryptedId, { expires: expirationDate }); // Set the encrypted resourceId in a cookie

    } catch (error) {
      logger.error(JSON.stringify(error, null, 2));

    } finally {
      next();
    }
  }
}

module.exports = { getThreadId, setThreadId };
