// Inject a floating "Find Best Server" button into Roblox game pages
console.log("✅ Roblox Ping Finder content script loaded");

const button = document.createElement("button");
button.innerText = "🔍 Best Server";
button.style.position = "fixed";
button.style.bottom = "20px";
button.style.right = "20px";
button.style.padding = "10px 16px";
button.style.backgroundColor = "#00b894";
button.style.color = "white";
button.style.border = "none";
button.style.borderRadius = "8px";
button.style.fontWeight = "bold";
button.style.fontSize = "14px";
button.style.zIndex = "99999";
button.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
button.style.cursor = "pointer";

button.addEventListener("click", () => {
  alert("👀 Coming soon: Server Finder inside the game page!");
});

document.body.appendChild(button);
