document.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");

  document.getElementById("find").addEventListener("click", async () => {
    resultDiv.innerHTML = "🌐 Getting your location...";

    const playerRegion = await getPlayerRegion();
    if (!playerRegion) {
      resultDiv.innerHTML = "❌ Could not detect your region.";
      return;
    }

    resultDiv.innerHTML = `🌍 Your region: <b>${playerRegion}</b><br/>🔍 Searching Roblox servers...`;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const gameId = getGameIdFromURL(tab.url);
    if (!gameId) {
      resultDiv.innerHTML = "❌ Game ID not found in URL";
      return;
    }

    const apiUrl = `https://games.roblox.com/v1/games/${gameId}/servers/Public?sortOrder=2&limit=100`;

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        resultDiv.innerHTML = "❌ No servers found";
        return;
      }

      const servers = await Promise.all(data.data.map(async server => {
        const region = guessRegionFromId(server.id);
        const ping = estimatePing(playerRegion, region);
        const livePing = await getLivePing(server.id); // Simulated for now

        return { ...server, region, ping, livePing };
      }));

      const topServers = servers.sort((a, b) => a.ping - b.ping).slice(0, 3);

      resultDiv.innerHTML = `
        <h3>🏆 Top 3 Best Servers</h3>
        ${topServers.map((server, index) => `
          <div class="server-info">
            🥇 <b>Server #${index + 1}</b> ${isFavorite(server.id) ? '❤️' : ''}
            <br/>
            🔗 <b>ID:</b> ${server.id}<br/>
            📍 <b>Region:</b> ${server.region}<br/>
            ⏱ <b>Estimated Ping:</b> ${server.ping}ms<br/>
            🔴 <b>Live Ping:</b> ${server.livePing}ms<br/>
            👥 <b>Players:</b> ${server.playing}/${server.maxPlayers}<br/>
            <div class="join-btn">
              <a href="roblox://experiences/start?placeId=${gameId}&gameInstanceId=${server.id}">
                <button>🚀 Join</button>
              </a>
              <button onclick="saveFavorite('${server.id}')" style="margin-left: 10px;">⭐ Save</button>
            </div>
          </div>
        `).join('')}
      `;
    } catch (err) {
      resultDiv.innerHTML = "⚠️ Error fetching servers:<br/>" + err;
    }
  });
});

// ---- FAVORITE SERVER SAVE ----

function saveFavorite(serverId) {
  let favorites = JSON.parse(localStorage.getItem("favoriteServers")) || [];
  if (!favorites.includes(serverId)) {
    favorites.push(serverId);
    localStorage.setItem("favoriteServers", JSON.stringify(favorites));
    location.reload(); // Refresh to show ❤️
  }
}

function isFavorite(serverId) {
  let favorites = JSON.parse(localStorage.getItem("favoriteServers")) || [];
  return favorites.includes(serverId);
}

// ---- HELPER: GUESS REGION ----

function guessRegionFromId(id) {
  const lastDigit = parseInt(id[id.length - 1]);
  if (isNaN(lastDigit)) return "Unknown";
  if (lastDigit <= 2) return "US-East";
  if (lastDigit <= 4) return "Europe";
  if (lastDigit <= 6) return "Asia";
  if (lastDigit <= 8) return "US-West";
  return "Singapore";
}

// ---- HELPER: ESTIMATE PING ----

function estimatePing(playerRegion, serverRegion) {
  const table = {
    "Singapore": { "Singapore": 15, "Asia": 35, "Europe": 230, "US-East": 180, "US-West": 200 },
    "Asia":      { "Singapore": 35, "Asia": 30, "Europe": 250, "US-East": 190, "US-West": 210 },
    "Europe":    { "Singapore": 250, "Asia": 220, "Europe": 40, "US-East": 90, "US-West": 130 },
    "US-East":   { "Singapore": 200, "Asia": 190, "Europe": 90, "US-East": 25, "US-West": 70 },
    "US-West":   { "Singapore": 220, "Asia": 200, "Europe": 130, "US-East": 70, "US-West": 25 },
    "Unknown":   { "Singapore": 300, "Asia": 300, "Europe": 300, "US-East": 300, "US-West": 300 }
  };

  return (table[playerRegion] && table[playerRegion][serverRegion]) || 999;
}

// ---- HELPER: DETECT REGION ----

async function getPlayerRegion() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    const country = data.country_code;

    if (["PH", "ID", "MY", "TH", "VN"].includes(country)) return "Singapore";
    if (["JP", "KR", "CN", "IN", "HK", "TW"].includes(country)) return "Asia";
    if (["US", "CA"].includes(country)) return "US-East";
    if (["GB", "FR", "DE", "IT", "ES", "PL", "NL"].includes(country)) return "Europe";
    if (["AU", "NZ"].includes(country)) return "Asia";

    return "US-West";
  } catch (err) {
    console.error("Geo IP lookup failed", err);
    return "Unknown";
  }
}

// ---- HELPER: GRAB GAME ID ----

function getGameIdFromURL(url) {
  const match = url.match(/roblox\.com\/games\/(\d+)/);
  return match ? match[1] : null;
}

// ---- SIMULATED LIVE PING ----

async function getLivePing(serverId) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = new WebSocket("wss://ws.postman-echo.com/raw");

    socket.onopen = () => socket.send("ping");
    socket.onmessage = () => {
      const ping = Date.now() - start;
      socket.close();
      resolve(ping);
    };
    socket.onerror = () => resolve(999); // fallback
  });
}
