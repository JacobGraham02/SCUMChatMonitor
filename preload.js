import { contextBridge } from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
    createWebSocket: (url, callbacks) => {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('WebSocket connection established');
            if (callbacks.onOpen) callbacks.onOpen();
        };

        ws.onmessage = (event) => {
            console.log(`Message from server: ${event.data}`);
            if (callbacks.onMessage) callbacks.onMessage(event.data);
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error: ${error}`);
            if (callbacks.onError) callbacks.onError(error);
        };

        ws.onclose = (event) => {
            console.error(`WebSocket closed: ${event.code} ${event.reason}`);
            if (callbacks.onClose) callbacks.onClose(event.code, event.reason);
        };

        return {
            sendMessage: (message) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            },
            closeConnection: () => {
                ws.close();
            }
        };
    }
});