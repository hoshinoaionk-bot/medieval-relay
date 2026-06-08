const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

console.log('Relay server running on port ' + PORT);

wss.on('connection', (ws) => {
    let currentRoom = null

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data)
            if (msg.type === 'host') {
                const code = String(Math.floor(10 + Math.random() * 90))
                rooms[code] = { host: ws, clients: [] }
                currentRoom = code
                ws.send(JSON.stringify({ type: 'hosted', code: code }))
                console.log('Room created: ' + code)
            }
            else if (msg.type === 'join') {
                const room = rooms[msg.code]
                if (!room) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room not found!' }))
                    return
                }
                currentRoom = msg.code
                room.clients.push(ws)
                ws.send(JSON.stringify({ type: 'joined', hostIp: 'relay' }))
                room.host.send(JSON.stringify({ type: 'player_joined' }))
                console.log('Player joined room: ' + msg.code)
            }
            else if (msg.type === 'relay') {
                const room = rooms[currentRoom]
                if (!room) return
                const msgStr = JSON.stringify(msg)
                if (ws === room.host) {
                    room.clients.forEach(c => c !== ws && c.send(msgStr))
                } else {
                    room.host.send(msgStr)
                }
            }
        } catch(e) {
            console.log('Error: ' + e)
        }
    })

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            if (ws === rooms[currentRoom].host) {
                rooms[currentRoom].clients.forEach(c => {
                    c.send(JSON.stringify({ type: 'host_disconnected' }))
                })
                delete rooms[currentRoom]
                console.log('Room closed: ' + currentRoom)
            } else {
                rooms[currentRoom].clients = rooms[currentRoom].clients.filter(c => c !== ws)
            }
        }
    })
})
