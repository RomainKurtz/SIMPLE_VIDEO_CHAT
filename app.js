var app = require('express')();
 
 var __dirname = "./public/"
 
 /* serves main page */
 app.get("/", function(req, res) {
    res.sendfile( __dirname +'index.html');
 });
 
  app.post("/user/add", function(req, res) { 
	/* some server side logic */
	res.send("OK");
  });
 
 /* serves all the static files */
 app.get(/^(.+)$/, function(req, res){ 
     console.log('static file request : ' + req.params);
     res.sendfile( __dirname + req.params[0]); 
 });
 
 var port = process.env.PORT || 5000;
 var server = app.listen(port, function() {
   console.log("Listening on " + port);
 });
 

 var io = require('socket.io')().listen(server);

 io.on('connection', function(socket){
    console.log('New Socket Client !'); 
    socket.on("roomSuscribe", function(roomName){
    	socket.join(roomName, function(){
    		var _roomName = roomName;
    		socket.emit('members', socket.adapter.rooms[_roomName]);
    		socket.on("broadcast", function(data){
    			socket.broadcast.to(_roomName).emit("data", data);
    		})
    	});
    });

 });



 // { pingTimeout: 500}