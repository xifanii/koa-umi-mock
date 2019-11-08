const path = require('path');
const { join } = require('path');
const bodyParser = require('koa-bodyparser');
const glob = require('glob');
const assert = require('assert');
const chokidar = require('chokidar');
const pathToRegexp = require('path-to-regexp');
const register = require('@babel/register');

const debug = console.log;

const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const BODY_PARSED_METHODS = ['post', 'put', 'patch'];

function getMockMiddleware(absMockPath) {
    register({
        plugins: [
            require.resolve('babel-plugin-add-module-exports'),
            require.resolve('@babel/plugin-transform-modules-commonjs'),
        ],
        babelrc: false,
        only: [absMockPath],
    });

    let mockData = getConfig();
    watch();

    function watch() {
        if (process.env.WATCH_FILES === 'none') return;
        const watcher = chokidar.watch([absMockPath], {
            ignoreInitial: true,
        });
        watcher.on('all', (event, file) => {
            debug(`[${event}] ${file}, reload mock data`);
            mockData = getConfig();
        });
    }

    function getConfig() {
        cleanRequireCache();
        let ret = null;
        const mockFiles = glob.sync('**/*.js', {
            cwd: absMockPath,
        });
        debug(
            `load mock data from ${absMockPath}, including files ${JSON.stringify(
                mockFiles,
            )}`,
        );
        ret = mockFiles.reduce((memo, mockFile) => {
            memo = {
                ...memo,
                ...require(join(absMockPath, mockFile)) // eslint-disable-line
            };
            return memo;
        }, {});
        return normalizeConfig(ret);
    }

    function normalizeConfig(config) {
        return Object.keys(config).reduce((memo, key) => {
            const handler = config[key];
            const type = typeof handler;
            assert(
                type === 'function' || type === 'object',
                `mock value of ${key} should be function or object, but got ${type}`,
            );
            const { method, path } = parseKey(key);
            const keys = [];
            const re = pathToRegexp(path, keys);
            memo.push({
                method,
                path,
                re,
                keys,
                handler: createHandler(method, handler),
            });
            return memo;
        }, []);
    }

    function cleanRequireCache() {
        Object.keys(require.cache).forEach(file => {
            if (file.indexOf(absMockPath) > -1) {
                delete require.cache[file];
            }
        });
    }

    function parseKey(key) {
        let method = 'get';
        let path = key;
        if (key.indexOf(' ') > -1) {
            const splited = key.split(' ');
            method = splited[0].toLowerCase();
            path = splited[1]; // eslint-disable-line
        }
        assert(
            VALID_METHODS.includes(method),
            `Invalid method ${method} for path ${path}, please check your mock files.`,
        );
        return {
            method,
            path,
        };
    }

    function createHandler(method, handler) {
        return async function (ctx, next) {
            if (BODY_PARSED_METHODS.includes(method)) {
                await bodyParser({
                    enableTypes: ['json', 'form', 'text'],
                    formLimit: '56kb',
                    jsonLimit: '5mb',
                    textLimit: '5mb',
                })(ctx, next);
            }
            if (typeof handler === 'function') {
                handler(ctx, next);
            } else {
                ctx.body = handler;
            }
        };
    }

    function matchMock(ctx) {
        const { path: exceptPath } = ctx.request;
        const exceptMethod = ctx.request.method.toLowerCase();
        for (const mock of mockData) {
            const { method, re, keys } = mock;

            if (method === exceptMethod) {
                const match = re.exec(ctx.request.path);

                if (match) {
                    const params = {};
                    for (let i = 1; i < match.length; i += 1) {
                        const key = keys[i - 1];
                        const prop = key.name;
                        const val = decodeParam(match[i]);

                        if (val !== undefined || !hasOwnProperty.call(params, prop)) {
                            params[prop] = val;
                        }
                    }
                    ctx.params = params;
                    return mock;
                }
            }
        }

        function decodeParam(val) {
            if (typeof val !== 'string' || val.length === 0) {
                return val;
            }

            try {
                return decodeURIComponent(val);
            } catch (err) {
                if (err instanceof URIError) {
                    err.message = `Failed to decode param ' ${val} '`;
                    err.status = err.statusCode = 400;
                }

                throw err;
            }
        }

        return mockData.filter(({ method, re }) => method === exceptMethod && re.test(exceptPath))[0];
    }

    return async (ctx, next) => {
        const match = matchMock(ctx);

        if (match) {
            debug(`mock matched: [${match.method}] ${match.path}`);
            return await match.handler(ctx, next);
        }
        await next();
    };
}

module.exports = getMockMiddleware;
