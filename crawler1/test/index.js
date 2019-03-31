const fetch = require('../fetch')
const fs = require('fs')
// 爬取豆瓣数据
var data = []
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
    var newData = JSON.parse(res.buffer.toString())
    data.push(...newData.subjects)
    pageStart += pageLimit
  }
  data.sort((a, b) => b.rate - a.rate)
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