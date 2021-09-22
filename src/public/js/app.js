const socket = io();

//Calling

const myFace = document.getElementById("myFace"); 
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;

async function getCameras() {
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
                option.selected = true;
            };
            camerasSelect.appendChild(option);
        });
    } catch(e) {
        console.log(e);
    };
}

async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: {facingMode: "user"}
    };
    const cameraConstraints = {
        audio: true,
        video: {deviceId: {deviceId}}
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstraints : initialConstraints
            );
            myFace.srcObject = myStream;
            if (!deviceId) {
                await getCameras();
            }
        } catch(e) {
            console.log(e);
        }
    }
    
    function handleMuteClick() {
        myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        if (!muted) {
            muteBtn.innerText = "Unmute";
            muted = true;
        } else {
            muteBtn.innerText = "Mute";
            muted = false;
        }
    }
    function handleCameraClick() {
        myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        if (!cameraOff) {
            cameraBtn.innerText = "Turn On Camera";
            cameraOff = true;
        } else {
            cameraBtn.innerText = "Turn Off Camera";
            cameraOff = false;
        }
    }
    
    async function handleCameraChange() {
        await getMedia(camerasSelect.value);
        if (myPeerConnection) {
            const videoTrack = myStream.getVideoTracks()[0];
            const videoSender = myPeerConnection.getSenders().find((sender) => sender.track.kind === "video");
            videoSender.replaceTrack(videoTrack);
        }
    }
    
    muteBtn.addEventListener("click", handleMuteClick);
    cameraBtn.addEventListener("click", handleCameraClick);
    camerasSelect.addEventListener("input", handleCameraChange);
    
//Join Calls

    const welcome = document.getElementById("welcome");
    welcomeForm = welcome.querySelector("form");
    
    let roomName;
    
    async function startMedia() {
        welcome.hidden = true;
        call.hidden = false;
        await getMedia();
        makeConnection();
    }
    
    async function handleWelcomeSubmit(event) {
        event.preventDefault();
        const input = welcomeForm.querySelector("input");
        await startMedia();
        socket.emit("joinRoom", input.value);
        roomName = input.value;
        input.value = "";
    }
    
    welcomeForm.addEventListener("submit", handleWelcomeSubmit);
    
//Socket Code
socket.on("welcome", async () => {
    const offer =  await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer); 
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
});

socket.on("ice", (ice) => {
    myPeerConnection.addIceCandidate(ice);
})

socket.on("answer",  (answer) => {
    myPeerConnection.setRemoteDescription(answer);
})

//RTC Code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302"
                ],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach(track => {
        myPeerConnection.addTrack(track, myStream);
    });
}

function handleIce(data) {
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peerStream = document.getElementById("peersStream");
    peerStream.srcObject = data.stream;
}