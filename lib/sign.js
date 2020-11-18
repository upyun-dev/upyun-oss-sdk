'use strict';

const _ = require('lodash');
const utils = require('./utils');

/**
 * generate head sign
 * @param {object} service Your service name
 * @param {string} method 请求方式，如：GET、POST、PUT、HEAD 等
 * @param {string} pathname - storage path on upyun server, e.g: /your/dir/example.txt
 * @param {string|null} contentMd5 - md5 of the file that will be uploaded
 */
function getHeaderSign(service, method = 'GET', pathname, contentMd5 = null) {
  const date = new Date().toGMTString();
  const sign = genSign(service, method, pathname, {
    date,
    contentMd5,
  });
  return {
    Authorization: sign,
    Date: date,
  };
}

/**
 * generate signature string which can be used in head sign or body sign
 * @param {object} service
 * @param {string} method 请求方式，如：GET、POST、PUT、HEAD 等
 * @param {string} pathname 请求路径
 * @param {{}} options - must include key is method, path
 * @param {string} options.policy
 * @param {string|Date} options.date 日期，格式为 GMT 格式字符串 (RFC 1123)，如 Wed, 29 Oct 2014 02:26:58 GMT
 * @param {string|undefined|null} options.contentMd5 请求体的 MD5 值，如果文件太大计算 MD5 不方便或请求体为空，可以为空
 */
function genSign(service, method, pathname, options = {}) {
  const data = [
    method,
    encodeURI(decodeURIComponent(pathname)),
  ];

  // optional params
  ['date', 'policy', 'contentMd5'].forEach(item => {
    if (options[item]) {
      data.push(options[item]);
    }
  });

  const sign = utils.base64HmacSha1(data.join('&'), service.password);
  return `UPYUN ${service.operatorName}:${sign}`;
}

/**
 * get policy and authorization for form api
 * @param {object} service
 * @param {object} params optional params @see http://docs.upyun.com/api/form_api/#_2
 */
function getPolicyAndAuthorization(service, params = {}) {
  params['service'] = service.serviceName;
  params['bucket'] = service.serviceName;
  if (_.isNil(params['save-key'])) {
    throw new Error('upyun - calculate body sign need save-key');
  }

  if (_.isNil(params['expiration'])) {
    // default 30 minutes
    params['expiration'] = parseInt(new Date() / 1000 + 30 * 60, 10);
  }

  const policy = utils.base64(JSON.stringify(params));
  const authorization = genSign(service, 'POST', `/${service.serviceName}`, {
    policy,
    contentMd5: params['content-md5'],
  });
  return {
    policy,
    authorization,
  };
}

module.exports = {
  genSign,
  getHeaderSign,
  getPolicyAndAuthorization,
};
