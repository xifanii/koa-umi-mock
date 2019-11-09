# koa-umi-mock

参照 umi-mock 写的 koa2 版本 mock 中间件,在 koa 项目中快速实现类 umi-mock 的 mock 数据请求.

使用文档参考自（将 express 相关写法换成 koa）：https://umijs.org/zh/guide/mock-data.html

喜欢的朋友给个 Star⭐, 谢谢鼓励！

## Mock 数据

Mock 数据是前端开发过程中必不可少的一环，是分离前后端开发的关键链路。通过预先跟服务器端约定好的接口，模拟请求数据甚至逻辑，能够让前端开发独立自主，不会被服务端的开发所阻塞。

## Usage

1、安装依赖

```bash
npm i koa-umi-mock --save
```

2、引用 mock 中间件

```
var app = require('koa')();
var mockMiddleware = require('koa-umi-mock');

app.use(mockMiddleware(path.join(__dirname, '/mock'))); // mock文件对应目录

var port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});

```

3、创建 mock 文件夹并添加 mock 文件

```
├── app.js                  # koa入口
├── mock                    # mock文件夹
│   ├── api1.js             # mock文件1
│   ├── api2.js             # mock文件2
......

```

约定的 mock 文件夹下的 mock 文件，文件导出接口定义，支持基于 require 动态分析的实时刷新，支持 ES6 语法，以及友好的出错提示。

```
//api1.js

export default {
  // 支持值为 Object 和 Array
  'GET /api/users': { users: [1, 2] },

  // 默认GET 可省略
  '/api/users/1': { id: 1 },

  // 支持动态路由及其获取参数
  'GET /test/:a/:b': ctx => {
    const { a, b } = ctx.params;
    ctx.body = {
      a,
      b
    }
  },

  // 支持自定义函数，API 参考 koa2
  'POST /api/users/create': ctx => {
    const { param1, param2 } = ctx.request.body;
    ctx.body = {
      param1,
        param2
    };
  },
};
```

当客户端（浏览器）发送请求，如：GET /api/users，那么本地启动的 app.js 会跟此配置文件匹配请求路径以及方法，如果匹配到了，就会将请求通过配置处理，就可以像样例一样，你可以直接返回数据，也可以通过函数处理以及重定向到另一个服务器。

更多用法请参考：https://umijs.org/zh/guide/mock-data.html
