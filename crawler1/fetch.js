const assert = require('assert')
const url = require('url')
const zlib = require('zlib')
const querystring = require('querystring') 

// 定义默认的请求头
const _header = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
  'Accept-Encoding': 'gzip, deflate, br' // 默认加载压缩过的数据
}

module.exports = (options) => {
  // 处理参数
  if(typeof options === 'string') {
    options = {
      url: options,
      method: 'GET',
      header: {}
    }
  } else {
    options = options || {}
    options.method = options.method || 'GET'
    options.header = options.header || {}
  }

  // 添加请求头信息
  for(let name in _header) {
    options.header[name] = options.header[name] || _header[name]
  }
  // 封装 post 的数据
  if(options.data) {
    options.postData = querystring.stringify(options.data)
    options.header['Content-Length'] = options.postData.length
  }

  // 返回 Promise 对象
  return new Promise((resolve, reject) => {
    _request(options)
    function _request(options) {
      // 解析 url 
      var obj = url.parse(options.url)

      // 解析协议
      let mode = null
      let port = 0
      switch(obj.protocol) {
        case 'https:':
          mode = require('https')
          port = 443
          break
        case 'http':
          mode = require('http')
          port = 80
          break
      }
      // 封装请求
      let req_options = {
        hostname: obj.hostname,
        port: obj.port || port,
        path: obj.path,
        method: options.method,
        headers: options.header
      }
      // 发送请求
      let req_result = mode.request(req_options, (res) => {
        // 判断是否出错
        if(res.statusCode!=200){
          // 判断是否是跳转
          if(res.statusCode==302 || res.statusCode==301){
            // 更新 url 为跳转的网址
            let location=url.resolve(options.url, res.headers['location']);
            options.url=location;
            options.method='GET';
            _request(options);
          }else{
            // 返回 response
            reject(res);
          }
        } else {
            // 处理数据
          var data = []
          res.on('data', chunk => {
            data.push(chunk)
          })
          // 返回数据
          res.on('end', () => {
            // 处理数据
            var result = Buffer.concat(data)
            if(res.headers['content-length'] && res.headers['content-length'] != result.length) {
              reject('数据加载不完整')
            } else {
              // 判断是否是压缩过的数据
              if(res.headers['content-encoding'] && res.headers['content-encoding'].split(';').includes('gzip')) {
                zlib.gunzip(result, (err, data) => {
                  if(err) {
                    reject(err)
                  } else {
                    resolve({
                      buffer: data,
                      headers: res.headers
                    })
                  }
                })
              } else {
                // 直接加载数据
                resolve({
                  buffer: result,
                  headers: res.headers
                })
              }
            }
          })
        }
      })
      // 出错返回
      req_result.on('error', e=>reject(e));
      // POST 时有数据则发送
      if(options.postData) {
        req_result.write(options.postData)
      }
      req_result.end();
    }
  })
}
