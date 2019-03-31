爬虫是目前获取数据的一个重要手段，而 python 是爬虫最常用的语言，有丰富的框架和库。最近在学习的过程中，发现 nodjs 也可以用来爬虫，直接使用 JavaScript 来编写，不但简单，快速，而且还能利用到 Node 异步高并发的特性。下面是我的学习实践。

# 基础

## url 模块
爬虫的过程离不开对爬取网址的解析，应用到 Node 的 url 模块。url 模块用于处理与解析 URL。
- `url.parse()`  用于解析网址
- `url.resolve()` 把一个目标 URL 解析成相对于一个基础 URL
```js
const url = require('url')

const myUrl = url.parse('https://user:pass@sub.host.com:8080/p/a/t/h?query=string#hash');

console.log(myUrl)
// {
//   protocol: 'https:',
//   slashes: true,
//   auth: 'user:pass',
//   host: 'sub.host.com:8080',
//   port: '8080',
//   hostname: 'sub.host.com',
//   hash: '#hash',
//   search: '?query=string',
//   query: 'query=string',
//   pathname: '/p/a/t/h',
//   path: '/p/a/t/h?query=string',
//   href:'https://user:pass@sub.host.com:8080/p/a/t/h?query=string#hash'
// }

console.log(url.resolve('/one/two/three', 'four'))
// 解析结果为 '/one/two/four'
console.log(url.resolve('http://example.com/', '/one'))
// 解析结果为 'http://example.com/one'
console.log(url.resolve('http://example.com/one', '/two'))
// 解析结果为 'http://example.com/two'
```

## http 模块
爬虫需要发送网络请求，这时需要根据 url 协议采用不同模块，如果是 http 则采用 http 模块，如果 https 协议则采用 https 模块。请求需要用到模块的 request 方法

使用 `http.request(options[, callback])` 发出 HTTP 请求。`http.request()` 返回 http.ClientRequest 类的实例。

ClientRequest 实例是一个继承自 stream 的可写流。表示正在进行的请求。在请求的时候可用 `setHeader(name, value)`、`getHeader(name)` 或 `removeHeader(name)` 等函数改变请求头。 实际的请求头将与第一个数据块一起发送，或者当调用 `request.end()` 时发送。

> 要调用 `request.end()` 后才能开始发送请求。

发送 POST 请求
```js
const querystring = require('querystring')
const http = require('http')
const postData = querystring.stringify({
  'msg': 'Hello World!'
});

const options = {
  hostname: 'nodejs.cn',
  port: 80,
  path: '/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`响应主体: ${chunk}`);
  });
  res.on('end', () => {
    console.log('响应中已无数据');
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

// 将数据写入请求主体。
req.write(postData);
req.end();
```

# 封装
通过封装，把常用的请求方式封装成一个函数，便于复用和管理代码。

```js
// 定义默认的请求头
const _header = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
  'Accept-Encoding': 'gzip, deflate, br' // 默认加载压缩过的数据
}
```

请求时在请求头添加`User-Agent`，用于模拟浏览器请求;添加 `'Accept-Encoding': 'gzip, deflate, br'`。请求经过 gzip 压缩过的数据，减少消耗的流量和响应的时间。这样在读取完数据的时候需要用 `zlib` 模块进行解压。

- `zlib.gzip(buffer[, options], callback)` 压缩数据
- `zlib.gunzip(buffer[, options], callback)` 解压数据

```js
// 判断请求头里是否有 gzip 字符串, 有则说明采用了 gzip 压缩过
if(res.headers['content-encoding'] && res.headers['content-encoding'].split(';').includes('gzip')) {
  // 解压数据后返回数据
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
}
```

封装的函数传入一个 options 参数，可以只是一个字符串，也可以是一个 object 对象，包含各种请求信息。
```js
// 判断 options 是否是字符串
if(typeof options === 'string') {
  // 修改 options 格式为对象
  options = {
    url: options,
    method: 'GET',
    header: {}
  }
} else {
  // 如果是对象，则给 options 对象添加默认属性
  options = options || {}
  options.method = options.method || 'GET'
  options.header = options.header || {}
}
```
函数返回的是一个 Promse 对象，利用 JavaScript 的异步特性发送请求，提高运行效率。之后在 Promise 中利用 url 模块来解析请求的网址，根据 protocol 判断请求网址使用的 协议。
```js
// 解析 url 
var obj = url.parse(options.url)

// 解析协议
let mode = null
let port = 0
switch(obj.protocol) {
  // https 协议
  case 'https:':
    mode = require('https')
    port = 443
    break
  // http 协议
  case 'http':
    mode = require('http')
    port = 80
    break
}
```
`http.request` 请求后 callback 回调函数里，通过判断 response 的 statusCode 是否是 200，来判断请求是否成功。如果请求失败，判断是否是重定向，进行重定向处理。
```js
if(res.statusCode!=200){
  // 判断是否是跳转
  if(res.statusCode==302 || res.statusCode==301){
    // 更新 url 为跳转的网址
    let location=url.resolve(options.url, res.headers['location']);
    // 更新 options 的设置
    options.url=location;
    options.method='GET';
    // 重新发起请求
    _request(options);
  }else{
    // 返回 response
    reject(res);
  }
}
```

最终代码 fetch.js
```js
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
```

# 实战
接下来，利用封装后的函数，来爬取豆瓣的电影数据,将收集的数据按照评分开始排序，最后输出到 txt 文件上。

实战代码
```js
const fetch = require('../fetch')
const fs = require('fs')
// 爬取豆瓣数据
var data = []
// 爬取100页数据
getData(100)

// 爬取单页数据
// 参数 time 爬取页数
async function getData(time) {
  var pageStart = 0
  var pageLimit = 20
  for(var i = 0; i < time; i++) {
    var res = await fetch({
      url: `https://movie.douban.com/j/search_subjects?type=movie&tag=%E8%B1%86%E7%93%A3%E9%AB%98%E5%88%86&sort=rank&page_limit=${pageLimit}&page_start=${pageStart}`
    })
    // 添加数据到 data
    var newData = JSON.parse(res.buffer.toString())
    data.push(...newData.subjects)
    pageStart += pageLimit
  }
  // 对数据进行排序
  data.sort((a, b) => b.rate - a.rate)
  // 处理输出到文档的字符串
  var res = data.reduce((str, item) => {
    return str + item.title + ': ' + item.rate + '\n'
  }, '')
  // 保存数据到文件
  fs.writeFile('./sort.txt', res, function(err) {
      if (err) {
          throw err;
      }
  });
}
```
最终 sort.txt 数据
```
是，大臣 1984圣诞特辑: 9.8
伊丽莎白: 9.6
霸王别姬: 9.6
肖申克的救赎: 9.6
控方证人: 9.6
莫扎特！: 9.5
辛德勒的名单: 9.5
美丽人生: 9.5
茶馆: 9.4
这个杀手不太冷: 9.4
十二怒汉: 9.4
背靠背，脸对脸: 9.4
控方证人: 9.4
福尔摩斯二世: 9.4
十二怒汉: 9.4
灿烂人生: 9.4
阿甘正传: 9.4
摇滚莫扎特: 9.4
罗密欧与朱丽叶: 9.4
新世纪福音战士剧场版：Air/真心为你: 9.4
千与千寻: 9.3
熔炉: 9.3
极品基老伴：完结篇: 9.3
盗梦空间: 9.3
银魂完结篇：直到永远的万事屋: 9.3
巴黎圣母院: 9.3
城市之光: 9.3
...
```

# 参考资料
- [url API](https://nodejs.org/api/url.html)
- [http.request API](https://nodejs.org/api/http.html#http_http_request_options_callback)