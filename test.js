(function() {

    // 监听父页面的消息
    window.addEventListener('message', function(event) {
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

        // 特殊处理：如果 methodName 是 'getDcsApp'，直接返回 dcsApp 对象
        if (methodName === 'getDcsApp') {
            if (event.source) {
                event.source.postMessage({
                    status: 'success',
                    method: methodName,
                    result: window.dcsApp
                }, event.origin);
            }
            return;
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
                        result: result
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
