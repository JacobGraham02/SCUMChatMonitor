import WebSocket from "ws";

export default class WebSocketGenerator {
    
    createWebSocketConnection(id) {
        const ws = new WebSocket('ws://localhost:8080');
        ws.onopen = () => {
            console.log('Connected to WebSocket server');
            ws.send('Hello from client!');
        };
        ws.onmessage = (event) => {
            console.log('Message from server:', event.data);
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        return ws;
    }
}