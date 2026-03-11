import api from "./api.js";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");
const root = document.getElementById("analytics-root");
const eventId = new URLSearchParams(window.location.search).get("eventId");
const charts = [];

if (!token || !user) {
  window.location.href = "login.html";
}

if (!eventId) {
  root.innerHTML = '<p style="color: #d9534f;">Missing eventId.</p>';
}

function resetCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.length = 0;
}

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function buildBarChart(canvasId, labels, values, label, color) {
  if (!window.Chart) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const textColor = cssVar("--text-secondary", "#a7bed6");
  const gridColor = "rgba(167, 190, 214, 0.18)";

  charts.push(
    new window.Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: color,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
        },
      },
    }),
  );
}

function buildDoughnutChart(canvasId, labels, values) {
  if (!window.Chart) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const textColor = cssVar("--text-secondary", "#a7bed6");

  charts.push(
    new window.Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#1f77b4", "#2ca02c", "#ff7f0e", "#9467bd", "#d62728"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor,
            },
          },
        },
      },
    }),
  );
}

async function loadAnalytics() {
  if (!eventId) return;
  try {
    resetCharts();
    const data = await api.getExperienceAnalytics(eventId, token);
    const topCardsRows = data.topCards.length
      ? data.topCards
          .map(
            (card) => `
              <tr>
                <td>${card.cardId}</td>
                <td>${card.owner}</td>
                <td>${card.rarity}</td>
                <td>${card.shareCount}</td>
                <td>${card.viewCount}</td>
                <td>${card.downloadCount}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="6">No cards yet.</td></tr>`;

    root.innerHTML = `
      <h1 style="margin-top: 0;">Experience Analytics</h1>
      <p><strong>Event:</strong> ${data.event.title}</p>
      <div class="panel" style="margin-top: 10px;">
        <h3 style="margin-top: 0;">Summary</h3>
        <div class="stat-grid">
          <div class="stat"><strong>Cards Generated</strong><br>${data.summary.cardsGenerated}</div>
          <div class="stat"><strong>Cards Shared</strong><br>${data.summary.cardsShared}</div>
          <div class="stat"><strong>Total Views</strong><br>${data.summary.totalViews}</div>
          <div class="stat"><strong>Total Downloads</strong><br>${data.summary.totalDownloads}</div>
        </div>
      </div>

      <div class="panel" style="margin-top: 12px;">
        <h3 style="margin-top: 0;">Engagement Funnel</h3>
        <div class="stat-grid">
          <div class="stat"><strong>Share Actions</strong><br>${data.funnel.totalShares}</div>
          <div class="stat"><strong>Share to View Rate</strong><br>${data.funnel.shareToViewRate}%</div>
          <div class="stat"><strong>View to Download Rate</strong><br>${data.funnel.viewToDownloadRate}%</div>
          <div class="stat"><strong>Share to Download Rate</strong><br>${data.funnel.shareToDownloadRate}%</div>
        </div>
      </div>

      <div class="panel">
        <h3 style="margin-top: 0;">Distribution Charts</h3>
        <div class="chart-grid">
          <div class="chart-box">
            <h4 style="margin-top: 0;">Mood Mix</h4>
            <div style="height: 220px;"><canvas id="mood-chart"></canvas></div>
          </div>
          <div class="chart-box">
            <h4 style="margin-top: 0;">Card Scene Mix</h4>
            <div style="height: 220px;"><canvas id="scene-chart"></canvas></div>
          </div>
          <div class="chart-box">
            <h4 style="margin-top: 0;">Rarity Mix</h4>
            <div style="height: 220px;"><canvas id="rarity-chart"></canvas></div>
          </div>
          <div class="chart-box">
            <h4 style="margin-top: 0;">Shares vs Views vs Downloads</h4>
            <div style="height: 220px;"><canvas id="funnel-chart"></canvas></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 style="margin-top: 0;">Top Cards (This Event)</h3>
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Card</th>
              <th>Owner</th>
              <th>Rarity</th>
              <th>Shares</th>
              <th>Views</th>
              <th>Downloads</th>
            </tr>
          </thead>
          <tbody>${topCardsRows}</tbody>
        </table>
      </div>
    `;

    buildDoughnutChart(
      "mood-chart",
      data.moodDistribution.map((mood) => `${mood.emoji} ${mood.label}`),
      data.moodDistribution.map((mood) => mood.count),
    );

    buildBarChart(
      "scene-chart",
      data.sceneDistribution.map((scene) => scene.label),
      data.sceneDistribution.map((scene) => scene.count),
      "Cards",
      "#36a2eb",
    );

    buildBarChart(
      "rarity-chart",
      data.rarityDistribution.map((rarity) => rarity.key),
      data.rarityDistribution.map((rarity) => rarity.count),
      "Cards",
      "#ff9f40",
    );

    buildBarChart(
      "funnel-chart",
      ["Shares", "Views", "Downloads"],
      [data.funnel.totalShares, data.funnel.totalViews, data.funnel.totalDownloads],
      "Engagement",
      "#4bc0c0",
    );
  } catch (error) {
    resetCharts();
    root.innerHTML = `<p style="color: #d9534f;">${error.message}</p>`;
  }
}

loadAnalytics();
