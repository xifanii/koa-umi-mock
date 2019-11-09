export default {
  'POST /test/postapi': ctx => {
    const { param1, param2 } = ctx.request.body;
    ctx.body = {
      code: 0,
      data: {
        param1,
        param2
      },
    };
  },
};
