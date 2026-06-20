(() => {
  const data = window.dashboardData;
  const dashboardPassword = "Moss";
  const authStorageKey = "moss-dashboard-auth-v1";
  let dashboardInitialized = false;
  const state = {
    venue: "Alle",
    playerSearch: "",
    minutes: 180,
    appearances: 0,
    playerPoints: 0,
    goalDiff: "Alle",
    playerSort: "pointsPer90",
    selectedZoneCells: ["goal-zone"],
  };

  const goalTimingBuckets = [
    { key: "0-15", label: "0-15", from: 0, to: 15 },
    { key: "16-30", label: "16-30", from: 16, to: 30 },
    { key: "31-45", label: "31-45", from: 31, to: 45 },
    { key: "46-60", label: "46-60", from: 46, to: 60 },
    { key: "61-75", label: "61-75", from: 61, to: 75 },
    { key: "76-90+", label: "76-90+", from: 76, to: 130 },
  ];

  const zonePitchCells = [
    { visualKey: "cross-l", key: "cross-l", label: "Cross L", zone: "cross" },
    { visualKey: "assist-central", key: "assist-central", label: "Assist sentralt", zone: "assist" },
    { visualKey: "cross-r", key: "cross-r", label: "Cross R", zone: "cross" },
    { visualKey: "assist-side-l", key: "assist-left", label: "Assist V", zone: "assist" },
    { visualKey: "goal-zone", key: "goal-zone", label: "Goal zone", zone: "goal" },
    { visualKey: "assist-side-r", key: "assist-right", label: "Assist H", zone: "assist" },
    { visualKey: "assist-goal-l", key: "assist-left", label: "Assist V", zone: "assist" },
    { visualKey: "goal-zone-low", key: "goal-zone", label: "Goal zone", zone: "goal" },
    { visualKey: "assist-goal-r", key: "assist-right", label: "Assist H", zone: "assist" },
  ];

  const zoneSelectableCells = [
    { key: "cross-l", label: "Cross L", zone: "cross", forKeys: ["crossLeftFor"], againstKeys: ["crossLeftAgainst"] },
    {
      key: "assist-central",
      label: "Assist sentralt",
      zone: "assist",
      forKeys: ["assistCentralFor"],
      againstKeys: ["assistCentralAgainst"],
    },
    { key: "cross-r", label: "Cross R", zone: "cross", forKeys: ["crossRightFor"], againstKeys: ["crossRightAgainst"] },
    {
      key: "assist-left",
      label: "Assist venstre",
      zone: "assist",
      forKeys: ["assistLeftFor"],
      againstKeys: ["assistLeftAgainst"],
    },
    { key: "goal-zone", label: "Goal zone", zone: "goal", forKeys: ["goalZoneFor"], againstKeys: ["goalZoneAgainst"] },
    {
      key: "assist-right",
      label: "Assist høyre",
      zone: "assist",
      forKeys: ["assistRightFor"],
      againstKeys: ["assistRightAgainst"],
    },
  ];

  const zoneKpiDefinitions = [
    {
      key: "goal",
      title: "Goal zone",
      subtitle: "Involveringer i sentral avslutningssone",
      cells: ["goal-zone"],
    },
    {
      key: "assist",
      title: "Assist zone",
      subtitle: "Sentralt, side og assist-goalline samlet",
      cells: ["assist-central", "assist-left", "assist-right"],
    },
    {
      key: "cross",
      title: "Cross zone",
      subtitle: "Innleggssoner venstre og høyre",
      cells: ["cross-l", "cross-r"],
    },
  ];

  const zoneQuickSelections = zoneKpiDefinitions.map((definition) => ({
    key: definition.key,
    title: definition.title,
    cells: definition.cells,
  }));

  const sportscodeKpiByKey = Object.fromEntries(data.sportscodeKpis.map((kpi) => [kpi.key, kpi]));

  const element = (id) => document.getElementById(id);

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const number = (value, digits = 1) =>
    new Intl.NumberFormat("nb-NO", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  const integer = (value) => new Intl.NumberFormat("nb-NO").format(value);

  const metricPair = (forValue, againstValue) => `
    <span class="metric-pair">
      <span class="metric-for">${escapeHtml(forValue)}</span>
      <span class="metric-separator">-</span>
      <span class="metric-against">${escapeHtml(againstValue)}</span>
    </span>
  `;

  const shortDate = (value) => {
    const [day, month] = value.split("/");
    return `${day}.${month}`;
  };

  const average = (values) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const selectionInfo = (matches) => {
    const first = matches[0] ?? data.matches[0];
    const last = matches[matches.length - 1] ?? data.matches[data.matches.length - 1];

    return {
      first,
      last,
      period: `${shortDate(first.date)}-${shortDate(last.date)}`,
    };
  };

  const normalizeSearch = (value) =>
    String(value)
      .toLocaleLowerCase("nb-NO")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("æ", "ae")
      .replaceAll("ø", "o")
      .replaceAll("å", "a");

  const playerSortScore = (player) => {
    if (state.playerSort === "recordOnPitch") {
      return player.wins * 100 + player.draws * 10 - player.losses;
    }

    return Number(player[state.playerSort]);
  };

  const kpiSeriesForKeys = (keys, matches) =>
    matches.map((match) => ({
      matchNo: match.matchNo,
      opponent: match.opponent,
      opponentLogo: match.opponentLogo,
      value: keys.reduce((sum, key) => sum + (sportscodeKpiByKey[key]?.values[match.matchNo - 1] ?? 0), 0),
    }));

  const highestKpiMatch = (series) =>
    series.reduce(
      (best, item) => (item.value > best.value ? item : best),
      series[0] ?? { matchNo: 0, opponent: "-", value: 0 },
    );

  const zoneCellForKey = (cellKey) => zoneSelectableCells.find((cell) => cell.key === cellKey) ?? zoneSelectableCells[4];

  const normalizeSelectedCells = (cells) => {
    const uniqueCells = Array.from(new Set(cells));
    return uniqueCells.length ? uniqueCells : ["goal-zone"];
  };

  const buildZoneKpiGroups = (matches) =>
    zoneKpiDefinitions.map((definition) => {
      const cells = definition.cells.map(zoneCellForKey);
      const forSeries = kpiSeriesForKeys(cells.flatMap((cell) => cell.forKeys), matches);
      const againstSeries = kpiSeriesForKeys(cells.flatMap((cell) => cell.againstKeys), matches);
      const forTotal = forSeries.reduce((sum, item) => sum + item.value, 0);
      const againstTotal = againstSeries.reduce((sum, item) => sum + item.value, 0);

      return {
        ...definition,
        forSeries,
        againstSeries,
        forTotal,
        againstTotal,
        net: forTotal - againstTotal,
        avgFor: average(forSeries.map((item) => item.value)),
        avgAgainst: average(againstSeries.map((item) => item.value)),
        peakFor: highestKpiMatch(forSeries),
        peakAgainst: highestKpiMatch(againstSeries),
        lastMatch: forSeries[forSeries.length - 1] ?? { matchNo: 0, opponent: "-", opponentLogo: "", value: 0 },
        lastFor: forSeries[forSeries.length - 1]?.value ?? 0,
        lastAgainst: againstSeries[againstSeries.length - 1]?.value ?? 0,
      };
    });

  const zoneGroupsForCells = (groups, cells) => {
    const selectedZones = Array.from(new Set(normalizeSelectedCells(cells).map((cellKey) => zoneCellForKey(cellKey).zone)));

    return selectedZones.map((zone) => groups.find((group) => group.key === zone)).filter(Boolean);
  };

  const buildSelectedZoneSummary = (matches, groups, selectedCells) => {
    const cells = normalizeSelectedCells(selectedCells).map(zoneCellForKey);
    const selectedGroups = zoneGroupsForCells(groups, selectedCells);
    const firstGroup = selectedGroups[0] ?? groups[0];
    const forSeries = kpiSeriesForKeys(cells.flatMap((cell) => cell.forKeys), matches);
    const againstSeries = kpiSeriesForKeys(cells.flatMap((cell) => cell.againstKeys), matches);
    const forTotal = forSeries.reduce((sum, item) => sum + item.value, 0);
    const againstTotal = againstSeries.reduce((sum, item) => sum + item.value, 0);
    const zoneTitle = selectedGroups.map((group) => group.title).join(" + ") || firstGroup.title;

    return {
      cells,
      groups: selectedGroups,
      title: cells.length === 1 ? cells[0].label : `${cells.length} felt valgt`,
      subtitle: `${zoneTitle} samlet`,
      forSeries,
      againstSeries,
      forTotal,
      againstTotal,
      net: forTotal - againstTotal,
      avgFor: average(forSeries.map((item) => item.value)),
      avgAgainst: average(againstSeries.map((item) => item.value)),
      peakFor: highestKpiMatch(forSeries),
      peakAgainst: highestKpiMatch(againstSeries),
      lastMatch: forSeries[forSeries.length - 1] ?? { matchNo: 0, opponent: "-", opponentLogo: "", value: 0 },
      lastFor: forSeries[forSeries.length - 1]?.value ?? 0,
      lastAgainst: againstSeries[againstSeries.length - 1]?.value ?? 0,
    };
  };

  const goalTimingBucketFor = (goal) =>
    goalTimingBuckets.find((bucket) => goal.minute >= bucket.from && goal.minute <= bucket.to) ?? goalTimingBuckets[0];

  const buildGoalTiming = (matches) => {
    const matchNos = new Set(matches.map((match) => match.matchNo));
    const buckets = goalTimingBuckets.map((bucket) => ({
      ...bucket,
      forCount: 0,
      againstCount: 0,
    }));

    data.goals
      .filter((goal) => matchNos.has(goal.matchNo))
      .forEach((goal) => {
        const bucketKey = goalTimingBucketFor(goal).key;
        const target = buckets.find((bucket) => bucket.key === bucketKey) ?? buckets[0];

        if (goal.team === "Moss") {
          target.forCount += 1;
        } else {
          target.againstCount += 1;
        }
      });

    const totalFor = buckets.reduce((sum, bucket) => sum + bucket.forCount, 0);
    const totalAgainst = buckets.reduce((sum, bucket) => sum + bucket.againstCount, 0);
    const maxCount = Math.max(...buckets.flatMap((bucket) => [bucket.forCount, bucket.againstCount]), 1);
    const peakFor = buckets.reduce((best, bucket) => (bucket.forCount > best.forCount ? bucket : best), buckets[0]);
    const peakAgainst = buckets.reduce(
      (best, bucket) => (bucket.againstCount > best.againstCount ? bucket : best),
      buckets[0],
    );

    return { buckets, totalFor, totalAgainst, maxCount, peakFor, peakAgainst };
  };

  const filteredMatches = () =>
    data.matches.filter((match) => {
      return state.venue === "Alle" || match.venue === state.venue;
    });

  const summarizeMatches = (matches) => ({
    count: matches.length,
    xgFor: average(matches.map((match) => match.xgFor)),
    xgAgainst: average(matches.map((match) => match.xgAgainst)),
    shotsFor: average(matches.map((match) => match.shotsFor)),
    shotsOnTargetFor: average(matches.map((match) => match.shotsOnTargetFor)),
    possession: average(matches.map((match) => match.possession)),
    ppda: average(matches.map((match) => match.ppda)),
    codedEvents: matches.reduce((sum, match) => sum + match.codedEvents, 0),
  });

  const renderKpis = (summary, matches) => {
    const selected = selectionInfo(matches);
    const cards = [
      {
        label: "Kamper",
        value: `${summary.count}`,
        detail: `${selected.period} valgt`,
      },
      {
        label: "xG for",
        value: number(summary.xgFor),
        detail: `xG mot ${number(summary.xgAgainst)}`,
      },
      {
        label: "Skudd",
        value: number(summary.shotsFor),
        detail: `På mål ${number(summary.shotsOnTargetFor)} per kamp`,
      },
      {
        label: "PPDA / ball",
        value: `${number(summary.ppda)} / ${number(summary.possession, 0)}%`,
        detail: `${integer(summary.codedEvents)} kodede hendelser`,
      },
    ];

    element("kpis").innerHTML = cards
      .map(
        (card) => `
          <article class="kpi-card">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <small>${escapeHtml(card.detail)}</small>
          </article>
        `,
      )
      .join("");
  };

  const renderZonePitch = (selectedCells) => {
    const activeCells = normalizeSelectedCells(selectedCells);
    const primaryCell = zoneCellForKey(activeCells[0]);

    return `
      <div class="zone-pitch zone-${escapeHtml(primaryCell.zone)}" aria-label="Sonekart med flervalg">
        ${zonePitchCells
          .map(
            (cell) => `
              <button
                type="button"
                class="zone-cell ${activeCells.includes(cell.key) ? "is-active" : ""}"
                data-zone-cell-select="${escapeHtml(cell.key)}"
                aria-pressed="${activeCells.includes(cell.key) ? "true" : "false"}"
              >
                ${escapeHtml(cell.label)}
              </button>
            `,
          )
          .join("")}
        <em></em>
      </div>
    `;
  };

  const renderSportscodeKpis = (matches) => {
    const groups = buildZoneKpiGroups(matches);
    const activeCells = normalizeSelectedCells(state.selectedZoneCells);
    const summary = buildSelectedZoneSummary(matches, groups, activeCells);
    const maxBarValue = Math.max(
      ...summary.forSeries.map((item) => item.value),
      ...summary.againstSeries.map((item) => item.value),
      1,
    );
    const netLabel = summary.net > 0 ? `+${summary.net}` : `${summary.net}`;
    const selector = zoneQuickSelections
      .map(
        (item) => {
          const isActive = item.cells.every((cell) => activeCells.includes(cell));

          return `
            <button
              type="button"
              class="${isActive ? "is-active" : ""}"
              data-zone-quick-select="${escapeHtml(item.key)}"
              aria-pressed="${isActive ? "true" : "false"}"
            >
              ${escapeHtml(item.title)}
            </button>
          `;
        },
      )
      .join("");
    const bars = summary.forSeries
      .map((item, index) => {
        const against = summary.againstSeries[index]?.value ?? 0;

        return `
          <div class="zone-match-bar">
            <img src="./${escapeHtml(item.opponentLogo)}" alt="${escapeHtml(item.opponent)}" />
            <span>#${item.matchNo}</span>
            <div class="zone-match-values">
              <small class="for-value">${integer(item.value)}</small>
              <small class="against-value">${integer(against)}</small>
            </div>
            <div class="zone-match-columns">
              <i style="height:${Math.max(10, (item.value / maxBarValue) * 86)}px"></i>
              <b style="height:${Math.max(10, (against / maxBarValue) * 86)}px"></b>
            </div>
          </div>
        `;
      })
      .join("");

    element("sportscodeKpis").innerHTML = `
      <article class="zone-kpi-card">
        <div class="zone-kpi-head">
          <div>
            <span>Sportscode</span>
            <h3>${escapeHtml(summary.title)}</h3>
            <small>${escapeHtml(summary.subtitle)}</small>
          </div>
          <strong>${integer(summary.forTotal)}</strong>
        </div>

        <div class="zone-selector" aria-label="Hurtigvalg for Sportscode-sone">${selector}</div>

        <div class="zone-kpi-body">
          ${renderZonePitch(activeCells)}
          <div class="zone-detail">
            <div class="zone-scoreline">
              <div>
                <span>For</span>
                <strong>${integer(summary.forTotal)}</strong>
                <small>${number(summary.avgFor)} per kamp</small>
              </div>
              <div>
                <span>Mot</span>
                <strong>${integer(summary.againstTotal)}</strong>
                <small>${number(summary.avgAgainst)} per kamp</small>
              </div>
              <div>
                <span>Balanse</span>
                <strong class="${summary.net >= 0 ? "positive" : "negative"}">${escapeHtml(netLabel)}</strong>
                <small>valgt utvalg</small>
              </div>
            </div>

            <div class="zone-facts">
              <div>
                <span>Topp for</span>
                <strong>#${summary.peakFor.matchNo} ${summary.peakFor.value}</strong>
                <small>${escapeHtml(summary.peakFor.opponent)}</small>
              </div>
              <div>
                <span>Topp mot</span>
                <strong>#${summary.peakAgainst.matchNo} ${summary.peakAgainst.value}</strong>
                <small>${escapeHtml(summary.peakAgainst.opponent)}</small>
              </div>
              <div>
                <span>Siste kamp</span>
                <strong>#${summary.lastMatch.matchNo} ${escapeHtml(summary.lastMatch.opponent)}</strong>
                <small>${metricPair(summary.lastFor, summary.lastAgainst)} for-mot</small>
              </div>
            </div>

            <div class="zone-match-bars" aria-label="${escapeHtml(summary.title)} per kamp">${bars}</div>
            <div class="zone-legend">
              <span><i class="for"></i>For</span>
              <span><i class="against"></i>Mot</span>
            </div>
          </div>
        </div>
      </article>
    `;
  };

  const renderLineChart = (matches) => {
    const chartMatches = matches.length ? matches : data.matches;
    const width = 720;
    const height = 250;
    const padding = 28;
    const series = [
      { label: "xG for", values: chartMatches.map((match) => match.xgFor), color: "#3f9a5a" },
      { label: "xG mot", values: chartMatches.map((match) => match.xgAgainst), color: "#d24a43" },
    ];
    const allValues = series.flatMap((item) => item.values);
    const max = Math.max(...allValues, 3);
    const min = Math.min(...allValues, 0);
    const range = max - min || 1;

    const pointFor = (value, index, total) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, total - 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    };

    const grid = [0, 1, 2, 3]
      .map((line) => {
        const y = padding + (line * (height - padding * 2)) / 3;
        return `<line x1="${padding}" x2="${width - padding}" y1="${y}" y2="${y}" class="grid-line"></line>`;
      })
      .join("");

    const lines = series
      .map(
        (item) => `
          <polyline
            fill="none"
            stroke="${item.color}"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            points="${item.values.map((value, index) => pointFor(value, index, item.values.length)).join(" ")}"
          ></polyline>
        `,
      )
      .join("");

    const ticks = chartMatches
      .map((match, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(1, chartMatches.length - 1);
        return `
          <g>
            <line x1="${x}" x2="${x}" y1="${height - padding}" y2="${height - padding + 6}" class="axis-tick"></line>
            <text x="${x}" y="${height - 5}" text-anchor="middle">${match.matchNo}</text>
          </g>
        `;
      })
      .join("");

    const legend = series
      .map(
        (item) => `
          <span><i style="background-color:${item.color}"></i>${escapeHtml(item.label)}</span>
        `,
      )
      .join("");

    element("trendChart").innerHTML = `
      <div class="chart-wrap">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="xG trend">
          ${grid}
          ${lines}
          ${ticks}
        </svg>
        <div class="chart-legend">${legend}</div>
      </div>
    `;
  };

  const renderPracticalInfo = (matches, summary) => {
    const selected = selectionInfo(matches);
    const venueValue = state.venue === "Alle" ? "A" : state.venue.slice(0, 1);
    const items = [
      {
        label: "Periode",
        title: selected.period,
        detail: `${summary.count} kamper i utvalget`,
        value: `${summary.count}`,
      },
      {
        label: "Kampvalg",
        title: state.venue === "Alle" ? "Alle baner" : state.venue,
        detail: "Baneutvalget styrer kampoversikten og KPI-kortene",
        value: venueValue,
      },
      {
        label: "Siste kamp",
        title: `#${selected.last.matchNo} ${selected.last.opponent}`,
        detail: `${shortDate(selected.last.date)} · ${selected.last.venue}`,
        value: `#${selected.last.matchNo}`,
      },
      {
        label: "Datakilder",
        title: "Wyscout / Sportscode / Fotball.no",
        detail: "Kampdata, koder og praktiske hendelser",
        value: "3",
      },
    ];

    element("practicalCount").textContent = `${integer(summary.codedEvents)} koder`;
    element("practicalInfo").innerHTML = items
      .map(
        (item) => `
          <article class="practical-item">
            <div>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.detail)}</small>
            </div>
            <b>${escapeHtml(item.value)}</b>
          </article>
        `,
      )
      .join("");
  };

  const renderMatchTable = (matches) => {
    element("matchCount").textContent = `${matches.length} treff`;

    const rows = matches.length
      ? matches
          .map(
            (match) => `
              <div class="match-row">
                <div class="match-main">
                  <strong>#${match.matchNo} ${escapeHtml(match.opponent)}</strong>
                  <small>${escapeHtml(match.venue)}</small>
                </div>
                <span>${shortDate(match.date)}</span>
                ${metricPair(number(match.xgFor), number(match.xgAgainst))}
                ${metricPair(match.shotsFor, match.shotsAgainst)}
                <span>${number(match.ppda)}</span>
                <span>${number(match.possession, 0)}%</span>
                <span>${integer(match.codedEvents)}</span>
              </div>
            `,
          )
          .join("")
      : `<div class="empty-state">Ingen kamper i dette utvalget.</div>`;

    element("matchTable").innerHTML = `
      <div class="match-row match-head">
        <span>Kamp</span>
        <span>Dato</span>
        <span>xG</span>
        <span>Skudd</span>
        <span>PPDA</span>
        <span>Ball</span>
        <span>Koder</span>
      </div>
      ${rows}
    `;
  };

  const renderCodes = () => {
    const maxCodeTotal = Math.max(...data.codeMatrix.map((row) => row.total));
    element("codeMax").textContent = integer(maxCodeTotal);
    element("opponentStrip").innerHTML = data.matches
      .map(
        (match) => `
          <div class="opponent-chip" title="#${match.matchNo} ${escapeHtml(match.opponent)}">
            <img src="./${escapeHtml(match.opponentLogo)}" alt="${escapeHtml(match.opponent)}" />
            <span>#${match.matchNo}</span>
          </div>
        `,
      )
      .join("");
    element("codeBars").innerHTML = data.codeMatrix
      .map((row) => {
        const width = `${Math.max(5, (row.total / maxCodeTotal) * 100)}%`;
        const localMax = Math.max(...row.values);
        const cells = row.values
          .map((value, index) => {
            const alpha = localMax ? 0.18 + (value / localMax) * 0.72 : 0.12;
            return `<span style="background-color:rgba(214, 173, 69, ${alpha})" title="Kamp ${index + 1}: ${value}">${value}</span>`;
          })
          .join("");

        return `
          <div class="code-row">
            <div class="code-label">
              <strong>${escapeHtml(row.code)}</strong>
              <span>${row.total}</span>
            </div>
            <div class="code-track"><div style="width:${width}"></div></div>
            <div class="heat-cells">${cells}</div>
          </div>
        `;
      })
      .join("");
  };

  const renderPlayers = () => {
    const search = normalizeSearch(state.playerSearch.trim());
    const players = [...data.players]
      .filter((player) => {
        const searchMatch =
          !search || normalizeSearch(`${player.player} ${player.number}`).includes(search);
        const goalDiffMatch =
          state.goalDiff === "Alle" ||
          (state.goalDiff === "Pluss" && player.goalDiffOn > 0) ||
          (state.goalDiff === "Null" && player.goalDiffOn === 0) ||
          (state.goalDiff === "Minus" && player.goalDiffOn < 0);

        return (
          searchMatch &&
          player.minutes >= state.minutes &&
          player.appearances >= state.appearances &&
          player.points >= state.playerPoints &&
          goalDiffMatch
        );
      })
      .sort((a, b) => playerSortScore(b) - playerSortScore(a));

    element("playerCount").textContent = `${players.length}/${data.players.length} spillere`;
    element("playerTable").innerHTML = `
      <div class="player-row player-head">
        <span>Spiller</span>
        <button type="button" class="sort-header ${state.playerSort === "appearances" ? "is-active" : ""}" data-player-sort="appearances">Kamper</button>
        <button type="button" class="sort-header ${state.playerSort === "minutes" ? "is-active" : ""}" data-player-sort="minutes">Min</button>
        <button type="button" class="sort-header ${state.playerSort === "points" ? "is-active" : ""}" data-player-sort="points">Poeng</button>
        <button type="button" class="sort-header ${state.playerSort === "pointsPer90" ? "is-active" : ""}" data-player-sort="pointsPer90">P/90</button>
        <button type="button" class="sort-header ${state.playerSort === "goalDiffPer90" ? "is-active" : ""}" data-player-sort="goalDiffPer90">MF/90</button>
        <button type="button" class="sort-header ${state.playerSort === "recordOnPitch" ? "is-active" : ""}" data-player-sort="recordOnPitch">Rekke</button>
      </div>
      ${
        players.length
          ? players
              .map(
                (player) => `
                  <div class="player-row">
                    <div class="player-name">
                      <b>${player.number}</b>
                      <strong>${escapeHtml(player.player)}</strong>
                    </div>
                    <span>${player.appearances}</span>
                    <span>${player.minutes}</span>
                    <span>${player.points}</span>
                    <span>${number(player.pointsPer90, 2)}</span>
                    <span class="${player.goalDiffPer90 >= 0 ? "positive" : "negative"}">${number(player.goalDiffPer90, 2)}</span>
                    <span>${escapeHtml(player.recordOnPitch)}</span>
                  </div>
                `,
              )
              .join("")
          : `<div class="player-empty">Ingen spillere i dette utvalget.</div>`
      }
    `;
  };

  const renderContributions = () => {
    const totals = data.contributions.reduce(
      (acc, player) => ({
        goals: acc.goals + player.goals,
        assists: acc.assists + player.assists,
        yellowCards: acc.yellowCards + player.yellowCards,
        redCards: acc.redCards + player.redCards,
      }),
      { goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    );

    element("contributionCount").textContent = `${totals.goals} mål`;
    element("contributionTable").innerHTML = `
      <div class="contribution-row contribution-head">
        <span>Spiller</span>
        <span>Mål</span>
        <span>Assist</span>
        <span>Gule</span>
        <span>Røde</span>
      </div>
      ${data.contributions
        .map(
          (player) => `
            <div class="contribution-row">
              <strong>${escapeHtml(player.player)}</strong>
              <span>${player.goals}</span>
              <span>${player.assists}</span>
              <span class="yellow-count">${player.yellowCards}</span>
              <span class="red-count">${player.redCards}</span>
            </div>
          `,
        )
        .join("")}
      <div class="contribution-row contribution-total">
        <strong>Totalt</strong>
        <span>${totals.goals}</span>
        <span>${totals.assists}</span>
        <span class="yellow-count">${totals.yellowCards}</span>
        <span class="red-count">${totals.redCards}</span>
      </div>
    `;
  };

  const renderGoalTiming = (matches) => {
    const timing = buildGoalTiming(matches);

    element("goalTimingCount").innerHTML = metricPair(timing.totalFor, timing.totalAgainst);
    element("goalTimingSummary").innerHTML = `
      <div>
        <span>For</span>
        <strong>${timing.totalFor}</strong>
        <small>Topper ${escapeHtml(timing.peakFor.label)}</small>
      </div>
      <div>
        <span>Mot</span>
        <strong>${timing.totalAgainst}</strong>
        <small>Topper ${escapeHtml(timing.peakAgainst.label)}</small>
      </div>
    `;

    element("goalTimingBars").innerHTML = timing.buckets
      .map(
        (bucket) => `
          <div class="timing-row">
            <span>${escapeHtml(bucket.label)}</span>
            <div class="timing-track">
              <i style="width:${(bucket.forCount / timing.maxCount) * 100}%"></i>
              <b style="width:${(bucket.againstCount / timing.maxCount) * 100}%"></b>
            </div>
            <strong>${metricPair(bucket.forCount, bucket.againstCount)}</strong>
          </div>
        `,
      )
      .join("");
  };

  const render = () => {
    const matches = filteredMatches();
    const summary = summarizeMatches(matches);
    renderKpis(summary, matches);
    renderSportscodeKpis(matches);
    renderLineChart(matches);
    element("trendCount").textContent = `${summary.count} kamper`;
    renderPracticalInfo(matches, summary);
    renderMatchTable(matches);
    renderGoalTiming(matches);
    renderPlayers();
  };

  const bindSegmentedControls = () => {
    document.querySelectorAll("[data-filter-group]").forEach((group) => {
      const key = group.dataset.filterGroup;
      group.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          group.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
          button.classList.add("is-active");

          if (key === "minutes") {
            state.minutes = Number(button.dataset.value);
          } else if (["appearances", "playerPoints"].includes(key)) {
            state[key] = Number(button.dataset.value);
          } else {
            state[key] = button.dataset.value;
          }

          render();
        });
      });
    });

    element("playerTable").addEventListener("click", (event) => {
      const button = event.target.closest("[data-player-sort]");
      if (!button) return;
      state.playerSort = button.dataset.playerSort;
      renderPlayers();
    });

    element("playerSearch").addEventListener("input", (event) => {
      state.playerSearch = event.target.value;
      renderPlayers();
    });

    element("sportscodeKpis").addEventListener("click", (event) => {
      const quickButton = event.target.closest("[data-zone-quick-select]");
      if (quickButton) {
        const quickSelection = zoneQuickSelections.find((item) => item.key === quickButton.dataset.zoneQuickSelect);

        if (!quickSelection) return;

        state.selectedZoneCells = normalizeSelectedCells(quickSelection.cells);
        renderSportscodeKpis(filteredMatches());
        return;
      }

      const button = event.target.closest("[data-zone-cell-select]");
      if (!button) return;

      const cell = button.dataset.zoneCellSelect;
      if (!zoneSelectableCells.some((item) => item.key === cell)) return;

      const selectedCells = new Set(state.selectedZoneCells);
      if (selectedCells.has(cell)) {
        selectedCells.delete(cell);
      } else {
        selectedCells.add(cell);
      }

      state.selectedZoneCells = normalizeSelectedCells([...selectedCells]);
      renderSportscodeKpis(filteredMatches());
    });
  };

  const initDashboard = () => {
    if (dashboardInitialized) return;

    dashboardInitialized = true;
    const firstMatch = data.matches[0];
    const lastMatch = data.matches[data.matches.length - 1];
    element("dateRange").textContent = `${data.summary.matches} kamper fra ${shortDate(firstMatch.date)} til ${shortDate(
      lastMatch.date,
    )}. Wyscout, Sportscode og praktisk kampinformasjon samlet i én prestasjonsflate.`;

    bindSegmentedControls();
    renderCodes();
    renderContributions();
    render();
  };

  const showDashboard = () => {
    element("passwordGate").hidden = true;
    element("dashboardShell").hidden = false;
    initDashboard();
  };

  const bindPasswordGate = () => {
    if (window.localStorage.getItem(authStorageKey) === "ok") {
      showDashboard();
      return;
    }

    const form = element("passwordForm");
    const input = element("dashboardPassword");
    const error = element("passwordError");

    element("passwordGate").hidden = false;
    element("dashboardShell").hidden = true;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (input.value.trim() === dashboardPassword) {
        window.localStorage.setItem(authStorageKey, "ok");
        input.value = "";
        error.hidden = true;
        showDashboard();
        return;
      }

      error.hidden = false;
      input.focus();
    });
  };

  bindPasswordGate();
})();
