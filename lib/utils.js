'use strict';

const crypto = require('crypto');

module.exports = {
  md5: (str) => crypto.createHash('md5').update(str, 'utf8').digest('hex'),
  sha1: (str) => crypto.createHash('sha1').update(str, 'utf8').digest('hex'),
  base64: (str) => Buffer.from(str).toString('base64'),
  base64HmacSha1: (str, secret) => crypto.createHmac('sha1', secret).update(str, 'utf8').digest().toString('base64'),
};
