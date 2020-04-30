// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);


const socket = io.connect('/');

socket.on('connect', function(){
    socket.emit('roomSuscribe', roomHash);
});

socket.on('members', members => {
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
});

const roomName = roomHash;
const configuration = {};
// const configuration = {
//   iceServers: [{
//     urls: 'stun:stun.l.google.com:19302'
//   }]
// };
let room;
let pc;


function onSuccess() {};
function onError(error) {
  console.error(error);
};

socket.on('open', error => {
  if (error) {
    return console.error(error);
  }
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });
});


function sendMessage(data) {
  socket.emit("broadcast", data);
}

function startWebRTC(isOfferer) {
  pc = new RTCPeerConnection(configuration);

  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(onError);
    }
  }

  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    // Display your local video in #localVideo element
    localVideo.srcObject = stream;
    // Add your stream to be sent to the conneting peer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, onError);

  socket.on('data', (message, client) => {

    if (message.sdp) {
      // This is called after receiving an offer or answer from another peer
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        // When receiving an offer lets answer it
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    }
  });
}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}


const input = document.getElementById('localVideo');
const text = document.getElementById('label');
input.addEventListener('play', ()=> {
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
    text.innerHTML = detections.length + " face detected";
  }, 100)
})
async function faceAPI(){
  faceapi.nets.tinyFaceDetector.loadFromUri('/models')
}

faceAPI();