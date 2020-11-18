'use strict';
const _ = require('lodash');
const path = require('path');

const sign = require('./sign');
const utils = require('./utils');
const createReq = require('./create-req');

const delay = timeout => new Promise(_delay => setTimeout(_delay, timeout));
/**
 * 又拍云 oss 存储服务
 * @type {module.OssClient}
 */
module.exports = class OssClient {
  /**
   * 
   * @param {string} operatorName   账户
   * @param {string} password       密码
   * @param {string} type           存储类型
   * @param {string} serviceName    存储分区名称
   * @param {string} serviceHost    服务host
   * @param {string} apiSecret      文件秘钥
   * @param {object} params         其他参数
   */
  constructor(operatorName = '', password = '', type = 'oss', serviceName, serviceHost, apiSecret, params = {}) {
    const service = {operatorName, type, serviceName, serviceHost, apiSecret};
    if (type === 'knowledge') {
      service.password = password;
    } else {
      service.password = utils.md5(password);
    }
    const config = _.assign({
      domain: 'v0.api.upyun.com',
      protocol: 'http',
    }, params);

    this.service = service;
    this.endpoint = config.protocol + '://' + config.domain;
    this.req = createReq(this.endpoint, this.service, sign.getHeaderSign);
  }

  /**
   * @link http://docs.upyun.com/api/form_api/#_11
   * @param {Object} params
   * @param {Integer} params.expiration default is 30 minutes
   * @param {String} params['save-key'] default is /{filemd5}{.suffix}
   * @param {Integer} params['content-length']
   */
  getPolicyAndSignature(params = {}) {
    const secret = this.service.apiSecret;

    params['bucket'] = this.service.serviceName;
    params['save-key'] = path.join('/', params['save-key'] || '/{filemd5}{.suffix}');

    if (_.isNil(params['expiration'])) {
      params['expiration'] = parseInt(new Date() / 1000 + 30 * 60, 10);
    }

    const policy = utils.base64(JSON.stringify(params));
    const signature = utils.md5(policy + '&' + secret);

    return {
      policy,
      signature,
      file: params['save-key'],
      uploadUri: 'v0.api.upyun.com/' + this.service.serviceName,
      filePath: `https://${this.service.serviceHost}${params['save-key']}`,
    };
  }

/**
  * get policy and authorization for form api
  * @param {object} service
  * @param {object} params optional params @see http://docs.upyun.com/api/form_api/#_2
  */
  getPolicyAndAuthorization(params = {}) {
    const uploadUri = 'v0.api.upyun.com/' + this.service.serviceName;
    return {
      uploadUri,
      ...sign.getPolicyAndAuthorization(this.service, params),
      filepath: `https://${this.service.serviceHost}${params['save-key']}`,
    };
  }

  /**
   * 获取当前服务使用量，单位 byte
   * @return {Promise<String|Integer>}
   */
  async usage() {
    const pathname = path.join(this.service.serviceName, '?usage');
    return this.req(pathname, {json: true});
  }

  /**
   * 获取文件目录列表
   * @param {String} pathname
   * @param {Object} options
   * @param {Integer} options.limit 获取的文件数量，默认 100，最大 10000
   * @param {String} options.order asc 或 desc，按文件名升序或降序排列。默认 asc
   * @param {String} options.iter 分页开始位置，通过x-upyun-list-iter 响应头返回，所以第一次请求不需要填写
   * @return {Promise<Promise<*> | void | * | Bluebird<any> | Promise<any>>}
   */
  async listDir(pathname = '/', options = {}) {
    options = _.defaults(options, {limit: 100, order: 'asc', iter: ''});
    pathname = path.join('/', this.service.serviceName, pathname);
    const requestHeaders = {};

    requestHeaders['x-list-limit'] = options.limit;
    requestHeaders['x-list-order'] = options.order;
    requestHeaders['x-list-iter'] = options.iter;

    return this.req(pathname, {
      headers: requestHeaders,
      json: true,
    }).then((res) => {
      const next = _.get(res, 'iter');

      // files 有三种结构， object fill in array, empty object, undefined, 设 files 为空
      let files = _.get(res, 'files');
      if (_.isEmpty(files)) {
        files = [];
      }

      files = files.map(file => ({
        name: file.name,
        type: file.type,
        size: parseInt(file.length, 10),
        time: parseInt(file['last_modified'], 10) * 1000,
      }));

      return Promise.resolve({
        files,
        next,
      });
    }).catch((err) => {
      if (Number(err.statusCode) === 404) {
        return {
          files: [],
          next: 'g2gCZAAEbmV4dGQAA2VvZg',
        };
      }
      throw err;
    });
  }

  /**
   * 文件上传
   * @link https://help.upyun.com/knowledge-base/rest_api/#e4b88ae4bca0e69687e4bbb6
   * @param {string} [pathname] path to file, eg: '/shangzhibo/jinkela/feiliao.jpg'
   * @param file
   * @return {Promise<*>}
   */
  async putFile(pathname = '/', file) {
    pathname = '/' + this.service.serviceName + pathname;
    return this.req(pathname, {
      method: 'PUT',
      body: file,
    });
  }

  /**
   * 流文件上传
   * @param {string} [pathname] path to file, eg: '/shangzhibo/jinkela/feiliao.jpg'
   *
   * 使用示例:
   * ```js
   * fs.createReadStream(path.join(__dirname, 'file.mp4')).pipe(putStream('/file.mp4'));
   * ```
   */
  putStream(pathname) {
    pathname = '/' + this.service.serviceName + pathname;
    return this.req(pathname, {method: 'PUT'}, false);
  }

  /**
   * 检查文件是否存在
   * @param {string} pathname 
   */
  async isExistFile(pathname = '/') {
    pathname = path.join('/', this.service.serviceName, pathname);
    return this.req(pathname, {method: 'HEAD', json: true}).then((res) => {
      return res;
    }).catch(err => {
      if (Number(err.statusCode) === 404) {
        return false;
      }
      throw err;
    });
  }

  /**
   * 文件删除方法集大成者
   * @private
   * @param {String} pathname
   * @param {Object} options
   * @param {Boolean} options.isAsync 是否为异步删除
   * @param {Boolean} options.isFolder 是否为文件夹
   * @param {Integer} retry 重试次数, 默认是 3 次
   * @return {Promise<Promise<*> | void | * | Bluebird<any> | Promise<any>>}
   */
  async _delete(pathname, options = {}, retry = 3) {
    if (retry < 0) {
      return;
    }
    options = _.defaults(options, {isAsync: false, isFolder: false});
    let _pathname = pathname;
    _pathname = path.join('/', this.service.serviceName, _pathname);
    const headers = {};
    headers['x-upyun-async'] = options.isAsync;
    headers['x-upyun-folder'] = options.isFolder;

    return this.req(_pathname, {
      method: 'DELETE',
      headers,
      resolveWithFullResponse: true,
    }).then((res) => {
      return Number(res.statusCode) === 200;
    }).catch(err => {
      if (Number(err.statusCode) === 404) {
        return true;
      }

      // 遇到限频睡一会儿, 然后重试
      if (Number(err.statusCode) === 429 && retry > 0) {
        delay(4000);
        return this._delete(pathname, options, --retry);
      }

      // 在同步方式删除空文件夹时，偶发性的会出现删不掉的情况, 隔几秒重试一下即可
      if (options.isFolder && !options.isAsync && Number(err.statusCode) === 403 && retry > 0) {
        if (typeof err.error === 'string' && err.error.includes('directory not empty')) {
          delay(4000);
          return this._delete(pathname, options, --retry);
        }
        if (_.get(err, 'error.msg') === 'directory not empty') {
          delay(4000);
          return this._delete(pathname, options, --retry);
        }
      }

      if (Number(err.statusCode) > 500) {
        delay(4000);
        return this._delete(pathname, options, --retry);
      }
      throw err;
    });
  }

  /**
   * 文件删除
   * @param pathname
   * @param {Boolean} isAsync
   * @return {Promise<Promise<*>|void|*|Bluebird<any>|Promise<any>>}
   */
  async deleteFile(pathname, isAsync = false) {
    return this._delete(pathname, {isAsync});
  }

  /**
   * 删除空文件夹
   * @param {String} pathname
   * @param {Boolean} isAsync
   * FIXME: 异步删除时无法删除
   * @return {Promise<Promise<*>|void|*|Bluebird<any>|Promise<any>>}
   */
  async deleteEmptyDir(pathname, isAsync) {
    return this._delete(pathname, {isAsync, isFolder: true});
  }

  /**
   * 非空文件夹删除
   * @param {String} pathname
   * @param {Boolean} isAsync
   * @param {Undefined|String} next
   * @return {Promise<Promise<*>|void|*|Bluebird<any>|Promise<any>>}
   */
  async deleteDir(pathname, isAsync, next) {
    if (['', '/'].includes(_.trim(pathname))) {
      throw new Error('危险操作, 拒绝执行');
    }
    const list = await this.listDir(pathname, {iter: next});
    for (const file of list.files) {
      const fp = path.join(pathname, file.name);
      if (file.type === 'folder') {
        await this.deleteDir(fp, isAsync);
      } else {
        await this.deleteFile(fp, isAsync);
      }
    }
    if (list.next !== 'g2gCZAAEbmV4dGQAA2VvZg') {
      await this.deleteDir(pathname, isAsync, next);
    }
    return this.deleteEmptyDir(pathname, isAsync);
  }

  /**
   * 文件下载
   * @param {string} pathname 文件路径，以 / 开头
   * @param withStream 可写流
   * @return {Promise<Buffer|*>}
   */
  getFile(pathname, withStream) {
    pathname = '/' + this.service.serviceName + pathname;
    if (withStream) {
      return this.req(pathname, {method: 'GET'}, false)
        .on('error', function (err) {
          console.log(err); // eslint-disable-line
        })
        .on('response', function (response) {
          if ((response.statusCode) !== 200) {
            withStream.destroy(response.statusCode);
            return response.unpipe(withStream);
          }
          response.pipe(withStream);
        });
    }

    // return buffer
    return this.req(pathname, {
      method: 'GET',
      encoding: null, // 必须传，否则会被转为 utf-8
    });
  }
};
