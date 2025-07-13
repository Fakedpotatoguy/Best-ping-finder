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

      const servers = data.data.map(server => {
        const region = guessRegionFromId(server.id);
        const ping = estimatePing(playerRegion, region);
        return { ...server, region, ping };
      });

      // Sort by ping and show top 3
      const topServers = servers.sort((a, b) => a.ping - b.ping).slice(0, 3);

      let html = `
        <div class="server-info">
          🧭 <b>Your Region:</b> ${playerRegion}<br/><br/>
      `;

      topServers.forEach((server, index) => {
        html += `
          <div style="margin-bottom: 25px;">
            <h3>🔢 Server ${index + 1}</h3>
            🆔 <b>Server ID:</b> ${server.id}<br/>
            📍 <b>Region:</b> ${server.region}<br/>
            ⏱️ <b>Ping:</b> ${server.ping}ms<br/>
            👥 <b>Players:</b> ${server.playing}/${server.maxPlayers}<br/>
            <a href="roblox://experiences/start?placeId=${gameId}&gameInstanceId=${server.id}" style="
              display: inline-block;
              margin-top: 10px;
              padding: 10px 20px;
              background: linear-gradient(145deg, #00bfff, #1e90ff);
              color: white;
              font-weight: bold;
              border: none;
              border-radius: 12px;
              text-decoration: none;
              font-size: 14px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              transition: 0.2s ease;
            " onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
              🚀 Join This Server
            </a>
          </div>
        `;
      });

      html += `</div>`;
      resultDiv.innerHTML = html;

    } catch (err) {
      resultDiv.innerHTML = "⚠️ Error fetching servers:<br/>" + err;
    }
  });
});

function guessRegionFromId(id) {
  const lastDigit = parseInt(id[id.length - 1]);
  if (isNaN(lastDigit)) return "Unknown";
  if (lastDigit <= 2) return "US-East";
  if (lastDigit <= 4) return "Europe";
  if (lastDigit <= 6) return "Asia";
  if (lastDigit <= 8) return "US-West";
  return "Singapore";
}

function estimatePing(playerRegion, serverRegion) {
  const table = {
    "Singapore": { "Singapore": 15, "Asia": 35, "Europe": 230, "US-East": 180, "US-West": 200 },
    "Asia":      { "Singapore": 35, "Asia": 30, "Europe": 250, "US-East": 190, "US-West": 210 },
    "Europe":    { "Singapore": 250, "Asia": 220, "Europe": 40, "US-East": 90, "US-West": 130 },
    "US-East":   { "Singapore": 200, "Asia": 190, "Europe": 90, "US-East": 25, "US-West": 70 },
    "US-West":   { "Singapore": 220, "Asia": 200, "Europe": 130, "US-East": 70, "US-West": 25 },
    "Unknown":   { "Singapore": 300, "Asia": 300, "Europe": 300, "US-East": 300, "US-West": 300 }
  };

  return table[playerRegion]?.[serverRegion] ?? 300;
}

async function getPlayerRegion() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    const country = data.country_code;
    console.log("🌎 Detected Country Code:", country);

    if (["PH", "ID", "MY", "TH", "VN"].includes(country)) return "Singapore";
    if (["JP", "KR", "CN", "IN", "HK", "TW"].includes(country)) return "Asia";
    if (["US", "CA"].includes(country)) return "US-East";
    if (["GB", "FR", "DE", "IT", "ES", "PL", "NL"].includes(country)) return "Europe";
    if (["AU", "NZ"].includes(country)) return "Asia";

    return "Singapore"; // Default safe fallback
  } catch (err) {
    console.error("Geo IP lookup failed:", err);
    return "Singapore";
  }
}

function getGameIdFromURL(url) {
  const match = url.match(/roblox\.com\/games\/(\d+)/);
  return match ? match[1] : null;
}
