# 又拍云云存储sdk

## install

## import and constructor
```javaScript
const OssClient = require('upyun-oss-sdk');
  /**
   * @param {string} operatorName   账户
   * @param {string} password       密码
   * @param {string} type           存储类型
   * @param {string} serviceName    存储分区名称
   * @param {string} serviceHost    服务host
   * @param {string} apiSecret      文件秘钥
   * @param {object} params         其他参数
   */
const ossClinet = new OssClient(operatorName, password, type, serviceName, serviceHost, apiSecret, params = {});
```

## method

### 获取策略和签名
```javaScript
 /**
   * @link http://docs.upyun.com/api/form_api/#_11
   * @param {Object} params
   * @param {Integer} params.expiration default is 30 minutes
   * @param {String} params['save-key'] default is /{filemd5}{.suffix}
   * @param {Integer} params['content-length']
   */
  ossClient.getPolicyAndSignature(params = {})
```
### 获取表单api的策略和授权
```javaScript
 /**
  * @param {object} service
  * @param {object} params optional params @see http://docs.upyun.com/api/form_api/#_2
  */
  ossClient.getPolicyAndAuthorization(params = {})
```

### 获取当前服务使用量，单位 byte
```javaScript
   /**
   * @return {Promise<String|Integer>}
   */
  await ossClient.usage()
```

### 获取文件目录列表
```javaScript
  /**
   * @param {String} pathname
   * @param {Object} options
   * @param {Integer} options.limit 获取的文件数量，默认 100，最大 10000
   * @param {String} options.order asc 或 desc，按文件名升序或降序排列。默认 asc
   * @param {String} options.iter 分页开始位置，通过x-upyun-list-iter 响应头返回，所以第一次请求不需要填写
   * @return {Promise<Promise<*> | void | * | Bluebird<any> | Promise<any>>}
   */
  await ossClient.listDir(pathname = '/', options = {}) 
```

### 检查文件是否存在
```javaScript
  /**
   * @param {string} pathname 
   */
  await ossClient.isExistFile(pathname = '/') 
```

### 文件上传
```javaScript
  /**
   * @link https://help.upyun.com/knowledge-base/rest_api/#e4b88ae4bca0e69687e4bbb6
   * @param {string} [pathname] path to file, eg: '/shangzhibo/jinkela/feiliao.jpg'
   * @param file
   * @return {Promise<*>}
   */
  await ossClient.putFile(pathname = '/', file)
```

### 流文件上传
```javaScript
 /**
   * 流文件上传
   * @param {string} [pathname] path to file, eg: '/shangzhibo/jinkela/feiliao.jpg'
   *
   * 使用示例:
   *    fs.createReadStream(path.join(__dirname, 'file.mp4')).pipe(putStream('/file.mp4'));
   */
  ossClient.putStream(pathname)
```

### 文件删除方法集大成者
```javaScript
/**
   * @private
   * @param {String} pathname
   * @param {Object} options
   * @param {Boolean} options.isAsync 是否为异步删除
   * @param {Boolean} options.isFolder 是否为文件夹
   * @param {Integer} retry 重试次数, 默认是 3 次
   * @return {Promise<Promise<*> | void | * | Bluebird<any> | Promise<any>>}
   */
  await ossClient._delete(pathname, options = {}, retry = 3)
```

### 文件删除
```javaScript
 /**
   * @param pathname
   * @param {Boolean} isAsync
   * @return {Promise<Promise<*>|void|*|Bluebird<any>|Promise<any>>}
   */
  await ossClient.deleteFile(pathname, isAsync = false)
```

### 删除空文件夹
```javaScript
  /**
   * @param {String} pathname
   * @param {Boolean} isAsync
   * FIXME: 异步删除时无法删除
   * @return {Promise<Promise<*>|void|*|Bluebird<any>|Promise<any>>}
   */
  await ossClient.deleteEmptyDir(pathname, isAsync)
```

### 非空文件夹删除
```javaScript
  /**
   * @param {String} pathname
   * @param {Boolean} isAsync
   * @param {Undefined|String} next
   * @return {Promise<Promise<*>|void|*|Bluebird<any>|Promise<any>>}
   */
  await ossClient.deleteDir(pathname, isAsync, next)
```
### 文件下载
```javaScript
  /**
   * @param {string} pathname 文件路径，以 / 开头
   * @param withStream 可写流
   * @return {Promise<Buffer|*>}
   */
  ossClient.getFile(pathname, withStream) 
```