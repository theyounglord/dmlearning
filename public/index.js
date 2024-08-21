const clientIdInput = document.getElementById("clientId");
const usernameInput = document.getElementById("username");
const startButton = document.getElementById("startButton");
const chatDiv = document.getElementById("chatDiv");
const messageInput = document.getElementById("messageInput");
const closeInput = document.getElementById("closeButton");
const sendButton = document.getElementById("sendButton");
const chatBox = document.getElementById("chatBox");

let clientId, username;
const signalingServerUrl = "wss://mdm.ajnalabs.in/ws"; // Adjust this to your signaling server's URL
let ws;
initializeWebSocket();

const uuidGenerator = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const urlParams = new URLSearchParams(window.location.search);
const clientIdFromUrl = urlParams.get("clientId");
const usernameFromUrl = urlParams.get("username");

startButton.addEventListener("click", () => {
  clientId = clientIdInput.value.trim();
  username = usernameInput.value.trim();
  if (clientId && username) {
    document.getElementById("clientIdDiv").classList.add("hidden");
    const query = `?clientId=${clientId}&username=${username}`;
    window.history.pushState(
      {},
      null /* title */,
      window.location.pathname + query
    );
    chatDiv.classList.remove("hidden");
    const payload = {
      type: "connect",
      connectionId: clientId,
      timestamp: Date.now(),
      transactionId: uuidGenerator(),
      command: {
        cmdType: 0,
        description: "Client connected",
      },
    };
    ws.send(JSON.stringify(payload));
  } else {
    alert("Please enter a Client ID & Username");
  }
});

sendButton.addEventListener("click", sendMessageToServer);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessageToServer();
  }
});
let messageLists = [];

function onConnect(connectionId) {
  console.log("onConnect", connectionId);
}

function onCommunication(connectionId, data) {
  console.log("onCommunication", connectionId, data);
  displayMessage(data.message, data.username === username ? "self" : "peer");
}
function initializeWebSocket() {
  ws = new WebSocket(signalingServerUrl);

  ws.onopen = () => {
    console.log("Connected to the signaling server");
    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      switch (data.type) {
        case "connect":
          onConnect(data.connectionId);
          break;
        case "communication":
          onCommunication(data.connectionId, data.data);
          break;
        default:
          break;
      }
    };
    // ws.send(JSON.stringify({ type: "connect", connectionId: clientId }));
  };

  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    switch (data.type) {
      case "communication":
        displayMessage(data.message, "peer");
        break;
      default:
        break;
    }
  };
}

ws.onclose = () => {
  console.log("Disconnected from the signaling server");
  initializeWebSocket();
};

closeInput.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "disconnect", connectionId: clientId }));
});

function sendMessageToServer() {
  const message = messageInput.value.trim();
  const cmdType = document.getElementById("commandType").value;
  debugger;
  if (message) {
    const payload = {
      type: "communication",
      connectionId: clientId,
      timestamp: Date.now(),
      transactionId: uuidGenerator(),
      command: {
        cmdType: cmdType,
        description: "Message",
      },
      data: {
        connectionId: clientId,
        message: message,
        username: username,
        cmdType: Number(cmdType),
      },
    };
    ws.send(JSON.stringify(payload));
    displayMessage(message, "self");
    messageInput.value = "";
  }
}

function displayMessage(message, sender) {
  const messageElement = document.createElement("div");
  messageElement.className = `message ${sender}`;
  messageElement.textContent = message + " (" + username + ")";
  chatBox.appendChild(messageElement);
}
