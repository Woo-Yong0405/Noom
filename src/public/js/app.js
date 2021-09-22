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
    }
    
    muteBtn.addEventListener("click", handleMuteClick);
    cameraBtn.addEventListener("click", handleCameraClick);
    camerasSelect.addEventListener("input", handleCameraChange);
    
//Join Calls

    const welcome = document.getElementById("welcome");
    welcomeForm = welcome.querySelector("form");
    const input = welcomeForm.querySelector("input");
    
    let roomName;

    async function startMedia() {
        welcome.hidden = true;
        call.hidden = false;
        await getMedia();
        makeConnection();
    }
    
    function handleWelcomeSubmit(event) {
        event.preventDefault();
        welcome.hidden = false;
        call.hidden = true;
        socket.emit("joinRoom", input.value, startMedia);
        roomName = input.value;
        input.value = "";
    }
    
    welcomeForm.addEventListener("submit", handleWelcomeSubmit);
    
//Socket Code
socket.on("welcome", async () => {
    const offer =  await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("Sent the Offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer",  (offer) => {
    console.log(offer);
})

//RTC Code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection();
    myStream.getTracks().forEach(track => {
        myPeerConnection.addTrack(track, myStream);
    });
}