const socket = io("/");

const form = document.getElementById("send-container");
const messeageInput = document.getElementById("messageInp");
const messageConatiner = document.querySelector(".container");

const append = (message, position) => {
  const messageElement = document.createElement("div");
  messageElement.innerText = message;
  if (position !== "center") {
    messageElement.classList.add("message");
  }
  messageElement.classList.add(position);
  messageConatiner.append(messageElement);
};

const name = prompt("Enter your name");

socket.emit("new-user", ROOM_ID, name);
socket.on("user", (name) => {
  console.log(name + " joined");
  append(`${name} joined the chat`, "centre");
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messeageInput.value;
  append(`You: ${message}`, "right");
  messeageInput.value = "";
  socket.emit("send", ROOM_ID, message);
});

socket.on("recieve", (data) => {
  append(`${data.name}: ${data.message}`, "left");
});
