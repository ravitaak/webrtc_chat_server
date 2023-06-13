let port = 3000;

var rooms = new Set();

function getRooms() {
    return Array.from(rooms);
}
let IO = require("socket.io")(port, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
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
