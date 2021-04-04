/**
 * 支持的功能
 * 1. 支持全局默认配置项
 * 2. 发送请求 ajax.get/ post..
 * 3. 每次请求的结果会返回Promise实例 <= 使用Promise设计模式来管理
 * 4. 支持ajax.all
 */
(function() {
    // 发送ajax基于Promise设计模式
    class Ajax {
        constructor(url, options) {
            this.url = url;
            this.options = options;
            // 返回引用类型值，直接会替换掉实例
            return this.init();
        };


        init() {
            let {
                url,
                options: {
                    baseURL,
                    withCredentials,
                    headers,
                    transformsRequest,
                    transformResponse,
                    validateStatus,
                    params,
                    cache,
                    data,
                    method
                }
            } = this;



            // 保证拦截器有效
            // if (Array.isArray(transformResponse)) {
            //     transformResponse = [];
            // }
            !Array.isArray(transformResponse) ? transformResponse = [] : null;
            new Array(2).fill(null).forEach((item, index) => {
                typeof transformResponse[index] !== 'function' ? transformResponse[index] = null : null;

            });
            // 返回promise实例
            return new Promise((resolve, reject) => {
                // 记住四部曲
                let xhr = new XMLHttpRequest;
                url = baseURL + url;

                // get系列的问号传参
                if (/^(GET|DELETE|HEAD|OPTIONS)$/i.test(method)) {
                    if (params) {
                        let result = ``;
                        for (let attr in params) {
                            if (!params.hasOwnProperty) break;
                            result += `&${attr}=${params[attr]}`;

                            url += `${url.indexOf('?') === -1?'?':'&'}${result}`
                        }
                        result = result.substring(1);
                    }
                    // 看是否需要进行缓存，get请求浏览器一般会给你加
                    // 处理：在url尾部加个随机数
                    if (cache === false) {
                        url += `${url.indexOf('?') === -1?'?':'&'}_=${Math.random()}`;
                    }
                }


                // 基于以上处理好的method, url
                xhr.open(method, url);



                // 核心逻辑
                xhr.onreadystatechange = function() {
                    let resultFlag = validateStatus(xhr.status);
                    if (!resultFlag) {
                        reject({
                            status: xhr.status,
                            statusText: xhr.statusText,
                            request: xhr
                        });
                        return;
                    }
                    if (xhr.readyState === 4) {
                        let resposeHeader = {};
                        xhr.getAllResponseHeaders().split(/\n/).forEach(item => {
                            let [key = '', value = ''] = item.split(':');
                            responseHeaders[key.trim()] = value.trim();
                        });
                        resolve({
                            status: xhr.status,
                            statusText: xhr.statusText,
                            data: JSON.parse(xhr.responseText),
                            request: xhr,
                            headers: responseHeader,
                        });
                    }
                };
                // 跨域请求处理
                xhr.withCredentials = withCredentials;

                // 设置请求头
                if (headers) {
                    for (let attr in headers) {
                        if (!headers.hasOwnProperty(attr)) break;
                        xhr.setRequestHeader(attr, encodeURI(headers[attr]));
                    }
                }
                // 请求主体:请求主体传递信息的拦截
                // if (typeof transformsRequest === 'function') {
                //     data = transformsRequest(data);
                // }
                if (/^(PUT|POST)$/i.test(method)) {
                    typeof transformRequest === 'function' ? data = transformsRequest(data) : null;
                } else {
                    data = null;
                }

                xhr.send(data);
            }).then(...transformResponse); // 执行拦截器
        };
    }
    // 创建_ajax管理调用
    function _init(options = {}) {
        // 参数初始化 headers =>应该是增加和更新
        //  其余的header项可以替换
        let optionsHeaders = options.headers;
        _ajax.defaults.header = Object.assign(_ajax.defaults, headers, optionsHeaders);
        // 处理好传入的headers后直接移除，方便下面的处理
        delete options.headers;
        return Object.assign(_ajax.defaults, options);

    };


    // 定义ajax
    function _ajax() {}
    _ajax.defaults = {
        // 全局配置项
        baseURL: "",
        withCredentials: false,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: function(data) {
            if (!data) return data;
            let result = ``;
            // 遍历data对象中的属性，使用hasOwnProperty排除
            // 定义在原型连作用的属性
            for (let attribute in data) {
                if (!data.hasOwnProperty(attribute)) {
                    result += `&${attribute}=${data[attribute]}`
                }
            }
            // 干掉第一个 & 
            return result.substring(1);
        },
        transformResponse: [function onFulfilled(response) {
            return response.data;
        }, function onRejected(reason) {
            return Promise.reject(reason);
        }],
        validateStatus: function(status) {
            return /^(2|3)\d{2}$/.test(status);
        },
        // 请求配置项
        params: {},
        data: {},
        //默认支持缓存
        cache: true
    };


    // get系列请求
    ['get', 'delete', 'options'].forEach(item => {
        _ajax[item] = function(url, options = {}) {
            options.method = item;
            return new Ajax(url, _init(options));
        }
    });

    // post系列请求
    ['post', 'put'].forEach(item => {

        _ajax[item] = function(url, data, options) {
            options.data = data;
            options.method = item;
            return new Ajax(url, _init(options));
        }
    });
    // 每次返回Promise实例
    // _ajax.get = function(url, options) {
    //     return new Ajax(url, _init(options));
    // };

    // _ajax.post = function(url, data = {}, options = {}) {
    //     // 将data放入配置项
    //     options.data = data;
    //     return new Ajax(url, _init(options));
    // };
    _ajax.all = function(promiseArray = []) {
        return Promise.all(promiseArray);
    };

    window._ajax = _ajax;
})();