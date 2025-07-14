(async function () {
  if (!window.location.href.includes("roblox.com/games")) return;

  const existingBtn = document.getElementById("best-server-btn");
  if (existingBtn) return; // Avoid duplicates

  // Create the button
  const btn = document.createElement("div");
  btn.id = "best-server-btn";
  btn.innerHTML = `🔍 <b>Best Server</b>`;
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "80px",
    right: "30px",
    padding: "10px 18px",
    backgroundColor: "#00c292",
    color: "white",
    fontWeight: "bold",
    fontSize: "14px",
    borderRadius: "12px",
    cursor: "pointer",
    zIndex: 9999,
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease-in-out"
  });

  btn.onmouseover = () => btn.style.opacity = "0.85";
  btn.onmouseout = () => btn.style.opacity = "1";
  document.body.appendChild(btn);

  // On click, fetch and show best server
  btn.onclick = async () => {
    btn.innerText = "🔍 Searching...";

    const region = await getPlayerRegion();
    const gameId = getGameIdFromURL(window.location.href);

    if (!gameId) return alert("❌ Game ID not found");

    const apiUrl = `https://games.roblox.com/v1/games/${gameId}/servers/Public?sortOrder=2&limit=100`;
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();

      const servers = data.data.map(server => {
        const serverRegion = guessRegionFromId(server.id);
        const ping = estimatePing(region, serverRegion);
        return { ...server, region: serverRegion, ping };
      });

      const best = servers.sort((a, b) => a.ping - b.ping)[0];

      // Show popup
      alert(
        `🌍 Region: ${region}\n` +
        `🏆 Best Server:\n` +
        `- ID: ${best.id}\n` +
        `- Region: ${best.region}\n` +
        `- Ping: ${best.ping}ms\n` +
        `- Players: ${best.playing}/${best.maxPlayers}`
      );

      // Optional auto join (or add button for it)
      window.location.href = `roblox://experiences/start?placeId=${gameId}&gameInstanceId=${best.id}`;

    } catch (err) {
      alert("⚠️ Error: " + err);
    }

    btn.innerHTML = `🔍 <b>Best Server</b>`;
  };

  // --- UTILITIES ---

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
      "Asia": { "Singapore": 35, "Asia": 30, "Europe": 250, "US-East": 190, "US-West": 210 },
      "Europe": { "Singapore": 250, "Asia": 220, "Europe": 40, "US-East": 90, "US-West": 130 },
      "US-East": { "Singapore": 200, "Asia": 190, "Europe": 90, "US-East": 25, "US-West": 70 },
      "US-West": { "Singapore": 220, "Asia": 200, "Europe": 130, "US-East": 70, "US-West": 25 },
      "Unknown": { "Singapore": 300, "Asia": 300, "Europe": 300, "US-East": 300, "US-West": 300 }
    };

    return table[playerRegion]?.[serverRegion] ?? 300;
  }

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

      return "Singapore";
    } catch (err) {
      console.error("Geo IP error:", err);
      return "Singapore";
    }
    
  }

  function getGameIdFromURL(url) {
    const match = url.match(/roblox\.com\/games\/(\d+)/);
    return match ? match[1] : null;
  }

})();
