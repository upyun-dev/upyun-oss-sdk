'use strict';

const _ = require('lodash');
const r = require('request');
const path = require('path');
const rp = require('request-promise');

const sign = require('./sign');

/**
 * @param {String} endpoint
 * @param {Object} service instance of upyunService
 * @param {Function} getHeaderSign
 * @return {function(*=, *=, *=): any}
 */
module.exports = function (endpoint, service, getHeaderSign = sign.getHeaderSign) {
  if (!endpoint || !service) {
    throw new Error('endpoint, service 参数必填');
  }

  /**
   * @param {String} pathname
   * @param {Object} options
   * @param {String} [options.method] http method, default is GET
   * @param {Object} [options.headers]
   * @param {Boolean} [options.json]
   * @param {Boolean} isAsync 是否使用异步方式调用
   * @return {Promise<*>}
   */
  return function (pathname, options = {}, isAsync = true) {
    pathname = decodeURIComponent(pathname);
    pathname = path.join('/', pathname);
    pathname = encodeURI(pathname);

    const url = endpoint + pathname;
    const method = options.method || 'GET';
    options = _.omit(options, ['method']);

    const defaultProps = {
      url,
      method,
      headers: getHeaderSign(service, method, pathname),
    };
    const props = _.merge(defaultProps, options);

    return isAsync ? rp(props) : r(props);
  };
};
