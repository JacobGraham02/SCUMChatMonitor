document.addEventListener('DOMContentLoaded', () => {
    const webSocketHandlers = {
        onOpen: () => console.log("Connection opened."),
        onMessage: (message) => console.log(`Received message: ${message}`),
        onError: (error) => console.error(`Error: ${error}`),
        onClose: (code, reason) => console.log(`Closed: ${code}, ${reason}`),
    };

    const ws = window.api.createWebSocket('ws://localhost:8080', webSocketHandlers);

    document.getElementById('sendButton').addEventListener('click', () => {
        ws.sendMessage('Hello server!');
    });

    document.getElementById('closeButton').addEventListener('click', () => {
        ws.closeConnection();
    });
});
