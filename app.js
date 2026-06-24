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
    individualSearch: "",
    selectedIndividualPlayer: "",
    individualTab: "oversikt",
    selectedGpsMatchNo: "",
    selectedGpsPlayer: "all",
    gpsView: "match",
    gpsSort: "totalDistance",
    gpsSortDirection: "desc",
    gpsPlayerFilter: "",
    gpsMetric: "all",
    comparedIndividualPlayers:
      data.individualPlayers
        ?.filter((player) => player.matches.length)
        .slice(0, 3)
        .map((player) => player.player) ?? [],
  };

  const gpsViewOptions = [
    { key: "match", label: "Alle i kamp" },
    { key: "progression", label: "Spillerprogresjon" },
  ];
  const gpsTeamProgressionKey = "__team__";
  const gpsTeamProgressionLabel = "Totalt lag";
  const gpsMetricOptions = [
    { key: "all", label: "Alle" },
    { key: "total", label: "Total" },
    { key: "hsr", label: "HSR" },
    { key: "sprint", label: "Sprint" },
  ];
  const gpsSortOptions = [
    { key: "player", label: "Spiller" },
    { key: "minutes", label: "Min" },
    { key: "totalDistance", label: "Total" },
    { key: "distancePerMinute", label: "m/min" },
    { key: "highSpeedRunning", label: "HSR" },
    { key: "sprintDistance", label: "Sprint" },
    { key: "sprints", label: "Spr." },
    { key: "maxSpeed", label: "Max" },
    { key: "accelerations", label: "Aks/des" },
    { key: "dynamicStressLoad", label: "DSL" },
  ];

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

  const individualTabs = [
    { key: "oversikt", label: "Oversikt" },
    { key: "angrep", label: "Angrep" },
    { key: "pasning", label: "Pasning" },
    { key: "forsvar", label: "Forsvar" },
    { key: "kamp", label: "Kamp for kamp" },
  ];

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

  const pct = (successful, total) => (total ? (successful / total) * 100 : 0);
  const per90 = (value, minutes) => (minutes ? (value / minutes) * 90 : 0);
  const formatKm = (value, digits = 1) => `${number(value / 1000, digits)} km`;

  const buildGpsRowsSummary = (rows) => {
    const topSpeed = rows.reduce(
      (best, row) => (row.maxSpeed > best.value ? { player: row.player, value: row.maxSpeed } : best),
      { player: "-", value: 0 },
    );
    const topDistance = rows.reduce(
      (best, row) => (row.totalDistance > best.value ? { player: row.player, value: row.totalDistance } : best),
      { player: "-", value: 0 },
    );

    return {
      playerEntries: rows.length,
      totalDistance: rows.reduce((sum, row) => sum + row.totalDistance, 0),
      highSpeedRunning: rows.reduce((sum, row) => sum + row.highSpeedRunning, 0),
      sprintDistance: rows.reduce((sum, row) => sum + row.sprintDistance, 0),
      sprints: rows.reduce((sum, row) => sum + row.sprints, 0),
      accelerations: rows.reduce((sum, row) => sum + row.accelerations, 0),
      decelerations: rows.reduce((sum, row) => sum + row.decelerations, 0),
      dynamicStressLoad: rows.reduce((sum, row) => sum + row.dynamicStressLoad, 0),
      distancePerMinute: average(rows.map((row) => row.distancePerMinute)),
      topSpeed,
      topDistance,
    };
  };

  const buildGpsPlayerAverages = (rows) => ({
    matches: rows.length,
    totalDistance: average(rows.map((row) => row.totalDistance)),
    highSpeedRunning: average(rows.map((row) => row.highSpeedRunning)),
    sprintDistance: average(rows.map((row) => row.sprintDistance)),
    distancePerMinute: average(rows.map((row) => row.distancePerMinute)),
    maxSpeed: Math.max(0, ...rows.map((row) => row.maxSpeed)),
  });

  const buildGpsTeamAverageRow = (match) => {
    if (!match.players.length) return null;

    return {
      player: gpsTeamProgressionLabel,
      date: match.date,
      totalDistance: average(match.players.map((row) => row.totalDistance)),
      sprintDistance: average(match.players.map((row) => row.sprintDistance)),
      highSpeedRunning: average(match.players.map((row) => row.highSpeedRunning)),
      accelerations: average(match.players.map((row) => row.accelerations)),
      decelerations: average(match.players.map((row) => row.decelerations)),
      sprints: average(match.players.map((row) => row.sprints)),
      dynamicStressLoad: average(match.players.map((row) => row.dynamicStressLoad)),
      hmldPerMinute: average(match.players.map((row) => row.hmldPerMinute)),
      distancePerMinute: average(match.players.map((row) => row.distancePerMinute)),
      maxSpeed: average(match.players.map((row) => row.maxSpeed)),
      ...(match.sprintDistanceQuality === "suspect" ? { sprintDistanceQuality: "suspect" } : {}),
    };
  };

  const gpsPlayerEntries = (matches, player) =>
    matches.map((match) => ({
      match,
      row: match.players.find((item) => item.player === player) ?? null,
    }));

  const gpsTeamEntries = (matches) =>
    matches.map((match) => ({
      match,
      row: buildGpsTeamAverageRow(match),
    }));

  const gpsSortValue = (row, sortBy) => {
    if (sortBy === "player") return row.player;
    if (sortBy === "minutes") return gpsMinutes(row);
    return row[sortBy] ?? 0;
  };

  const sortGpsRows = (rows, sortBy, direction) => {
    const multiplier = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const valueA = gpsSortValue(a, sortBy);
      const valueB = gpsSortValue(b, sortBy);
      if (typeof valueA === "string" || typeof valueB === "string") {
        return multiplier * String(valueA).localeCompare(String(valueB), "nb-NO");
      }

      return multiplier * (valueA - valueB) || a.player.localeCompare(b.player, "nb-NO");
    });
  };

  const isGpsSprintSuspect = (entry) => entry.match.sprintDistanceQuality === "suspect" || entry.row?.sprintDistanceQuality === "suspect";

  const gpsMinutes = (row) => (row.distancePerMinute > 0 ? row.totalDistance / row.distancePerMinute : 0);

  const gpsTeamMetricConfig = {
    total: { label: "Total", field: "totalDistance", className: "is-total" },
    hsr: { label: "HSR", field: "highSpeedRunning", className: "is-hsr" },
    sprint: { label: "Sprint", field: "sprintDistance", className: "is-sprint" },
  };

  const gpsTeamMetricKeys = (metricFilter) => {
    if (metricFilter === "total") return ["total"];
    if (metricFilter === "hsr") return ["hsr"];
    if (metricFilter === "sprint") return ["sprint"];
    return ["total", "hsr", "sprint"];
  };

  const formatGpsTeamMetric = (key, value) => (key === "total" ? formatKm(value, 1) : `${integer(Math.round(value))} m`);

  const gpsTeamMetricOffset = (key, metricFilter) => {
    if (metricFilter !== "all") return 0;
    if (key === "total") return -26;
    if (key === "hsr") return 0;
    return 26;
  };

  const gpsTeamMetricSummary = (match, key) => {
    if (key === "sprint" && match.sprintDistanceQuality === "suspect") return null;

    const config = gpsTeamMetricConfig[key];
    const rows = match.players.filter((row) => !(key === "sprint" && row.sprintDistanceQuality === "suspect"));
    if (!rows.length) return null;

    const sortedRows = [...rows].sort((a, b) => b[config.field] - a[config.field]);
    return {
      average: average(rows.map((row) => row[config.field])),
      highest: sortedRows[0],
      lowest: sortedRows[sortedRows.length - 1],
    };
  };

  const buildGpsProgressChart = (entries, metricFilter, teamMatches = []) => {
    const width = 920;
    const height = 390;
    const padding = { top: 24, right: 34, bottom: 84, left: 74 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const showTotal = metricFilter === "all" || metricFilter === "total";
    const showHsr = metricFilter === "all" || metricFilter === "hsr";
    const showSprint = metricFilter === "all" || metricFilter === "sprint";
    const chartMax = Math.max(
      1,
      ...entries.flatMap((entry) => {
        if (!entry.row) return [];
        const values = [];
        if (showTotal) values.push(entry.row.totalDistance);
        if (showHsr) values.push(entry.row.highSpeedRunning);
        if (showSprint && !isGpsSprintSuspect(entry)) values.push(entry.row.sprintDistance);
        return values;
      }),
      ...teamMatches.flatMap((match) =>
        gpsTeamMetricKeys(metricFilter).flatMap((key) => {
          const config = gpsTeamMetricConfig[key];
          const metric = gpsTeamMetricSummary(match, key);
          return metric ? [metric.average, metric.highest[config.field], metric.lowest[config.field]] : [];
        }),
      ),
    );
    const xForIndex = (index) => padding.left + (entries.length <= 1 ? plotWidth / 2 : (plotWidth / (entries.length - 1)) * index);
    const yForValue = (value) => padding.top + plotHeight - (value / chartMax) * plotHeight;
    const pathFor = (metric) => {
      let segmentOpen = false;
      return entries
        .map(({ row }, index) => {
          if (!row || (metric === "sprintDistance" && isGpsSprintSuspect({ row, match: entries[index].match }))) {
            segmentOpen = false;
            return "";
          }

          const y = yForValue(row[metric]);
          const command = segmentOpen ? "L" : "M";
          segmentOpen = true;
          return `${command}${xForIndex(index).toFixed(1)} ${y.toFixed(1)}`;
        })
        .filter(Boolean)
        .join(" ");
    };
    const valueTicks = [0, 0.5, 1].map((ratio) => ({
      value: chartMax * ratio,
      y: padding.top + plotHeight - plotHeight * ratio,
    }));

    return {
      width,
      height,
      padding,
      plotHeight,
      plotWidth,
      xForIndex,
      yForValue,
      totalPath: pathFor("totalDistance"),
      hsrPath: pathFor("highSpeedRunning"),
      sprintPath: pathFor("sprintDistance"),
      valueTicks,
    };
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
    const height = 285;
    const padding = 28;
    const plotBottom = height - 56;
    const plotHeight = plotBottom - padding;
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
      const y = plotBottom - ((value - min) / range) * plotHeight;
      return `${x},${y}`;
    };

    const grid = [0, 1, 2, 3]
      .map((line) => {
        const y = padding + (line * plotHeight) / 3;
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
            <line x1="${x}" x2="${x}" y1="${plotBottom}" y2="${plotBottom + 6}" class="axis-tick"></line>
            <text x="${x}" y="${plotBottom + 18}" text-anchor="middle">${match.matchNo}</text>
            <circle cx="${x}" cy="${plotBottom + 35}" r="13" class="chart-logo-bg"></circle>
            <image href="./${escapeHtml(match.opponentLogo)}" x="${x - 10}" y="${plotBottom + 25}" width="20" height="20" preserveAspectRatio="xMidYMid meet">
              <title>#${match.matchNo} ${escapeHtml(match.opponent)}</title>
            </image>
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

  const renderGpsMatches = (matches) => {
    const source = data.gpsSource ?? { available: false };
    const gpsModule = element("gpsMatchModule");
    if (!source.available || !data.gpsMatches?.length) {
      gpsModule.hidden = true;
      return;
    }

    const selectedMatchNos = new Set(matches.map((match) => match.matchNo));
    const gpsMatches = data.gpsMatches.filter((match) => selectedMatchNos.has(match.matchNo));
    if (!gpsMatches.length) {
      gpsModule.hidden = true;
      return;
    }

    const progressionMatches = data.gpsMatches ?? [];
    const matchInfoByNo = new Map(data.matches.map((match) => [match.matchNo, match]));
    const gpsView = state.gpsView === "progression" ? "progression" : "match";
    const gpsSort = gpsSortOptions.some((option) => option.key === state.gpsSort) ? state.gpsSort : "totalDistance";
    const gpsSortDirection = state.gpsSortDirection === "asc" ? "asc" : "desc";
    const latestMatchNo = gpsMatches[gpsMatches.length - 1]?.matchNo ?? "";
    const effectiveMatchNo = gpsMatches.some((match) => String(match.matchNo) === String(state.selectedGpsMatchNo))
      ? state.selectedGpsMatchNo
      : String(latestMatchNo);
    const activeMatch =
      gpsMatches.find((match) => String(match.matchNo) === String(effectiveMatchNo)) ?? gpsMatches[gpsMatches.length - 1];
    const playerOptions = [...activeMatch.players].sort((a, b) => a.player.localeCompare(b.player, "nb-NO"));
    const allPlayerNames = [...new Set(progressionMatches.flatMap((match) => match.players.map((player) => player.player)))].sort((a, b) =>
      a.localeCompare(b, "nb-NO"),
    );
    const progressionPlayer =
      state.selectedGpsPlayer === gpsTeamProgressionKey
        ? gpsTeamProgressionKey
        : allPlayerNames.includes(state.selectedGpsPlayer)
          ? state.selectedGpsPlayer
          : gpsTeamProgressionKey;
    const effectivePlayer =
      gpsView === "progression"
        ? progressionPlayer
        : state.selectedGpsPlayer === "all" || playerOptions.some((player) => player.player === state.selectedGpsPlayer)
          ? state.selectedGpsPlayer
          : "all";
    const normalizedGpsFilter = normalizeSearch(state.gpsPlayerFilter.trim());
    const matchPlayerRows = activeMatch.players
      .filter((player) => effectivePlayer === "all" || player.player === effectivePlayer)
      .filter((player) => effectivePlayer !== "all" || !normalizedGpsFilter || normalizeSearch(player.player).includes(normalizedGpsFilter));
    const playerRows = sortGpsRows(matchPlayerRows, gpsSort, gpsSortDirection);
    const summary = buildGpsRowsSummary(playerRows);
    const selectionLabel =
      effectivePlayer === "all"
        ? normalizedGpsFilter
          ? `${playerRows.length}/${activeMatch.players.length} spillere`
          : `${playerRows.length} spillere`
        : (playerRows[0]?.player ?? "Ingen spiller");
    const progressionEntries =
      effectivePlayer === gpsTeamProgressionKey
        ? gpsTeamEntries(progressionMatches)
        : effectivePlayer
          ? gpsPlayerEntries(progressionMatches, effectivePlayer)
          : [];
    const progressionRows = progressionEntries.map((entry) => entry.row).filter(Boolean);
    const cleanSprintRows = progressionEntries.filter((entry) => entry.row && !isGpsSprintSuspect(entry)).map((entry) => entry.row);
    const progressionAverages = buildGpsPlayerAverages(progressionRows);
    const cleanSprintAverage = average(cleanSprintRows.map((row) => row.sprintDistance));
    const progressionLabel = effectivePlayer === gpsTeamProgressionKey ? gpsTeamProgressionLabel : (effectivePlayer || "-");
    const gpsMetric = gpsMetricOptions.some((option) => option.key === state.gpsMetric) ? state.gpsMetric : "all";
    const showTotalLine = gpsMetric === "all" || gpsMetric === "total";
    const showHsrLine = gpsMetric === "all" || gpsMetric === "hsr";
    const showSprintLine = gpsMetric === "all" || gpsMetric === "sprint";
    const teamMetricKeys = gpsTeamMetricKeys(gpsMetric);
    const showTeamRange = gpsView === "progression" && effectivePlayer === gpsTeamProgressionKey;
    const progressionChart = buildGpsProgressChart(progressionEntries, gpsMetric, showTeamRange ? progressionMatches : []);

    gpsModule.hidden = false;
    element("gpsMatchCount").textContent =
      gpsView === "match" ? `#${activeMatch.matchNo} ${activeMatch.opponent}` : `${progressionRows.length}/${progressionEntries.length} GPS-kamper`;
    element("gpsSource").innerHTML = `
      <strong>${escapeHtml(source.fileName)}</strong>
      <span>Velg kampoversikt for én kamp, eller spillerprogresjon med alle GPS-kampene for spilleren.</span>
    `;
    element("gpsMatchSelector").innerHTML = `
      <label>
        <span>Visning</span>
        <select data-gps-view-select>
          ${gpsViewOptions
            .map(
              (option) => `
                <option value="${option.key}" ${gpsView === option.key ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `,
            )
            .join("")}
        </select>
      </label>
      ${
        gpsView === "match"
          ? `
      <label>
        <span>Kamp</span>
        <select data-gps-match-select>
          ${gpsMatches
            .map(
              (match) => `
                <option value="${match.matchNo}" ${String(effectiveMatchNo) === String(match.matchNo) ? "selected" : ""}>
                  #${match.matchNo} ${escapeHtml(match.opponent)}
                </option>
              `,
            )
            .join("")}
        </select>
      </label>
      `
          : ""
      }
      <label>
        <span>${gpsView === "progression" ? "Utvalg" : "Spiller"}</span>
        <select data-gps-player-select>
          ${
            gpsView === "match"
              ? `<option value="all" ${effectivePlayer === "all" ? "selected" : ""}>Alle spillere i kampen</option>`
              : ""
          }
          ${
            gpsView === "progression"
              ? `<option value="${gpsTeamProgressionKey}" ${effectivePlayer === gpsTeamProgressionKey ? "selected" : ""}>${gpsTeamProgressionLabel}</option>`
              : ""
          }
          ${(gpsView === "match" ? playerOptions.map((player) => player.player) : allPlayerNames)
            .map(
              (player) => `
                <option value="${escapeHtml(player)}" ${effectivePlayer === player ? "selected" : ""}>${escapeHtml(player)}</option>
              `,
            )
            .join("")}
        </select>
      </label>
      ${
        gpsView === "match" && effectivePlayer === "all"
          ? `
      <label>
        <span>Filter</span>
        <input type="search" value="${escapeHtml(state.gpsPlayerFilter)}" placeholder="Søk spiller" data-gps-player-filter />
      </label>
      `
          : ""
      }
      ${
        gpsView === "match"
          ? `
      <label>
        <span>Sorter ${gpsSortDirection === "desc" ? "høy-lav" : "lav-høy"}</span>
        <select data-gps-sort-select>
          ${gpsSortOptions
            .map(
              (option) => `
                <option value="${option.key}" ${gpsSort === option.key ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `,
            )
            .join("")}
        </select>
      </label>
      `
          : `
      <label>
        <span>Metrikk</span>
        <select data-gps-metric-select>
          ${gpsMetricOptions
            .map(
              (option) => `
                <option value="${option.key}" ${gpsMetric === option.key ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `,
            )
            .join("")}
        </select>
      </label>
      `
      }
    `;
    element("gpsSummary").innerHTML =
      gpsView === "match"
        ? `
      <article>
        <span>Total distanse</span>
        <strong>${formatKm(summary.totalDistance, 1)}</strong>
        <small>${escapeHtml(selectionLabel)} · ${number(summary.distancePerMinute, 1)} m/min</small>
      </article>
      <article>
        <span>High speed</span>
        <strong>${integer(Math.round(summary.highSpeedRunning))} m</strong>
        <small>Sprint ${integer(Math.round(summary.sprintDistance))} m</small>
      </article>
      <article>
        <span>Sprinter</span>
        <strong>${integer(Math.round(summary.sprints))}</strong>
        <small>${integer(Math.round(summary.accelerations))} aks · ${integer(Math.round(summary.decelerations))} des</small>
      </article>
      <article>
        <span>Toppfart</span>
        <strong>${number(summary.topSpeed.value, 1)} km/t</strong>
        <small>Lengst ${escapeHtml(summary.topDistance.player)} ${formatKm(summary.topDistance.value, 1)}</small>
      </article>
    `
        : `
      <article>
        <span>Snitt total</span>
        <strong>${formatKm(progressionAverages.totalDistance, 1)}</strong>
        <small>${integer(progressionAverages.matches)} kamper med GPS-data</small>
      </article>
      <article>
        <span>Snitt HSR</span>
        <strong>${integer(Math.round(progressionAverages.highSpeedRunning))} m</strong>
        <small>${number(progressionAverages.distancePerMinute, 1)} m/min i snitt</small>
      </article>
      <article>
        <span>Snitt sprint</span>
        <strong>${integer(Math.round(cleanSprintAverage))} m</strong>
        <small>${integer(cleanSprintRows.length)}/${integer(progressionEntries.length)} kamper med OK sprintdata</small>
      </article>
      <article>
        <span>Utvalg</span>
        <strong>${escapeHtml(progressionLabel)}</strong>
        <small>${effectivePlayer === gpsTeamProgressionKey ? "Lagsnitt kamp-for-kamp" : "Individuell kamp-for-kamp utvikling"}</small>
      </article>
    `;

    const matchTable = `
      <div class="gps-table">
      <div class="gps-row gps-head">
        ${gpsSortOptions
          .map(
            (option) => `
              <button
                type="button"
                class="gps-sort-button ${gpsSort === option.key ? `is-active is-${gpsSortDirection}` : ""}"
                data-gps-table-sort="${option.key}"
              >
                ${escapeHtml(option.label)}
              </button>
            `,
          )
          .join("")}
      </div>
      ${playerRows
        .map(
          (row) => `
            <div class="gps-row">
              <strong>${escapeHtml(row.player)}</strong>
              <span>${integer(Math.round(gpsMinutes(row)))}</span>
              <span>${integer(Math.round(row.totalDistance))}</span>
              <span>${number(row.distancePerMinute, 1)}</span>
              <span>${integer(Math.round(row.highSpeedRunning))}</span>
              <span>${integer(Math.round(row.sprintDistance))}</span>
              <span>${integer(Math.round(row.sprints))}</span>
              <span>${number(row.maxSpeed, 1)}</span>
              <span>${integer(Math.round(row.accelerations))}/${integer(Math.round(row.decelerations))}</span>
              <span>${integer(Math.round(row.dynamicStressLoad))}</span>
            </div>
          `,
        )
        .join("")}
      ${!playerRows.length ? `<div class="gps-empty">Ingen spillere matcher filteret.</div>` : ""}
      </div>
    `;
    const progressChart = progressionEntries.length
      ? `
        <svg class="gps-progress-chart" viewBox="0 0 ${progressionChart.width} ${progressionChart.height}" role="img" aria-label="GPS progresjon for ${escapeHtml(progressionLabel)}">
          <line x1="${progressionChart.padding.left}" y1="${progressionChart.padding.top}" x2="${progressionChart.padding.left}" y2="${progressionChart.padding.top + progressionChart.plotHeight}" class="gps-axis"></line>
          <line x1="${progressionChart.padding.left}" y1="${progressionChart.padding.top + progressionChart.plotHeight}" x2="${progressionChart.padding.left + progressionChart.plotWidth}" y2="${progressionChart.padding.top + progressionChart.plotHeight}" class="gps-axis"></line>
          ${progressionChart.valueTicks
            .map(
              (tick) => `
                <g>
                  <line x1="${progressionChart.padding.left}" y1="${tick.y}" x2="${progressionChart.padding.left + progressionChart.plotWidth}" y2="${tick.y}" class="gps-grid-line"></line>
                  <text x="${progressionChart.padding.left - 12}" y="${tick.y + 4}" text-anchor="end" class="gps-axis-label">${integer(Math.round(tick.value))}</text>
                </g>
              `,
            )
            .join("")}
          <text x="${progressionChart.padding.left - 48}" y="${progressionChart.padding.top - 8}" class="gps-axis-title">m</text>
          ${showTotalLine ? `<path d="${progressionChart.totalPath}" class="gps-line is-total"></path>` : ""}
          ${showHsrLine ? `<path d="${progressionChart.hsrPath}" class="gps-line is-hsr"></path>` : ""}
          ${showSprintLine ? `<path d="${progressionChart.sprintPath}" class="gps-line is-sprint"></path>` : ""}
          ${progressionEntries
            .map(({ match, row }, index) => {
              const x = progressionChart.xForIndex(index);
              const axisBottom = progressionChart.padding.top + progressionChart.plotHeight;
              const matchInfo = matchInfoByNo.get(match.matchNo);
              const opponentLogo = matchInfo?.opponentLogo;
              const opponentName = matchInfo?.opponent ?? match.opponent;
              return `
                <g>
                  <line x1="${x}" y1="${axisBottom}" x2="${x}" y2="${axisBottom + 5}" class="gps-axis"></line>
                  <circle cx="${x}" cy="${axisBottom + 24}" r="17" class="gps-logo-bg"></circle>
                  ${
                    opponentLogo
                      ? `<image href="./${escapeHtml(opponentLogo)}" x="${x - 13}" y="${axisBottom + 11}" width="26" height="26" preserveAspectRatio="xMidYMid meet"><title>#${match.matchNo} ${escapeHtml(opponentName)}</title></image>`
                      : ""
                  }
                  <text x="${x}" y="${progressionChart.height - 16}" text-anchor="middle" class="gps-x-label">#${match.matchNo}</text>
                  ${
                    showTeamRange
                      ? teamMetricKeys
                          .map((key) => {
                            const config = gpsTeamMetricConfig[key];
                            const metric = gpsTeamMetricSummary(match, key);
                            if (!metric) return "";

                            const markerX = x + gpsTeamMetricOffset(key, gpsMetric);
                            const averageY = progressionChart.yForValue(metric.average);
                            const labelY = Math.max(progressionChart.padding.top + 14, averageY - 9);
                            const highestValue = metric.highest[config.field];
                            const lowestValue = metric.lowest[config.field];
                            return `
                              <g class="gps-range ${config.className}">
                                <line x1="${markerX}" y1="${progressionChart.yForValue(highestValue)}" x2="${markerX}" y2="${progressionChart.yForValue(lowestValue)}" class="gps-range-line"></line>
                                <circle cx="${markerX}" cy="${progressionChart.yForValue(highestValue)}" r="4.8" class="gps-range-dot is-high">
                                  <title>#${match.matchNo} ${escapeHtml(opponentName)}: høyest ${escapeHtml(config.label)} ${escapeHtml(metric.highest.player)} ${formatGpsTeamMetric(key, highestValue)}</title>
                                </circle>
                                <circle cx="${markerX}" cy="${progressionChart.yForValue(lowestValue)}" r="4.8" class="gps-range-dot is-low">
                                  <title>#${match.matchNo} ${escapeHtml(opponentName)}: lavest ${escapeHtml(config.label)} ${escapeHtml(metric.lowest.player)} ${formatGpsTeamMetric(key, lowestValue)}</title>
                                </circle>
                                <text x="${markerX}" y="${labelY}" text-anchor="middle" class="gps-range-label">${formatGpsTeamMetric(key, metric.average)}</text>
                              </g>
                            `;
                          })
                          .join("")
                      : ""
                  }
                  ${
                    row
                      ? `
                        ${
                          showTotalLine
                            ? `<circle cx="${x}" cy="${progressionChart.yForValue(row.totalDistance)}" r="4.5" class="gps-dot is-total">
                                <title>#${match.matchNo} ${escapeHtml(opponentName)}: Total ${formatKm(row.totalDistance, 1)}</title>
                              </circle>`
                            : ""
                        }
                        ${
                          showHsrLine
                            ? `<circle cx="${x}" cy="${progressionChart.yForValue(row.highSpeedRunning)}" r="4" class="gps-dot is-hsr">
                                <title>#${match.matchNo} ${escapeHtml(opponentName)}: HSR ${integer(Math.round(row.highSpeedRunning))} m</title>
                              </circle>`
                            : ""
                        }
                        ${
                          showSprintLine && !isGpsSprintSuspect({ match, row })
                            ? `<circle cx="${x}" cy="${progressionChart.yForValue(row.sprintDistance)}" r="4" class="gps-dot is-sprint">
                                <title>#${match.matchNo} ${escapeHtml(opponentName)}: Sprint ${integer(Math.round(row.sprintDistance))} m</title>
                              </circle>`
                            : ""
                        }
                      `
                      : `
                        <circle cx="${x}" cy="${axisBottom - 8}" r="3.5" class="gps-missing-dot">
                          <title>#${match.matchNo} ${escapeHtml(opponentName)}: ingen GPS-rad for valgt spiller</title>
                        </circle>
                      `
                  }
                </g>
              `;
            })
            .join("")}
        </svg>
      `
      : `<div class="gps-empty">Ingen GPS-data for valgt spiller i dette utvalget.</div>`;

    const progressionTable = `
      <div class="gps-progress-panel">
        <div class="gps-progress-title">
          <strong>${escapeHtml(progressionLabel || "Ingen spiller valgt")}</strong>
          <span>Felles akse i meter</span>
        </div>
        <div class="gps-chart-legend">
          ${showTotalLine ? `<span class="is-total">Total</span>` : ""}
          ${showHsrLine ? `<span class="is-hsr">HSR</span>` : ""}
          ${showSprintLine ? `<span class="is-sprint">Sprint</span>` : ""}
        </div>
        <div class="gps-progress-chart-wrap">${progressChart}</div>
      </div>
    `;

    element("gpsTable").innerHTML = gpsView === "match" ? matchTable : progressionTable;
  };

  const renderCodes = () => {
    const maxCodeTotal = Math.max(...data.codeMatrix.map((row) => row.total));
    element("codeMax").textContent = integer(maxCodeTotal);
    element("opponentStrip").hidden = true;
    element("opponentStrip").innerHTML = "";
    element("codeBars").innerHTML = data.codeMatrix
      .map((row) => {
        const width = `${Math.max(5, (row.total / maxCodeTotal) * 100)}%`;
        const localMax = Math.max(...row.values);
        const cells = row.values
          .map((value, index) => {
            const alpha = localMax ? 0.18 + (value / localMax) * 0.72 : 0.12;
            const match = data.matches[index];

            return `
              <span
                class="code-cell"
                style="background-color:rgba(214, 173, 69, ${alpha})"
                title="#${match?.matchNo ?? index + 1} ${escapeHtml(match?.opponent ?? "")}: ${value}"
              >
                ${
                  match?.opponentLogo
                    ? `<img src="./${escapeHtml(match.opponentLogo)}" alt="" aria-hidden="true" />`
                    : ""
                }
                <b>${integer(value)}</b>
              </span>
            `;
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

  const playerPortrait = (player, large = false) => `
    <div class="player-portrait ${large ? "is-large" : ""}">
      ${
        player.image
          ? `<img src="./${escapeHtml(player.image)}" alt="${escapeHtml(player.player)}" />`
          : `<b>${player.number}</b>`
      }
    </div>
  `;

  const individualMetrics = (player, tab) => {
    if (player.isGoalkeeper) {
      const keeperGroups = {
        oversikt: [
          { label: "Redninger", value: integer(player.gkSaves), detail: `${number(player.gkSaveRate, 0)}% redningsprosent` },
          { label: "Skudd imot", value: integer(player.gkShotsAgainst), detail: `${number(player.per90.gkShotsAgainst, 2)} per 90` },
          { label: "Mål imot", value: integer(player.gkConcededGoals), detail: `${number(player.per90.gkConcededGoals, 2)} per 90` },
          { label: "Keeperhandlinger", value: integer(player.scKeeperActions), detail: `${number(player.per90.scKeeperActions, 2)} per 90` },
        ],
        angrep: [
          { label: "Distribusjoner", value: integer(player.scDistributions), detail: `${number(player.per90.scDistributions, 2)} per 90` },
          { label: "Keeperpasninger", value: integer(player.gkPasses), detail: `${number(player.gkPassAccuracy, 0)}% treff` },
          { label: "Utover egen tredjedel", value: integer(player.gkPassesBeyondThird), detail: `${number(player.gkPassesBeyondThirdAccuracy, 0)}% treff` },
          { label: "Tilbakepasninger", value: integer(player.gkBackPassesReceived), detail: "mottatt fra laget" },
        ],
        pasning: [
          { label: "Keeperpasninger", value: integer(player.gkPasses), detail: `${number(player.gkPassAccuracy, 0)}% treff` },
          { label: "Utover egen tredjedel", value: integer(player.gkPassesBeyondThird), detail: `${number(player.per90.gkPassesBeyondThird, 2)} per 90` },
          { label: "SC pasninger", value: integer(player.scPasses), detail: `${number(player.per90.scPasses, 2)} per 90` },
          { label: "SC lange", value: integer(player.scLongPasses), detail: `${number(player.per90.scLongPasses, 2)} per 90` },
        ],
        forsvar: [
          { label: "Redninger", value: integer(player.gkSaves), detail: `${number(player.per90.gkSaves, 2)} per 90` },
          { label: "Refleksredninger", value: integer(player.gkReflexSaves), detail: `${number(player.per90.gkReflexSaves, 2)} per 90` },
          { label: "Exits", value: integer(player.gkExits), detail: `${number(player.per90.gkExits, 2)} per 90` },
          { label: "Luftdueller", value: integer(player.gkAerialDuels), detail: `${number(player.gkAerialWinRate, 0)}% vunnet` },
        ],
        kamp: [
          { label: "Kamper", value: `${player.matches.length}`, detail: `${player.appearances} registrerte opptredener` },
          {
            label: "Siste kamp",
            value: player.matches.at(-1) ? `#${player.matches.at(-1).matchNo}` : "-",
            detail: player.matches.at(-1)?.opponent ?? "Ingen kamp",
          },
          { label: "Siste 3 redninger", value: integer(sumRecentMatchValue(player, "gkSaves")), detail: "Wyscout keeperdata" },
          { label: "Snittminutter", value: number(player.minutes / Math.max(1, player.appearances), 0), detail: "per opptreden" },
        ],
      };

      return keeperGroups[tab] ?? keeperGroups.oversikt;
    }

    const groups = {
      oversikt: [
        { label: "Mål + assist", value: `${player.goals + player.assists}`, detail: `${player.goals} mål · ${player.assists} assist` },
        { label: "xG + xA", value: number(player.xg + player.xa, 2), detail: `${number(per90(player.xg + player.xa, player.minutes), 2)} per 90` },
        { label: "SC involveringer", value: integer(player.scEvents), detail: `${number(player.per90.scEvents, 2)} per 90` },
        { label: "Siste 3", value: integer(sumRecentMatchValue(player, "scEvents")), detail: "Sportscode involveringer" },
      ],
      angrep: [
        { label: "xG", value: number(player.xg, 2), detail: `${number(player.per90.xg, 2)} per 90` },
        { label: "Skudd", value: integer(player.shots), detail: `${number(player.shotAccuracy, 0)}% på mål` },
        { label: "SC sjanser", value: integer(player.scOpportunities), detail: `${number(player.per90.scOpportunities, 2)} per 90` },
        { label: "SC angrep", value: integer(player.scAttackingActions), detail: `${number(player.per90.scAttackingActions, 2)} per 90` },
      ],
      pasning: [
        { label: "Pasninger", value: integer(player.passes), detail: `${number(player.passAccuracy, 0)}% treff` },
        { label: "SC pasninger", value: integer(player.scPasses), detail: `${number(player.per90.scPasses, 2)} per 90` },
        { label: "SC lange", value: integer(player.scLongPasses), detail: `${number(player.per90.scLongPasses, 2)} per 90` },
        { label: "Distribusjoner", value: integer(player.scDistributions), detail: `${number(player.per90.scDistributions, 2)} per 90` },
      ],
      forsvar: [
        { label: "Gjenvinninger", value: integer(player.recoveries), detail: `${number(player.per90.recoveries, 2)} per 90` },
        { label: "SC forsvar", value: integer(player.scDefensiveActions), detail: `${number(player.per90.scDefensiveActions, 2)} per 90` },
        { label: "SC interceptions", value: integer(player.scInterceptions), detail: `${integer(player.scClearances)} klareringer` },
        { label: "SC dueller", value: integer(player.scDuels), detail: `${number(player.per90.scDuels, 2)} per 90` },
      ],
      kamp: [
        { label: "Kamper", value: `${player.matches.length}`, detail: `${player.appearances} registrerte opptredener` },
        { label: "XML-kamper", value: `${player.matches.filter((match) => match.scEvents > 0).length}`, detail: "med Sportscode-hendelser" },
        {
          label: "Siste kamp",
          value: player.matches.at(-1) ? `#${player.matches.at(-1).matchNo}` : "-",
          detail: player.matches.at(-1)?.opponent ?? "Ingen Wyscout-rad",
        },
        { label: "Snittminutter", value: number(player.minutes / Math.max(1, player.appearances), 0), detail: "per opptreden" },
      ],
    };

    return groups[tab] ?? groups.oversikt;
  };

  const sumRecentMatchValue = (player, key, take = 3) =>
    player.matches.slice(-take).reduce((sum, match) => sum + Number(match[key] ?? 0), 0);

  const comparisonRows = (tab) => {
    const rows = {
      oversikt: [
        { label: "Minutter", value: (player) => player.minutes, format: (player) => integer(player.minutes) },
        { label: "Mål + assist", value: (player) => player.goals + player.assists, format: (player) => `${player.goals + player.assists}` },
        {
          label: "xG + xA /90",
          value: (player) => per90(player.xg + player.xa, player.minutes),
          format: (player) => number(per90(player.xg + player.xa, player.minutes), 2),
        },
        { label: "SC involv. /90", value: (player) => player.per90.scEvents, format: (player) => number(player.per90.scEvents, 2) },
        { label: "SC angrep /90", value: (player) => player.per90.scAttackingActions, format: (player) => number(player.per90.scAttackingActions, 2) },
        { label: "Keeperhandl. /90", value: (player) => player.per90.scKeeperActions, format: (player) => number(player.per90.scKeeperActions, 2) },
        { label: "Balltap /90", value: (player) => player.per90.losses, format: (player) => number(player.per90.losses, 2), prefer: "low" },
      ],
      angrep: [
        { label: "Mål", value: (player) => player.goals, format: (player) => `${player.goals}` },
        { label: "xG /90", value: (player) => player.per90.xg, format: (player) => number(player.per90.xg, 2) },
        { label: "Skudd /90", value: (player) => player.per90.shots, format: (player) => number(player.per90.shots, 2) },
        { label: "SC sjanser /90", value: (player) => player.per90.scOpportunities, format: (player) => number(player.per90.scOpportunities, 2) },
        { label: "SC innlegg /90", value: (player) => player.per90.scCrosses, format: (player) => number(player.per90.scCrosses, 2) },
        { label: "SC angrep /90", value: (player) => player.per90.scAttackingActions, format: (player) => number(player.per90.scAttackingActions, 2) },
      ],
      pasning: [
        { label: "Pasningstreff", value: (player) => player.passAccuracy, format: (player) => `${number(player.passAccuracy, 0)}%` },
        { label: "Progressive /90", value: (player) => player.per90.progressivePasses, format: (player) => number(player.per90.progressivePasses, 2) },
        { label: "SC pasninger /90", value: (player) => player.per90.scPasses, format: (player) => number(player.per90.scPasses, 2) },
        { label: "SC lange /90", value: (player) => player.per90.scLongPasses, format: (player) => number(player.per90.scLongPasses, 2) },
        { label: "Distribusjoner /90", value: (player) => player.per90.scDistributions, format: (player) => number(player.per90.scDistributions, 2) },
        { label: "GK pasninger", value: (player) => player.gkPasses, format: (player) => integer(player.gkPasses) },
      ],
      forsvar: [
        { label: "Gjenvinninger /90", value: (player) => player.per90.recoveries, format: (player) => number(player.per90.recoveries, 2) },
        { label: "SC forsvar /90", value: (player) => player.per90.scDefensiveActions, format: (player) => number(player.per90.scDefensiveActions, 2) },
        { label: "SC interceptions", value: (player) => player.scInterceptions, format: (player) => integer(player.scInterceptions) },
        { label: "SC klareringer", value: (player) => player.scClearances, format: (player) => integer(player.scClearances) },
        { label: "SC dueller /90", value: (player) => player.per90.scDuels, format: (player) => number(player.per90.scDuels, 2) },
        { label: "Redninger", value: (player) => player.gkSaves, format: (player) => integer(player.gkSaves) },
        { label: "Mål imot", value: (player) => player.gkConcededGoals, format: (player) => integer(player.gkConcededGoals), prefer: "low" },
      ],
    };

    return rows[tab === "kamp" ? "oversikt" : tab];
  };

  const renderComparisonTable = (players, tab) => {
    const rows = comparisonRows(tab);
    const gridColumns = `minmax(132px, 1fr) repeat(${players.length}, minmax(92px, 1fr))`;

    return `
      <div class="comparison-card">
        <div class="comparison-headline">
          <div>
            <span>Sammenligning</span>
            <strong>${players.length} spillere</strong>
          </div>
          <small>Maks fire spillere</small>
        </div>
        <div class="comparison-table">
          <div class="comparison-row comparison-header-row" style="grid-template-columns:${gridColumns}">
            <span>Data</span>
            ${players
              .map(
                (player) => `
                  <div class="comparison-player-head">
                    ${playerPortrait(player)}
                    <strong>${escapeHtml(player.player)}</strong>
                  </div>
                `,
              )
              .join("")}
          </div>
          ${rows
            .map((row) => {
              const values = players.map(row.value);
              const preferred = row.prefer === "low" ? Math.min(...values) : Math.max(...values);

              return `
                <div class="comparison-row" style="grid-template-columns:${gridColumns}">
                  <span>${escapeHtml(row.label)}</span>
                  ${players
                    .map((player) => {
                      const value = row.value(player);

                      return `<strong class="${value === preferred && preferred > 0 ? "is-best" : ""}">${escapeHtml(row.format(player))}</strong>`;
                    })
                    .join("")}
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  };

  const renderProfileBars = (player) => {
    const items =
      player.isGoalkeeper && state.individualTab === "forsvar"
        ? [
            { label: "Skudd imot", value: player.gkShotsAgainst, made: player.gkSaves },
            { label: "Redninger", value: player.gkSaves, made: player.gkReflexSaves },
            { label: "Exits", value: player.gkExits, made: player.gkExits },
            { label: "Luftdueller", value: player.gkAerialDuels, made: player.gkAerialDuelsWon },
          ]
        : player.isGoalkeeper && state.individualTab === "pasning"
          ? [
              { label: "Keeperpasn.", value: player.gkPasses, made: player.gkPassesAccurate },
              { label: "Utover 1/3", value: player.gkPassesBeyondThird, made: player.gkPassesBeyondThirdAccurate },
              { label: "SC pasninger", value: player.scPasses, made: player.scPasses },
              { label: "Distribusjoner", value: player.scDistributions, made: player.scDistributions },
            ]
          : player.isGoalkeeper
            ? [
                { label: "Keeperpasn.", value: player.gkPasses, made: player.gkPassesAccurate },
                { label: "Skudd imot", value: player.gkShotsAgainst, made: player.gkSaves },
                { label: "Refleks", value: player.gkSaves, made: player.gkReflexSaves },
                { label: "Exits", value: player.gkExits, made: player.gkExits },
              ]
            : state.individualTab === "forsvar"
        ? [
            { label: "Def. dueller", value: player.defensiveDuels, made: player.defensiveDuelsWon },
            { label: "Off. dueller", value: player.offensiveDuels, made: player.offensiveDuelsWon },
            { label: "Luftdueller", value: player.aerialDuels, made: player.aerialDuelsWon },
            { label: "Løse baller", value: player.looseBallDuels, made: player.looseBallDuelsWon },
          ]
        : state.individualTab === "angrep"
          ? [
              { label: "Skudd", value: player.shots, made: player.shotsOnTarget },
              { label: "Innlegg", value: player.crosses, made: player.crossesAccurate },
              { label: "Driblinger", value: player.dribbles, made: player.dribblesSuccessful },
              { label: "Aksjoner", value: player.actions, made: player.actionsSuccessful },
            ]
          : [
              { label: "Pasninger", value: player.passes, made: player.passesAccurate },
              { label: "Fremover", value: player.forwardPasses, made: player.forwardPassesAccurate },
              { label: "Progressive", value: player.progressivePasses, made: player.progressivePassesAccurate },
              { label: "Siste tredjedel", value: player.finalThirdPasses, made: player.finalThirdPassesAccurate },
            ];
    const max = Math.max(...items.map((item) => item.value), 1);

    return `
      <div class="profile-bars">
        ${items
          .map(
            (item) => `
              <div class="profile-bar-row">
                <div>
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${integer(item.value)} / ${integer(item.made)}</strong>
                </div>
                <i>
                  <b style="width:${(item.value / max) * 100}%"></b>
                  <em style="width:${(item.made / max) * 100}%"></em>
                </i>
                <small>${number(pct(item.made, item.value), 0)}%</small>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  };

  const sportscodeProfileItems = (player, tab) => {
    if (player.isGoalkeeper) {
      const keeperGroups = {
        oversikt: [
          { label: "Keeperhandlinger", value: player.scKeeperActions, detail: `${number(player.per90.scKeeperActions, 2)} /90` },
          { label: "Redninger", value: player.gkSaves, detail: `${number(player.gkSaveRate, 0)}% redningsprosent` },
          { label: "Skudd imot", value: player.gkShotsAgainst, detail: `${number(player.per90.gkShotsAgainst, 2)} /90` },
          { label: "Mål imot", value: player.gkConcededGoals, detail: `${number(player.per90.gkConcededGoals, 2)} /90` },
          { label: "Exits", value: player.gkExits, detail: `${number(player.per90.gkExits, 2)} /90` },
          { label: "Distribusjoner", value: player.scDistributions, detail: `${number(player.per90.scDistributions, 2)} /90` },
        ],
        angrep: [
          { label: "Keeperpasninger", value: player.gkPasses, detail: `${number(player.gkPassAccuracy, 0)}% treff` },
          { label: "Utover egen tredjedel", value: player.gkPassesBeyondThird, detail: `${number(player.gkPassesBeyondThirdAccuracy, 0)}% treff` },
          { label: "Tilbakepasninger", value: player.gkBackPassesReceived, detail: "mottatt fra laget" },
          { label: "Distribusjoner", value: player.scDistributions, detail: `${number(player.per90.scDistributions, 2)} /90` },
          { label: "SC pasninger", value: player.scPasses, detail: `${number(player.per90.scPasses, 2)} /90` },
          { label: "SC lange", value: player.scLongPasses, detail: `${number(player.per90.scLongPasses, 2)} /90` },
        ],
        pasning: [
          { label: "Keeperpasninger", value: player.gkPasses, detail: `${number(player.gkPassAccuracy, 0)}% treff` },
          { label: "Utover egen tredjedel", value: player.gkPassesBeyondThird, detail: `${number(player.gkPassesBeyondThirdAccuracy, 0)}% treff` },
          { label: "Tilbakepasninger", value: player.gkBackPassesReceived, detail: "mottatt fra laget" },
          { label: "SC pasninger", value: player.scPasses, detail: `${number(player.per90.scPasses, 2)} /90` },
          { label: "SC lange", value: player.scLongPasses, detail: `${number(player.per90.scLongPasses, 2)} /90` },
          { label: "Dødball", value: player.scSetPieces, detail: `${number(player.per90.scSetPieces, 2)} /90` },
        ],
        forsvar: [
          { label: "Redninger", value: player.gkSaves, detail: `${number(player.per90.gkSaves, 2)} /90` },
          { label: "Refleksredninger", value: player.gkReflexSaves, detail: `${number(player.per90.gkReflexSaves, 2)} /90` },
          { label: "Exits", value: player.gkExits, detail: `${number(player.per90.gkExits, 2)} /90` },
          { label: "Mål imot", value: player.gkConcededGoals, detail: `${number(player.per90.gkConcededGoals, 2)} /90` },
          { label: "Luftdueller", value: player.gkAerialDuels, detail: `${number(player.gkAerialWinRate, 0)}% vunnet` },
          { label: "SC keeper", value: player.scKeeperActions, detail: `${number(player.per90.scKeeperActions, 2)} /90` },
        ],
        kamp: [
          { label: "SC involveringer", value: player.scEvents, detail: `${number(player.per90.scEvents, 2)} /90` },
          { label: "Siste 3 redninger", value: sumRecentMatchValue(player, "gkSaves"), detail: "Wyscout keeperdata" },
          { label: "Beste redningskamp", value: Math.max(...player.matches.map((match) => match.gkSaves), 0), detail: "flest redninger" },
          { label: "Keeperhandlinger", value: player.scKeeperActions, detail: `${number(player.per90.scKeeperActions, 2)} /90` },
          { label: "Distribusjoner", value: player.scDistributions, detail: `${number(player.per90.scDistributions, 2)} /90` },
          { label: "Exits", value: player.gkExits, detail: `${number(player.per90.gkExits, 2)} /90` },
        ],
      };

      return keeperGroups[tab] ?? keeperGroups.oversikt;
    }

    const groups = {
      oversikt: [
        { label: "SC involveringer", value: player.scEvents, detail: `${number(player.per90.scEvents, 2)} /90` },
        { label: "Pasninger", value: player.scPasses, detail: `${number(player.per90.scPasses, 2)} /90` },
        { label: "Angrep", value: player.scAttackingActions, detail: `${number(player.per90.scAttackingActions, 2)} /90` },
        { label: "Forsvar", value: player.scDefensiveActions, detail: `${number(player.per90.scDefensiveActions, 2)} /90` },
        { label: "Dueller", value: player.scDuels, detail: `${number(player.per90.scDuels, 2)} /90` },
        { label: "Dødball", value: player.scSetPieces, detail: `${number(player.per90.scSetPieces, 2)} /90` },
      ],
      angrep: [
        { label: "Angrepshandlinger", value: player.scAttackingActions, detail: `${number(player.per90.scAttackingActions, 2)} /90` },
        { label: "Sjanser", value: player.scOpportunities, detail: `${number(player.per90.scOpportunities, 2)} /90` },
        { label: "Skudd", value: player.scShots, detail: `${number(player.per90.scShots, 2)} /90` },
        { label: "Innlegg", value: player.scCrosses, detail: `${number(player.per90.scCrosses, 2)} /90` },
        { label: "1v1/dribling", value: player.scDribbles, detail: `${number(player.per90.scDribbles, 2)} /90` },
        { label: "Link-up", value: player.scLinkUps, detail: `${integer(player.scCounterattacks)} kontringer` },
      ],
      pasning: [
        { label: "SC pasninger", value: player.scPasses, detail: `${number(player.per90.scPasses, 2)} /90` },
        { label: "Lange pasninger", value: player.scLongPasses, detail: `${number(player.per90.scLongPasses, 2)} /90` },
        { label: "Distribusjoner", value: player.scDistributions, detail: `${number(player.per90.scDistributions, 2)} /90` },
        { label: "Innlegg", value: player.scCrosses, detail: `${number(player.per90.scCrosses, 2)} /90` },
        { label: "Innkast", value: player.scThrowIns, detail: "kodet i Sportscode" },
        { label: "Dødball", value: player.scSetPieces, detail: `${number(player.per90.scSetPieces, 2)} /90` },
      ],
      forsvar: [
        { label: "Forsvarshandlinger", value: player.scDefensiveActions, detail: `${number(player.per90.scDefensiveActions, 2)} /90` },
        { label: "Interceptions", value: player.scInterceptions, detail: `${number(player.per90.scInterceptions, 2)} /90` },
        { label: "Klareringer", value: player.scClearances, detail: `${number(player.per90.scClearances, 2)} /90` },
        { label: "Def. dueller", value: player.scDefendingDuels, detail: `${number(player.per90.scDefendingDuels, 2)} /90` },
        { label: "Luftdueller", value: player.scAerialDuels, detail: `${number(player.per90.scAerialDuels, 2)} /90` },
        { label: "1v1 forsvar", value: player.scOneVsOneDefense, detail: "kodet i Sportscode" },
      ],
      kamp: [
        { label: "SC involveringer", value: player.scEvents, detail: `${number(player.per90.scEvents, 2)} /90` },
        { label: "Siste 3 kamper", value: sumRecentMatchValue(player, "scEvents"), detail: "kodede involveringer" },
        { label: "Beste kamp", value: Math.max(...player.matches.map((match) => match.scEvents), 0), detail: "høyeste SC-volum" },
        { label: "Pasninger", value: player.scPasses, detail: `${number(player.per90.scPasses, 2)} /90` },
        { label: "Angrep", value: player.scAttackingActions, detail: `${number(player.per90.scAttackingActions, 2)} /90` },
        { label: "Forsvar", value: player.scDefensiveActions, detail: `${number(player.per90.scDefensiveActions, 2)} /90` },
      ],
    };

    return groups[tab] ?? groups.oversikt;
  };

  const renderSportscodeProfile = (player, tab) => {
    const items = sportscodeProfileItems(player, tab);
    const max = Math.max(...items.map((item) => item.value), 1);

    return `
      <div class="sportscode-profile-card">
        <div class="comparison-headline">
          <div>
            <span>${player.isGoalkeeper ? "Keeperprofil" : "Sportscode profil"}</span>
            <strong>${player.isGoalkeeper ? "Wyscout + Sportscode" : "Kodede hendelser"}</strong>
          </div>
          <small>${player.isGoalkeeper ? `${integer(player.gkSaves)} redninger` : `${integer(player.scEvents)} totalt`}</small>
        </div>
        <div class="event-profile-grid">
          ${items
            .map(
              (item) => `
                <div class="event-profile-row">
                  <div>
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${integer(item.value)}</strong>
                  </div>
                  <i><b style="width:${(item.value / max) * 100}%"></b></i>
                  <small>${escapeHtml(item.detail)}</small>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  };

  const renderIndividualMatchTable = (player) => {
    if (player.isGoalkeeper) {
      return `
        <div class="individual-match-table">
          <div class="individual-match-row individual-match-head">
            <span>Kamp</span><span>Min</span><span>Pasn.</span><span>Treff</span><span>Skudd mot</span><span>Mål mot</span><span>Redn.</span><span>Refleks</span><span>Exits</span><span>SC</span>
          </div>
          ${
            player.matches.length
              ? player.matches
                  .map(
                    (match) => `
                      <div class="individual-match-row">
                        <strong>#${match.matchNo} ${escapeHtml(match.opponent)}</strong>
                        <span>${match.minutes}</span>
                        <span>${match.gkPasses}</span>
                        <span>${number(pct(match.gkPassesAccurate, match.gkPasses), 0)}%</span>
                        <span>${match.gkShotsAgainst}</span>
                        <span>${match.gkConcededGoals}</span>
                        <span>${match.gkSaves}</span>
                        <span>${match.gkReflexSaves}</span>
                        <span>${match.gkExits}</span>
                        <span>${match.scEvents}</span>
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="individual-match-empty">Ingen keeperlinjer funnet.</div>`
          }
        </div>
      `;
    }

    return `
      <div class="individual-match-table">
        <div class="individual-match-row individual-match-head">
          <span>Kamp</span><span>Min</span><span>xG</span><span>xA</span><span>Skudd</span><span>SC</span><span>SC pasn.</span><span>SC angr.</span><span>SC forsv.</span><span>SC duel</span>
        </div>
        ${
          player.matches.length
            ? player.matches
                .map(
                  (match) => `
                    <div class="individual-match-row">
                      <strong>#${match.matchNo} ${escapeHtml(match.opponent)}</strong>
                      <span>${match.minutes}</span>
                      <span>${number(match.xg, 2)}</span>
                      <span>${number(match.xa, 2)}</span>
                      <span>${match.shots}/${match.shotsOnTarget}</span>
                      <span>${match.scEvents}</span>
                      <span>${match.scPasses}</span>
                      <span>${match.scAttackingActions}</span>
                      <span>${match.scDefensiveActions}</span>
                      <span>${match.scDuels}</span>
                    </div>
                  `,
                )
                .join("")
            : `<div class="individual-match-empty">Ingen Wyscout-spillerlinjer funnet.</div>`
        }
      </div>
    `;
  };

  const renderIndividualPlayers = () => {
    if (!data.individualPlayers?.length) return;
    if (!state.selectedIndividualPlayer) {
      state.selectedIndividualPlayer = data.individualPlayers[0].player;
    }

    const search = normalizeSearch(state.individualSearch.trim());
    const players = data.individualPlayers.filter(
      (player) => !search || normalizeSearch(`${player.player} ${player.number}`).includes(search),
    );
    const selected =
      data.individualPlayers.find((player) => player.player === state.selectedIndividualPlayer) ?? data.individualPlayers[0];
    const compared = state.comparedIndividualPlayers
      .map((playerName) => data.individualPlayers.find((player) => player.player === playerName))
      .filter(Boolean);
    const latestMatch = selected.matches.at(-1);
    const metrics = individualMetrics(selected, state.individualTab);

    element("individualPlayerCount").textContent = players.length;
    element("individualPlayerList").innerHTML = players
      .map((player) => {
        const isSelected = selected.player === player.player;
        const isCompared = state.comparedIndividualPlayers.includes(player.player);

        return `
          <button
            type="button"
            class="individual-player-button ${isSelected ? "is-active" : ""} ${isCompared ? "is-compared" : ""}"
            data-individual-player="${escapeHtml(player.player)}"
            aria-pressed="${isCompared ? "true" : "false"}"
            aria-label="${escapeHtml(player.player)} ${isCompared ? "fjern fra sammenligning" : "legg til sammenligning"}"
          >
            ${playerPortrait(player)}
            <span>
              <strong>${escapeHtml(player.player)}</strong>
              <small>${player.minutes} min · ${integer(player.scEvents)} SC</small>
            </span>
            <i class="compare-dot ${isCompared ? "is-active" : ""}"></i>
          </button>
        `;
      })
      .join("");

    element("individualDetail").innerHTML = `
      <div class="individual-hero">
        ${playerPortrait(selected, true)}
        <div>
          <p>#${selected.number}</p>
          <h2>${escapeHtml(selected.player)}</h2>
          <span>${selected.appearances} kamper · ${selected.minutes} minutter${
            latestMatch ? ` · sist #${latestMatch.matchNo} ${escapeHtml(latestMatch.opponent)}` : ""
          }</span>
        </div>
        <div class="individual-hero-side">
          <div class="individual-hero-kpis">
            <div><span>Mål</span><strong>${selected.goals}</strong></div>
            <div><span>xG</span><strong>${number(selected.xg, 2)}</strong></div>
            <div><span>SC</span><strong>${integer(selected.scEvents)}</strong></div>
          </div>
        </div>
      </div>
      <div class="individual-tabs" aria-label="Spillerdatavalg">
        ${individualTabs
          .map(
            (tab) => `
              <button type="button" class="${state.individualTab === tab.key ? "is-active" : ""}" data-individual-tab="${tab.key}">
                ${escapeHtml(tab.label)}
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="individual-content">
        <div class="individual-stat-grid">
          ${metrics
            .map(
              (metric) => `
                <article class="individual-stat">
                  <span>${escapeHtml(metric.label)}</span>
                  <strong>${escapeHtml(metric.value)}</strong>
                  <small>${escapeHtml(metric.detail)}</small>
                </article>
              `,
            )
            .join("")}
        </div>
        ${
          state.individualTab === "kamp"
            ? renderIndividualMatchTable(selected)
            : `<div class="individual-analysis-grid">${renderComparisonTable(compared.length ? compared : [selected], state.individualTab)}${renderProfileBars(selected)}</div>`
        }
        ${renderSportscodeProfile(selected, state.individualTab)}
      </div>
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
    renderGpsMatches(matches);
    renderGoalTiming(matches);
    renderPlayers();
    renderIndividualPlayers();
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

    element("individualSearch").addEventListener("input", (event) => {
      state.individualSearch = event.target.value;
      renderIndividualPlayers();
    });

    element("gpsMatchSelector").addEventListener("change", (event) => {
      const viewSelect = event.target.closest("[data-gps-view-select]");
      const matchSelect = event.target.closest("[data-gps-match-select]");
      const playerSelect = event.target.closest("[data-gps-player-select]");
      const sortSelect = event.target.closest("[data-gps-sort-select]");
      const metricSelect = event.target.closest("[data-gps-metric-select]");
      if (!viewSelect && !matchSelect && !playerSelect && !sortSelect && !metricSelect) return;
      if (viewSelect) {
        state.gpsView = viewSelect.value;
        if (state.gpsView === "progression" && state.selectedGpsPlayer === "all") {
          state.selectedGpsPlayer = gpsTeamProgressionKey;
          state.gpsPlayerFilter = "";
        }
      }
      if (matchSelect) {
        state.selectedGpsMatchNo = matchSelect.value;
        state.selectedGpsPlayer = "all";
        state.gpsPlayerFilter = "";
      }
      if (playerSelect) {
        state.selectedGpsPlayer = playerSelect.value;
        if (state.selectedGpsPlayer !== "all") {
          state.gpsPlayerFilter = "";
        }
      }
      if (sortSelect) {
        state.gpsSort = sortSelect.value;
        state.gpsSortDirection = sortSelect.value === "player" ? "asc" : "desc";
      }
      if (metricSelect) {
        state.gpsMetric = metricSelect.value;
      }
      renderGpsMatches(filteredMatches());
    });

    element("gpsMatchSelector").addEventListener("input", (event) => {
      const playerFilter = event.target.closest("[data-gps-player-filter]");
      if (!playerFilter) return;
      state.gpsPlayerFilter = playerFilter.value;
      renderGpsMatches(filteredMatches());
    });

    element("gpsTable").addEventListener("click", (event) => {
      const sortButton = event.target.closest("[data-gps-table-sort]");
      if (!sortButton) return;
      const nextSort = sortButton.dataset.gpsTableSort;
      if (state.gpsSort === nextSort) {
        state.gpsSortDirection = state.gpsSortDirection === "desc" ? "asc" : "desc";
      } else {
        state.gpsSort = nextSort;
        state.gpsSortDirection = nextSort === "player" ? "asc" : "desc";
      }
      renderGpsMatches(filteredMatches());
    });

    element("individualPlayerList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-individual-player]");
      if (!button) return;
      const player = button.dataset.individualPlayer;
      state.selectedIndividualPlayer = player;
      if (state.comparedIndividualPlayers.includes(player)) {
        state.comparedIndividualPlayers = state.comparedIndividualPlayers.filter((item) => item !== player);
      } else {
        const nextPlayers = [...state.comparedIndividualPlayers, player];
        state.comparedIndividualPlayers = nextPlayers.length > 4 ? nextPlayers.slice(1) : nextPlayers;
      }
      renderIndividualPlayers();
    });

    element("individualDetail").addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-individual-tab]");
      if (tabButton) {
        state.individualTab = tabButton.dataset.individualTab;
        renderIndividualPlayers();
      }
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
