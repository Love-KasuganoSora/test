(function () {



    // 节流函数
    function throttle(fn, delay = 300) {
        let timer = null;
        return function () {
            if (timer) return;
            timer = setTimeout(() => {
                fn.apply(this, arguments);
                timer = null;
            }, delay);
        };
    }

    // 监听父页面的消息
    window.addEventListener('message', function (event) {
        console.log('Received message:', event.data);
        // 解析消息数据
        let data = event.data;

        // 如果消息是字符串，尝试解析为 JSON
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                // 不是 JSON，保持原字符串
            }
        }

        // 支持的两种消息格式：
        // 格式1: { method: "方法名", params: 参数 }
        // 格式2: { action: "方法名", args: 参数 }
        const methodName = data.method || data.action;
        const params = data.params !== undefined ? data.params : data.args;

        if (methodName === 'init') {
            if (params.type === 'ppt') {
                try {
                    dcsApp.play();
                    dcsApp.exitPlay();
                    const styleSheet = document.createElement("style");
                    styleSheet.textContent = `.pcFooter___1lW8u { display: none !important; }`;
                    document.head.appendChild(styleSheet);
                    event.source.postMessage({
                        status: 'success',
                        method: methodName,
                        result: window.dcsApp.getAnimationInfo()
                    }, event.origin);
                } catch (error) {
                    console.error(`初始化失败:`, error);
                }
            } else if (params.type === "document") {
                try {
                    const button = document.querySelector('button[title="将内容宽度调整为适应窗口宽度"]');
                    button.click();
                    const btns = document.querySelector('.rightBlock___2fz75');
                    if (btns) {
                        btns.style.visibility = 'hidden';
                    }
                    const element = document.getElementById('word-content');
                    if (element) {
                        const fEvent = throttle(function () {
                            const scrollTop = this.scrollTop;
                            const scrollHeight = this.scrollHeight;
                            console.log('滚动高度：', scrollTop);
                            event.source.postMessage({
                                status: 'success',
                                method: 'scroll',
                                result: scrollTop / scrollHeight
                            }, event.origin);
                            // 在这里执行你的业务逻辑
                            // 例如：加载更多内容、改变样式等
                        }, 100);
                        element.removeEventListener('scroll', fEvent);
                        element.addEventListener('scroll', fEvent);
                    }
                    event.source.postMessage({
                        status: 'success',
                        method: methodName,
                        result: window.dcsApp.getAnimationInfo()
                    }, event.origin);
                } catch (error) {
                    console.error(`初始化失败:`, error);
                }
            }
            return
        }

        if (methodName === 'scroll') {
            const scrollTop = params.scrollTop;
            const element = document.getElementById('word-content');
            if (element) {
                element.scroll({
                    top: scrollTop * element.scrollHeight,
                    behavior: 'smooth'
                });
            }
            return
        }


        if (methodName === 'goto') {
            const page = params.page;
            const nIdx = params.anid;
            window.dcsApp.exitPlay();
            dcsApp.gotoPage(page);
            setTimeout(() => {
                dcsApp.play();
                setTimeout(() => {
                    dcsApp.preAnimation();
                    let data = dcsApp.getAnimationInfo();
                    if (data.currentPage === page) {
                        if (data.currentAnimIndex !== nIdx) {
                            const nStep = nIdx - data.currentAnimIndex;
                            if (nStep > 0) {
                                for (let i = 0; i < nStep; i++) {
                                    setTimeout(() => {
                                        dcsApp.nextAnimation();
                                    });
                                }
                            } else {
                                for (let i = 0; i > nStep; i--) {
                                    setTimeout(() => {
                                        dcsApp.preAnimation();
                                    });
                                }
                            }
                        }
                    } else {
                        dcsApp.preAnimation();
                        setTimeout(() => {
                            data = dcsApp.getAnimationInfo();
                            if (data.currentAnimIndex !== nIdx) {
                                const nStep = nIdx - data.currentAnimIndex;
                                if (nStep > 0) {
                                    for (let i = 0; i < nStep; i++) {
                                        setTimeout(() => {
                                            dcsApp.nextAnimation();
                                        });
                                    }
                                } else {
                                    for (let i = 0; i > nStep; i--) {
                                        setTimeout(() => {
                                            dcsApp.preAnimation();
                                        });
                                    }
                                }
                            }
                        }, 300);
                    }
                }, 1000);
            }, 300);
            return
        }

        if (!methodName) {
            console.warn('postMessage 缺少 method 或 action 字段:', data);
            return;
        }

        // 检查 dcsApp 上是否有该方法
        if (typeof window.dcsApp[methodName] === 'function') {
            try {
                // 调用对应方法，并传递参数
                const result = window.dcsApp[methodName](params);

                // 可选：回复父页面调用结果
                if (event.source) {
                    event.source.postMessage({
                        status: 'success',
                        method: methodName,
                        result: window.dcsApp.getAnimationInfo()
                    }, event.origin);
                }
            } catch (error) {
                console.error(`调用 dcsApp.${methodName} 失败:`, error);
                if (event.source) {
                    event.source.postMessage({
                        status: 'error',
                        method: methodName,
                        error: error.message
                    }, event.origin);
                }
            }
        } else {
            console.warn(`dcsApp.${methodName} 不存在，可用的方法:`, Object.keys(window.dcsApp));
            if (event.source) {
                event.source.postMessage({
                    status: 'not_found',
                    method: methodName,
                    availableMethods: Object.keys(window.dcsApp)
                }, event.origin);
            }
        }
    });

    // 主动通知父页面 dcsApp 已就绪
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'dcsAppReady',
            message: 'dcsApp is ready',
            availableMethods: Object.keys(window.dcsApp || {})
        }, '*');
    }

    console.log('✅ postMessage 监听器已启动，等待父页面调用 dcsApp.xxx');
    console.log('📦 当前 dcsApp 对象:', window.dcsApp);
    console.log('🔧 可用方法:', Object.keys(window.dcsApp || {}));
})();
