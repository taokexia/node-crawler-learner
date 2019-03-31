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

// 以一种 Web 浏览器解析超链接的方式把一个目标 URL 解析成相对于一个基础 URL。
// url.resolve(from, to)
console.log(url.resolve('/one/two/three', 'four'))         // '/one/two/four'
console.log(url.resolve('http://example.com/', '/one'))    // 'http://example.com/one'
console.log(url.resolve('http://example.com/one', '/two')) // 'http://example.com/two'