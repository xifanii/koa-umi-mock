var app = require('koa')();
var mockMiddleware = require('koa-umi-mock');

app.use(function* (next) {
  var start = new Date;
  yield next;
  var ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

app.use(mockMiddleware(path.join(__dirname, '/mock')));

var port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
