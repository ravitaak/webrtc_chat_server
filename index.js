const express = require('express');
const app = express();
const http = require('http').createServer(app);
const bodyParser = require("body-parser")

let port = 3000;
let IO = require("socket.io")(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

var rooms = new Set();

function getRooms() {
    return Array.from(rooms);
}

var allRooms = new Map();

app.get("/", (req, res) => {
    res.send("working...");
});
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.post("/create-room", (req, res) => {
    let roomId = req.body.roomId;
    let password = req.body.password;
    let host = req.body.userId;



    if (allRooms.has(roomId)) {
        res.send("Room already exists");
        return;
    }

    let room = {
        roomId: roomId,
        password: password,
        host: host,
    }
    allRooms.set(roomId, room);
    console.log(allRooms);
    res.send("Room created");
});


app.post("/join-room", (req, res) => {
    let roomId = req.body.roomId;
    let password = req.body.password;

    //check room exists
    if (!allRooms.has(roomId)) {
        res.send("Room does not exist");
        return;
    }
    if (allRooms.get(roomId).password != password) {
        res.send("Incorrect password");
        return;
    }
    console.log("Room Joined");
    res.send("Room joined");
});






IO.use((socket, next) => {
    if (socket.handshake.query) {
        let callerId = socket.handshake.query.callerId;
        socket.user = callerId;
        next();
    }
});

IO.on("connection", (socket) => {
    console.log(socket.user, "Connected");
    socket.join(socket.user);

    socket.on("joinRoom", (data) => {
        let roomId = data.roomId;
        let thisUser = data.thisUser;
        rooms.add(thisUser);
        socket.join(roomId);

        console.log(rooms);

        socket.emit('makeCon', { allusers: getRooms() });


    });

    socket.on("makeOffer", (data) => {
        let calleeId = data.calleeId;
        let sdpOffer = data.sdpOffer;

        socket.to(calleeId).emit("newoffer", {
            callerId: socket.user,
            sdpOffer: sdpOffer,
        });
    });

    socket.on("answer", (data) => {
        let callerId = data.callerId;
        let sdpAnswer = data.sdpAnswer;

        socket.to(callerId).emit("Answered", {
            callee: socket.user,
            sdpAnswer: sdpAnswer,
        });
    });

    socket.on("IceCandidate", (data) => {
        let calleeId = data.calleeId;
        let iceCandidate = data.iceCandidate;

        socket.to(calleeId).emit("IceCandidate", {
            sender: socket.user,
            iceCandidate: iceCandidate,
        });
    });

    socket.on('disconnect', () => {
        rooms.delete(socket.user);
        console.log(socket.user, "Disconnected");
    });

    socket.on('leave-room', (data) => {
        rooms.delete(data.userId);
        console.log(data.userId, "left", data.roomId);
        console.log("After Left:", rooms);
        let userIdd = data.userId;
        let roomId = data.roomId;
        socket.broadcast.to(roomId).emit('user-disconnected', { userId: userIdd });
    });
});


http.listen(port, () => {
    console.log("Listening on port", port);
});