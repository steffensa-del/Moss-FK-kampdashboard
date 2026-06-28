(() => {
  const data = window.dashboardData;
  const dashboardPassword = "Moss";
  const authStorageKey = "moss-evaluation-auth-v1";
  const recentWindowSize = 6;

  const element = (id) => document.getElementById(id);
  const number = (value, digits = 1) =>
    new Intl.NumberFormat("nb-NO", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number.isFinite(value) ? value : 0);
  const integer = (value) => new Intl.NumberFormat("nb-NO").format(Number.isFinite(value) ? value : 0);
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  const average = (values) => {
    const clean = values.filter((value) => value !== null && Number.isFinite(value));
    return clean.length ? clean.reduce((total, value) => total + value, 0) / clean.length : null;
  };
  const standardDeviation = (values) => {
    const clean = values.filter((value) => value !== null && Number.isFinite(value));
    if (clean.length < 2) return 1;
    const mean = average(clean);
    const variance = clean.reduce((total, value) => total + (value - mean) ** 2, 0) / (clean.length - 1);
    return Math.sqrt(variance) || 1;
  };
  const slope = (values) => {
    const points = values
      .map((value, index) => ({ x: index + 1, y: value }))
      .filter((point) => point.y !== null && Number.isFinite(point.y));
    if (points.length < 4) return 0;
    const meanX = average(points.map((point) => point.x));
    const meanY = average(points.map((point) => point.y));
    const denominator = points.reduce((total, point) => total + (point.x - meanX) ** 2, 0);
    if (!denominator) return 0;
    return points.reduce((total, point) => total + (point.x - meanX) * (point.y - meanY), 0) / denominator;
  };

  const per90 = (rows, key) => {
    const minutes = sum(rows, "minutes");
    return minutes ? (sum(rows, key) / minutes) * 90 : null;
  };
  const rate = (rows, numerator, denominator) => {
    const den = sum(rows, denominator);
    return den ? (sum(rows, numerator) / den) * 100 : null;
  };
  const splitRows = (rows) => {
    const sorted = [...rows].sort((a, b) => a.matchNo - b.matchNo);
    const midpoint = Math.ceil(sorted.length / 2);
    return [sorted.slice(0, midpoint), sorted.slice(midpoint)];
  };
  const recentSlice = (values) => values.slice(Math.max(0, values.length - recentWindowSize));
  const latestValue = (values) => {
    const clean = values.filter((value) => value !== null && Number.isFinite(value));
    return clean.length ? clean[clean.length - 1] : null;
  };

  const sportscodeByKey = Object.fromEntries(data.sportscodeKpis.map((kpi) => [kpi.key, kpi]));
  const playerImageByName = Object.fromEntries(
    data.individualPlayers.map((player) => [player.player, player.image || "./moss-fk.png"]),
  );
  const knownPlayers = new Set(data.individualPlayers.map((player) => player.player));

  const teamMetricDefinitions = [
    {
      title: "Skudd mot",
      category: "Forsvar",
      source: "Kampdata",
      direction: "low",
      digits: 1,
      values: () => data.matches.map((match) => match.shotsAgainst),
      note: "Motstander får flere avslutninger per kamp. Det påvirker både trykk og sannsynlighet for baklengs.",
    },
    {
      title: "Defensive lange baller",
      category: "Forsvar",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => data.matches.map((match) => match.keyCounts?.["D Lang ball"] || 0),
      note: "Flere defensive langball-situasjoner peker mot mer press, mer strekk eller flere ubalanser.",
    },
    {
      title: "xG mot",
      category: "Forsvar",
      source: "Wyscout",
      direction: "low",
      digits: 2,
      values: () => data.matches.map((match) => match.xgAgainst),
      note: "Sjansekvaliteten imot øker. Dette er den tydeligste prestasjonsmessige alarmen.",
    },
    {
      title: "Skudd på mål mot",
      category: "Forsvar",
      source: "Kampdata",
      direction: "low",
      digits: 1,
      values: () => data.matches.map((match) => match.shotsOnTargetAgainst),
      note: "Motstander treffer mål oftere, og keeper/forsvar må håndtere mer direkte fare.",
    },
    {
      title: "Assist sentralt mot",
      category: "Sone",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.assistCentralAgainst.values,
      note: "Motstander finner oftere sentrale serveringsrom foran mål.",
    },
    {
      title: "Assist zone mot",
      category: "Sone",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.assistZoneAgainst.values,
      note: "Total mengde motstanderangrep i assistsoner har økt kraftig.",
    },
    {
      title: "Cross høyre mot",
      category: "Bredde",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.crossRightAgainst.values,
      note: "Motstander får mer tilgang til innlegg fra vår høyreside.",
    },
    {
      title: "Cross zone mot",
      category: "Bredde",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.crossZoneAgainst.values,
      note: "Bredde- og innleggssoner imot har blitt et tydelig gjentakende problem.",
    },
    {
      title: "Mål mot",
      category: "Resultat",
      source: "Kampdata",
      direction: "low",
      digits: 2,
      values: () => data.matches.map((match) => match.oppGoals),
      note: "Baklengssnittet peker oppover fra kamp til kamp, og siste 6 ligger høyere enn sesongsnittet.",
    },
    {
      title: "Assist venstre mot",
      category: "Sone",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.assistLeftAgainst.values,
      note: "Motstander skaper mer fra venstre assistkanal sett fra vår defensive struktur.",
    },
    {
      title: "Cross venstre mot",
      category: "Bredde",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.crossLeftAgainst.values,
      note: "Innleggstilgang imot øker også på motsatt side, ikke bare på én kant.",
    },
    {
      title: "Assist høyre mot",
      category: "Sone",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => sportscodeByKey.assistRightAgainst.values,
      note: "Høyre assistkanal imot har også en klar negativ utvikling.",
    },
    {
      title: "Skuddforskjell",
      category: "Balanse",
      source: "Kampdata",
      direction: "high",
      digits: 1,
      values: () => data.matches.map((match) => match.shotsFor - match.shotsAgainst),
      note: "Skuddregnskapet går fra pluss til minus. Kampbildet blir mer åpent mot oss.",
    },
    {
      title: "Poeng per kamp",
      category: "Resultat",
      source: "Tabell",
      direction: "high",
      digits: 2,
      values: () => data.matches.map((match) => match.points),
      note: "Poengfangsten peker nedover i kamp-for-kamp-linjen, med svakere uttelling i siste 6.",
    },
    {
      title: "PPDA",
      category: "Press",
      source: "Wyscout",
      direction: "low",
      digits: 2,
      values: () => data.matches.map((match) => match.ppda),
      note: "Høyere PPDA peker mot mindre konsekvent eller mindre effektivt press.",
    },
    {
      title: "Duellseier",
      category: "Duell",
      source: "Wyscout",
      direction: "high",
      digits: 1,
      suffix: "%",
      values: () => data.matches.map((match) => match.duelWinRate),
      note: "Duellandelen peker ned, som gjør andre defensive problemer tyngre å håndtere.",
    },
    {
      title: "HMLD per minutt",
      category: "Fysisk",
      source: "GPS/HPS",
      direction: "high",
      digits: 1,
      values: () => data.gpsMatches.map((match) => match.hmldPerMinute),
      note: "Høyintensiv belastning per minutt har en svak negativ kamp-for-kamp-retning.",
    },
    {
      title: "High speed running",
      category: "Fysisk",
      source: "GPS/HPS",
      direction: "high",
      digits: 0,
      values: () => data.gpsMatches.map((match) => match.highSpeedRunning),
      note: "Høyhastighetsvolumet peker nedover i kamp-for-kamp-linjen, med størst vekt på siste 6.",
    },
    {
      title: "Balltap",
      category: "Risiko",
      source: "Sportscode",
      direction: "low",
      digits: 1,
      values: () => data.matches.map((match) => match.keyCounts?.Balltap || 0),
      note: "Balltapene øker og kan være med på å forklare mer trykk imot.",
    },
  ];

  const playerMetricDefinitions = [
    { key: "xg90", title: "xG per 90", category: "Angrep", type: "per90", field: "xg", direction: "high", minTotal: 0.5, digits: 2 },
    { key: "xa90", title: "xA per 90", category: "Angrep", type: "per90", field: "xa", direction: "high", minTotal: 0.3, digits: 2 },
    { key: "shots90", title: "Skudd per 90", category: "Angrep", type: "per90", field: "shots", direction: "high", minTotal: 4, digits: 2 },
    {
      key: "shotsOnTarget90",
      title: "Skudd på mål per 90",
      category: "Angrep",
      type: "per90",
      field: "shotsOnTarget",
      direction: "high",
      minTotal: 2,
      digits: 2,
    },
    { key: "passes90", title: "Pasninger per 90", category: "Spill", type: "per90", field: "passes", direction: "high", minTotal: 120, digits: 1 },
    {
      key: "passAccuracy",
      title: "Pasningspresisjon",
      category: "Spill",
      type: "rate",
      numerator: "passesAccurate",
      denominator: "passes",
      direction: "high",
      minDenominator: 80,
      digits: 1,
      suffix: "%",
    },
    {
      key: "progressivePasses90",
      title: "Progressive pasninger per 90",
      category: "Spill",
      type: "per90",
      field: "progressivePasses",
      direction: "high",
      minTotal: 12,
      digits: 2,
    },
    {
      key: "finalThirdPasses90",
      title: "Pasninger siste tredjedel per 90",
      category: "Spill",
      type: "per90",
      field: "finalThirdPasses",
      direction: "high",
      minTotal: 12,
      digits: 2,
    },
    {
      key: "recoveries90",
      title: "Gjenvinninger per 90",
      category: "Forsvar",
      type: "per90",
      field: "recoveries",
      direction: "high",
      minTotal: 20,
      digits: 2,
    },
    { key: "losses90", title: "Balltap per 90", category: "Risiko", type: "per90", field: "losses", direction: "low", minTotal: 20, digits: 2 },
    {
      key: "duelWinRate",
      title: "Duellseier",
      category: "Duell",
      type: "rate",
      numerator: "duelsWon",
      denominator: "duels",
      direction: "high",
      minDenominator: 35,
      digits: 1,
      suffix: "%",
    },
    {
      key: "gkSaveRate",
      title: "Keeper redningsprosent",
      category: "Keeper",
      type: "rate",
      numerator: "gkSaves",
      denominator: "gkShotsAgainst",
      direction: "high",
      minDenominator: 10,
      digits: 1,
      suffix: "%",
    },
    {
      key: "gkConceded90",
      title: "Keeper baklengs per 90",
      category: "Keeper",
      type: "per90",
      field: "gkConcededGoals",
      direction: "low",
      minTotal: 8,
      digits: 2,
    },
    {
      key: "gkLongPassAccuracy",
      title: "Keeper lange pasninger presisjon",
      category: "Keeper",
      type: "rate",
      numerator: "gkPassesBeyondThirdAccurate",
      denominator: "gkPassesBeyondThird",
      direction: "high",
      minDenominator: 80,
      digits: 1,
      suffix: "%",
    },
  ];

  const gpsMetricDefinitions = [
    { key: "distancePerMinute", title: "GPS meter per minutt", category: "Fysisk", direction: "high", digits: 1 },
    { key: "hmldPerMinute", title: "GPS HMLD per minutt", category: "Fysisk", direction: "high", digits: 1 },
  ];
  const individualSnapshotPlayerMetricKeys = ["duelWinRate", "passes90", "progressivePasses90", "losses90"];
  const involvementMetricDefinition = {
    key: "scEvents90",
    title: "Involveringer/tagginger per 90",
    category: "Involvering",
    type: "per90",
    field: "scEvents",
    direction: "high",
    minTotal: 0,
    digits: 1,
    source: "Sportscode",
  };
  const individualSnapshotGpsDefinitions = [
    { key: "gpsTotal", title: "GPS total", category: "Fysisk", field: "totalDistance", direction: "high", digits: 0, suffix: " m" },
    { key: "gpsHsr", title: "GPS HSR", category: "Fysisk", field: "highSpeedRunning", direction: "high", digits: 0, suffix: " m" },
    { key: "gpsSprint", title: "GPS sprint", category: "Fysisk", field: "sprintDistance", direction: "high", digits: 0, suffix: " m" },
  ];

  const metricValue = (definition, rows) => {
    if (definition.type === "per90") return per90(rows, definition.field);
    if (definition.type === "rate") return rate(rows, definition.numerator, definition.denominator);
    return null;
  };

  const hasEnoughData = (definition, rows) => {
    if (definition.type === "per90") return sum(rows, definition.field) >= (definition.minTotal || 0);
    if (definition.type === "rate") return sum(rows, definition.denominator) >= (definition.minDenominator || 0);
    return true;
  };

  const linearTrendStats = (values, direction) => {
    const clean = values.filter((value) => value !== null && Number.isFinite(value));
    const recentValues = recentSlice(values).filter((value) => value !== null && Number.isFinite(value));
    const seasonAverage = average(clean) || 0;
    const recentAverage = average(recentValues) || 0;
    const latest = latestValue(values) ?? recentAverage;
    const fullSlope = slope(values);
    const recentSlope = slope(recentSlice(values));
    const spread = standardDeviation(clean);
    const badFullSlope = direction === "low" ? fullSlope : -fullSlope;
    const badRecentSlope = direction === "low" ? recentSlope : -recentSlope;
    const badRecentLevel = direction === "low" ? recentAverage - seasonAverage : seasonAverage - recentAverage;
    const badLatestLevel = direction === "low" ? latest - seasonAverage : seasonAverage - latest;
    const score =
      (badRecentSlope / spread) * 3 +
      (badFullSlope / spread) * 1.4 +
      (badRecentLevel / spread) * 1.2 +
      (badLatestLevel / spread) * 0.7;

    return {
      seasonAverage,
      recentAverage,
      latest,
      fullSlope,
      recentSlope,
      badFullSlope,
      badRecentSlope,
      badRecentLevel,
      badLatestLevel,
      score,
    };
  };

  const buildTeamTrends = () =>
    teamMetricDefinitions
      .map((definition) => {
        const values = definition.values().map((value) => Number(value) || 0);
        const trend = linearTrendStats(values, definition.direction);
        return { ...definition, values, ...trend };
      })
      .filter((trend) => trend.score > 0 || trend.badRecentSlope > 0 || trend.badRecentLevel > 0 || trend.badLatestLevel > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

  const buildSpecialComparison = () => {
    const kpi = sportscodeByKey;
    const keyValues = (key) => data.matches.map((match) => match.keyCounts?.[key] || 0);
    const last7Matches = data.matches.slice(-7);
    const last2Matches = data.matches.slice(-2);
    const valuesLast = (values, count) => average(values.slice(Math.max(0, values.length - count))) || 0;

    const metricDefinitions = [
      {
        key: "points",
        title: "Poeng per kamp",
        direction: "high",
        digits: 2,
        values: data.matches.map((match) => match.points),
        note: "Resultatuttellingen i de to siste.",
      },
      {
        key: "xgf",
        title: "xG for",
        direction: "high",
        digits: 2,
        values: data.matches.map((match) => match.xgFor),
        note: "Egen sjansekvalitet målt mot siste 7.",
      },
      {
        key: "xga",
        title: "xG mot",
        direction: "low",
        digits: 2,
        values: data.matches.map((match) => match.xgAgainst),
        note: "Sjansekvalitet imot.",
      },
      {
        key: "shotsAgainst",
        title: "Skudd mot",
        direction: "low",
        digits: 1,
        values: data.matches.map((match) => match.shotsAgainst),
        note: "Totalt avslutningsvolum imot.",
      },
      {
        key: "shotsOnTargetAgainst",
        title: "Skudd på mål mot",
        direction: "low",
        digits: 1,
        values: data.matches.map((match) => match.shotsOnTargetAgainst),
        note: "Direkte keeper-/måltrussel.",
      },
      {
        key: "assistZoneAgainst",
        title: "Assist zone mot",
        direction: "low",
        digits: 1,
        values: kpi.assistZoneAgainst.values.map(Number),
        note: "Tilgang til sonene før avslutning.",
      },
      {
        key: "crossZoneAgainst",
        title: "Cross zone mot",
        direction: "low",
        digits: 1,
        values: kpi.crossZoneAgainst.values.map(Number),
        note: "Tilgang til innleggssoner.",
      },
      {
        key: "longBallAgainst",
        title: "D Lang ball",
        direction: "low",
        digits: 1,
        values: keyValues("D Lang ball"),
        note: "Direkte spill, strekk og andreballpress.",
      },
      {
        key: "transitionAgainst",
        title: "Overgang mot",
        direction: "low",
        digits: 1,
        values: keyValues("Overgang mot"),
        note: "Risiko når laget mister kontroll eller balanse.",
      },
      {
        key: "ballLoss",
        title: "Balltap",
        direction: "low",
        digits: 1,
        values: keyValues("Balltap"),
        note: "Brudd som kan gi nytt trykk imot.",
      },
    ];

    const metrics = metricDefinitions.map((metric) => {
      const last7 = valuesLast(metric.values, 7);
      const last2 = valuesLast(metric.values, 2);
      const change = last2 - last7;
      const badGap = metric.direction === "low" ? change : -change;
      return {
        ...metric,
        last7,
        last2,
        change,
        badGap,
        isNegative: badGap > 0.05,
        isPositive: badGap < -0.05,
        impact: Math.abs(badGap) / Math.max(Math.abs(last7), 1),
      };
    });

    const byKey = Object.fromEntries(metrics.map((metric) => [metric.key, metric]));
    const redSignals = metrics
      .filter((metric) => metric.isNegative)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
    const greenSignals = metrics
      .filter((metric) => metric.isPositive)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);

    const lead = {
      title: "De to siste viser mindre volum imot, men mer direkte fare.",
      text: `xG mot er ${number(byKey.xga.last2, 2)} i de to siste mot ${number(
        byKey.xga.last7,
        2,
      )} i siste 7, og skudd mot er ${number(byKey.shotsAgainst.last2, 1)} mot ${number(
        byKey.shotsAgainst.last7,
        1,
      )}. Samtidig ligger skudd på mål mot, lange baller og overganger høyere enn siste 7-snittet. Det peker mot færre situasjoner, men mer direkte og sårbare øyeblikk.`,
      redSignals,
      greenSignals,
    };

    const matchCards = last2Matches.map((match) => {
      const index = match.matchNo - 1;
      const label = match.venue === "Hjemme" ? `Moss - ${match.opponent}` : `${match.opponent} - Moss`;
      const drivers = [
        `xG mot ${number(match.xgAgainst, 2)}`,
        `skudd mål ${integer(match.shotsOnTargetAgainst)}`,
        `D lang ball ${integer(keyValues("D Lang ball")[index])}`,
        `overgang ${integer(keyValues("Overgang mot")[index])}`,
      ];
      return {
        label,
        result: match.score,
        points: match.points,
        drivers: drivers.join(" · "),
      };
    });

    return {
      matches: {
        last7: last7Matches.length,
        last2: last2Matches.length,
      },
      lead,
      metrics,
      matchCards,
    };
  };

  const buildChanceAnalysis = () => {
    const kpi = sportscodeByKey;
    const keyValues = (key) => data.matches.map((match) => match.keyCounts?.[key] || 0);
    const chanceMetrics = {
      xga: data.matches.map((match) => match.xgAgainst),
      shots: data.matches.map((match) => match.shotsAgainst),
      shotsOnTarget: data.matches.map((match) => match.shotsOnTargetAgainst),
      goals: data.matches.map((match) => match.oppGoals),
      assist: kpi.assistZoneAgainst.values.map(Number),
      cross: kpi.crossZoneAgainst.values.map(Number),
      central: kpi.assistCentralAgainst.values.map(Number),
      left: kpi.assistLeftAgainst.values.map(Number),
      right: kpi.assistRightAgainst.values.map(Number),
      goalZone: kpi.goalZoneAgainst.values.map(Number),
      longBall: keyValues("D Lang ball"),
      deadBall: keyValues("D Dødball"),
      transition: keyValues("Overgang mot"),
      dtb: keyValues("DTB"),
      ballLoss: keyValues("Balltap"),
    };

    const meanRecent = (values) => average(recentSlice(values)) || 0;
    const period = (values) => ({
      seasonAverage: average(values) || 0,
      recentAverage: meanRecent(values),
      latest: latestValue(values) || 0,
      fullSlope: slope(values),
      recentSlope: slope(recentSlice(values)),
    });

    const phaseRows = [
      {
        title: "Assist zone mot",
        source: "Sone",
        values: chanceMetrics.assist,
        note: "Sterkeste gjentakende mønster. Henger tydelig sammen med skudd imot.",
      },
      {
        title: "Cross zone mot",
        source: "Bredde",
        values: chanceMetrics.cross,
        note: "Innleggssoner imot har en negativ kamp-for-kamp-retning og er fortsatt høyt i siste 6.",
      },
      {
        title: "Assist sentralt mot",
        source: "Sentralt",
        values: chanceMetrics.central,
        note: "Motstander får oftere serveringsrom sentralt foran boksen.",
      },
      {
        title: "D Lang ball",
        source: "Fase",
        values: chanceMetrics.longBall,
        note: "Har sterkest utslag i de nyeste kampene og henger særlig med skudd på mål/baklengs.",
      },
      {
        title: "DTB",
        source: "Fase",
        values: chanceMetrics.dtb,
        note: "Høye topper i kampene med mye trykk og mange skudd imot.",
      },
      {
        title: "Overgang mot",
        source: "Fase",
        values: chanceMetrics.transition,
        note: "Ikke en jevn hovedtrend, men har tydelige spiker i enkeltkamper.",
      },
      {
        title: "D Dødball",
        source: "Fase",
        values: chanceMetrics.deadBall,
        note: "Volumet er høyt, men forklarer xG mot mindre stabilt enn sonene.",
      },
      {
        title: "Goal zone mot",
        source: "Sone",
        values: chanceMetrics.goalZone,
        note: "Går ikke opp. Problemet starter oftere før selve avslutningssonen.",
      },
    ].map((row) => ({ ...row, ...period(row.values) }));

    const riskMatches = data.matches
      .slice(-recentWindowSize)
      .filter((match) => match.xgAgainst >= 2 || match.shotsAgainst >= 17 || match.shotsOnTargetAgainst >= 7)
      .map((match) => {
        const index = match.matchNo - 1;
        const drivers = [
          { label: "assist", value: chanceMetrics.assist[index] },
          { label: "cross", value: chanceMetrics.cross[index] },
          { label: "lang ball", value: chanceMetrics.longBall[index] },
          { label: "overgang", value: chanceMetrics.transition[index] },
          { label: "DTB", value: chanceMetrics.dtb[index] },
          { label: "balltap", value: chanceMetrics.ballLoss[index] },
        ]
          .sort((a, b) => b.value - a.value)
          .slice(0, 2)
          .map((driver) => `${driver.label} ${number(driver.value, 0)}`)
          .join(" · ");

        return {
          match,
          drivers,
          riskScore: match.xgAgainst * 1.5 + match.shotsAgainst * 0.15 + match.shotsOnTargetAgainst * 0.2,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 6);

    return {
      metrics: {
        xga: period(chanceMetrics.xga),
        shots: period(chanceMetrics.shots),
        shotsOnTarget: period(chanceMetrics.shotsOnTarget),
        goals: period(chanceMetrics.goals),
        assist: period(chanceMetrics.assist),
        cross: period(chanceMetrics.cross),
        longBall: period(chanceMetrics.longBall),
        transition: period(chanceMetrics.transition),
      },
      patterns: [
        {
          title: "Mønster 1: assistsoner før avslutning",
          text: `Assist zone mot ligger på ${number(period(chanceMetrics.assist).recentAverage, 1)} i siste 6 mot ${number(
            period(chanceMetrics.assist).seasonAverage,
            1,
          )} i sesongsnitt. Det er den tydeligste gjentakende inngangen til sjanser imot.`,
        },
        {
          title: "Mønster 2: bredde og innlegg",
          text: `Cross zone mot er ${number(period(chanceMetrics.cross).recentAverage, 1)} i siste 6 mot ${number(
            period(chanceMetrics.cross).seasonAverage,
            1,
          )} i sesongsnitt. Motstander får fortsatt levere for ofte fra sidene.`,
        },
        {
          title: "Mønster 3: lange baller og andreballer",
          text: `D Lang ball er ${number(period(chanceMetrics.longBall).recentAverage, 1)} i siste 6 og ${number(
            period(chanceMetrics.longBall).latest,
            0,
          )} i siste kamp. Det peker mot mer press på andreball/returløp.`,
        },
        {
          title: "Overganger er mer kampavhengig",
          text: `Overgang mot er ikke en jevnt stigende linje, men enkeltkamper i siste 6 gir høye topper. Det er en spike-risiko, ikke hovedtrenden.`,
        },
        {
          title: "Dødball er høyt volum, men ikke hovedforklaringen",
          text: `Dødball mot er stabilt høyt, men sammenhengen med xG mot er svakere enn assist-/cross-soner.`,
        },
      ],
      phaseRows,
      riskMatches,
    };
  };

  const buildIndividualTrendCandidates = () => {
    const candidates = [];

    data.individualPlayers.forEach((player) => {
      const matches = player.matches
        .filter((match) => match.minutes >= 15)
        .sort((a, b) => a.matchNo - b.matchNo);

      if (matches.length < 6 || sum(matches, "minutes") < 300) return;

      const recentRows = matches.slice(-recentWindowSize);
      const recentMinutes = sum(recentRows, "minutes");
      if (recentMinutes < 150) return;

      playerMetricDefinitions.forEach((definition) => {
        if (!hasEnoughData(definition, matches)) return;
        const values = matches.map((match) => metricValue(definition, [match]));
        const stats = linearTrendStats(values, definition.direction);

        const seasonAverage = metricValue(definition, matches);
        const recentAverage = metricValue(definition, recentRows);
        const latest = metricValue(definition, [matches[matches.length - 1]]);
        if (
          seasonAverage === null ||
          recentAverage === null ||
          latest === null ||
          !Number.isFinite(seasonAverage) ||
          !Number.isFinite(recentAverage) ||
          !Number.isFinite(latest)
        ) {
          return;
        }

        candidates.push({
          player: player.player,
          image: player.image || "./moss-fk.png",
          title: definition.title,
          category: definition.category,
          source: "Wyscout",
          direction: definition.direction,
          digits: definition.digits,
          suffix: definition.suffix || "",
          ...stats,
          seasonAverage,
          recentAverage,
          latest,
          score: stats.score,
          positiveScore: -stats.score,
          values,
          seasonMeta: `${matches.length} kamper / ${integer(sum(matches, "minutes"))} min`,
          recentMeta: `${recentRows.length} kamper / ${integer(recentMinutes)} min`,
          note: playerTrendNote(definition.title, player.player),
        });
      });
    });

    const gpsRowsByPlayer = new Map();
    data.gpsMatches.forEach((match) => {
      (match.players || []).forEach((row) => {
        if (!knownPlayers.has(row.player)) return;
        if (!gpsRowsByPlayer.has(row.player)) gpsRowsByPlayer.set(row.player, []);
        gpsRowsByPlayer.get(row.player).push({ ...row, matchNo: match.matchNo });
      });
    });

    gpsRowsByPlayer.forEach((rows, player) => {
      const sortedRows = rows
        .filter((row) => Number.isFinite(Number(row.distancePerMinute)))
        .sort((a, b) => a.matchNo - b.matchNo);
      if (sortedRows.length < 6) return;
      const recentRows = sortedRows.slice(-recentWindowSize);

      gpsMetricDefinitions.forEach((definition) => {
        const values = sortedRows.map((row) => Number(row[definition.key]));
        const stats = linearTrendStats(values, definition.direction);
        const seasonAverage = average(values);
        const recentAverage = average(recentRows.map((row) => Number(row[definition.key])));
        const latest = Number(sortedRows[sortedRows.length - 1][definition.key]);
        if (seasonAverage === null || recentAverage === null || !Number.isFinite(latest)) return;

        candidates.push({
          player,
          image: playerImageByName[player] || "./moss-fk.png",
          title: definition.title,
          category: definition.category,
          source: "GPS/HPS",
          direction: definition.direction,
          digits: definition.digits,
          suffix: definition.suffix || "",
          ...stats,
          seasonAverage,
          recentAverage,
          latest,
          score: stats.score,
          positiveScore: -stats.score,
          values,
          seasonMeta: `${sortedRows.length} kamper`,
          recentMeta: `${recentRows.length} kamper`,
          note: playerTrendNote(definition.title, player),
        });
      });
    });

    return candidates;
  };

  const selectIndividualTrendSet = (candidates, scoreKey, limit, maxPerPlayer) => {
    const countByPlayer = {};
    return candidates
      .filter((trend) => trend[scoreKey] > 0)
      .sort((a, b) => b[scoreKey] - a[scoreKey])
      .filter((trend) => {
        countByPlayer[trend.player] = countByPlayer[trend.player] || 0;
        if (countByPlayer[trend.player] >= maxPerPlayer) return false;
        countByPlayer[trend.player] += 1;
        return true;
      })
      .slice(0, limit);
  };

  const buildIndividualTrends = (candidates = buildIndividualTrendCandidates()) =>
    selectIndividualTrendSet(candidates, "score", 15, 2);

  const buildIndividualSnapshot = () => {
    const playerDefinitions = [
      involvementMetricDefinition,
      ...individualSnapshotPlayerMetricKeys
        .map((key) => playerMetricDefinitions.find((definition) => definition.key === key))
        .filter(Boolean),
    ];
    const gpsRowsByPlayer = new Map();
    data.gpsMatches.forEach((match) => {
      (match.players || []).forEach((row) => {
        if (!knownPlayers.has(row.player)) return;
        if (!gpsRowsByPlayer.has(row.player)) gpsRowsByPlayer.set(row.player, []);
        gpsRowsByPlayer.get(row.player).push({ ...row, matchNo: match.matchNo });
      });
    });
    const buildTrendFromValues = (definition, values, source) => {
      const clean = values.filter((value) => value !== null && Number.isFinite(value));
      if (!clean.length) {
        return {
          ...definition,
          source,
          suffix: definition.suffix || "",
          seasonAverage: null,
          recentAverage: null,
          latest: null,
          recentSlope: 0,
          score: 0,
          tone: "neutral",
          noData: true,
        };
      }
      const stats = linearTrendStats(values, definition.direction);
      return {
        ...definition,
        source,
        suffix: definition.suffix || "",
        ...stats,
        seasonAverage: stats.seasonAverage,
        recentAverage: stats.recentAverage,
        latest: stats.latest,
        score: stats.score,
        tone: stats.score > 0.05 ? "negative" : stats.score < -0.05 ? "positive" : "neutral",
        noData: false,
      };
    };
    return data.individualPlayers
      .map((player) => {
        const matches = player.matches
          .filter((match) => match.minutes >= 15)
          .sort((a, b) => a.matchNo - b.matchNo);
        if (matches.length < 6 || sum(matches, "minutes") < 300) return null;

        const recentRows = matches.slice(-recentWindowSize);
        if (sum(recentRows, "minutes") < 150) return null;

        return {
          player: player.player,
          image: player.image || "./moss-fk.png",
          trends: [
            ...playerDefinitions.map((definition) => {
              const values = matches.map((match) => metricValue(definition, [match]));
              const stats = linearTrendStats(values, definition.direction);
              return {
                ...definition,
                source: definition.source || "Wyscout",
                suffix: definition.suffix || "",
                ...stats,
                seasonAverage: metricValue(definition, matches) ?? 0,
                recentAverage: metricValue(definition, recentRows) ?? 0,
                latest: metricValue(definition, [matches[matches.length - 1]]) ?? 0,
                score: stats.score,
                tone: stats.score > 0.05 ? "negative" : stats.score < -0.05 ? "positive" : "neutral",
                noData: false,
              };
            }),
            ...individualSnapshotGpsDefinitions.map((definition) => {
              const rows = (gpsRowsByPlayer.get(player.player) || []).sort((a, b) => a.matchNo - b.matchNo);
              const values = rows.map((row) => Number(row[definition.field])).filter((value) => Number.isFinite(value));
              return buildTrendFromValues(definition, values, "GPS/HPS");
            }),
          ],
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.player.localeCompare(b.player, "nb"));
  };

  function playerTrendNote(metricTitle, player) {
    const notes = {
      "Balltap per 90": "Flere balltap per 90 gjør laget mer sårbart i etterkant av egne angrep.",
      "Skudd på mål per 90": "Direkte avslutningstrussel faller i kamp-for-kamp-retningen, særlig i siste 6.",
      "Skudd per 90": "Avslutningsvolumet er lavere i siste 6 og peker negativt kamp for kamp.",
      "Gjenvinninger per 90": "Færre gjenvinninger reduserer bidraget i førsteforsvar og andreballer.",
      "Pasninger siste tredjedel per 90": "Mindre involvering inn i siste tredjedel gir lavere fremdrift.",
      "Progressive pasninger per 90": "Færre progressive pasninger demper evnen til å flytte laget frem.",
      "Pasningspresisjon": "Lavere treffprosent gir mer brudd i etablerte angrep.",
      "Duellseier": "Lavere duellandel påvirker både trykk, andreballer og defensiv stabilitet.",
      "Keeper baklengs per 90": "Baklengssnittet peker oppover i kamp-for-kamp-retningen.",
      "GPS HMLD per minutt": "Høyintensiv belastning per minutt er lavere i siste 6.",
      "GPS meter per minutt": "Løpsintensiteten per minutt faller i GPS/HPS-grunnlaget.",
    };
    return notes[metricTitle] || `${player} har en negativ kamp-for-kamp-retning i denne metrikken, med særlig vekt på siste 6.`;
  }

  const formatValue = (trend, value) => `${number(value, trend.digits ?? 1)}${trend.suffix || ""}`;
  const formatSnapshotValue = (trend, value) => (trend.noData ? "Mangler" : formatValue(trend, value));
  const formatSnapshotSlope = (trend) => (trend.noData ? "Ingen data" : formatSlope(trend));
  const signedNumber = (value, digits = 1) => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${number(Math.abs(value), digits)}`;
  };
  const formatSlope = (trend) => `${signedNumber(trend.recentSlope, trend.digits ?? 1)}${trend.suffix || ""}/kamp`;

  const buildSparkline = (values, direction) => {
    const clean = values.filter((value) => value !== null && Number.isFinite(value));
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const range = max - min || 1;
    return values
      .map((value, index) => {
        const height = value === null || !Number.isFinite(value) ? 4 : 8 + ((value - min) / range) * 34;
        const isGoodDirection =
          index > 0 &&
          value !== null &&
          values[index - 1] !== null &&
          (direction === "high" ? value >= values[index - 1] : value <= values[index - 1]);
        const isRecent = index >= values.length - recentWindowSize;
        const classes = [isGoodDirection ? "is-good-direction" : "", isRecent ? "is-recent" : ""]
          .filter(Boolean)
          .join(" ");
        return `<i class="${classes}" style="height:${height}px"></i>`;
      })
      .join("");
  };

  const renderKpis = (teamTrends, individualTrends) => {
    const hpsText = data.gpsSource?.matchedSheets
      ? `${data.gpsSource.matchedSheets}/${data.gpsSource.matchSheets} kamper`
      : "Ikke tilgjengelig";
    element("summaryKpis").innerHTML = [
      { label: "Datagrunnlag", value: `${data.summary.matches}`, detail: "kamper analysert" },
      { label: "Lagstrender", value: `${teamTrends.length}`, detail: "negative trender prioritert" },
      { label: "Individtrender", value: `${individualTrends.length}`, detail: "maks to per spiller" },
      { label: "GPS/HPS", value: hpsText, detail: "fysisk datadekning" },
    ]
      .map(
        (kpi) => `
          <article class="kpi-card">
            <span>${escapeHtml(kpi.label)}</span>
            <strong>${escapeHtml(kpi.value)}</strong>
            <em>${escapeHtml(kpi.detail)}</em>
          </article>
        `,
      )
      .join("");
  };

  const renderOverview = (containerId, countId, trends, type) => {
    element(countId).textContent = `${trends.length} funn`;
    element(containerId).innerHTML = trends
      .slice(0, 5)
      .map((trend, index) => {
        const title = type === "individual" ? `${trend.player}: ${trend.title}` : trend.title;
        return `
          <div class="compact-item">
            <span class="rank">${index + 1}</span>
            <div>
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(trend.category)} · ${escapeHtml(trend.source)}</span>
            </div>
            <span class="compact-value">${formatValue(trend, trend.recentAverage)} siste 6 · ${formatValue(
              trend,
              trend.latest,
            )} sist</span>
          </div>
        `;
      })
      .join("");
  };

  const renderSpecialComparison = (comparison) => {
    element("specialTrendCount").textContent = `${comparison.matches.last2} mot ${comparison.matches.last7} kamper`;
    const renderSignals = (signals, fallback) =>
      signals.length
        ? signals
            .map(
              (signal) => `
                <span>${escapeHtml(signal.title)} ${signedNumber(signal.change, signal.digits)}</span>
              `,
            )
            .join("")
        : `<span>${escapeHtml(fallback)}</span>`;

    element("specialLead").innerHTML = `
      <strong>${escapeHtml(comparison.lead.title)}</strong>
      <span>${escapeHtml(comparison.lead.text)}</span>
      <div class="special-signal-row">
        <div>
          <em>Røde avvik</em>
          ${renderSignals(comparison.lead.redSignals, "Ingen tydelige røde avvik")}
        </div>
        <div>
          <em>Bedre enn siste 7</em>
          ${renderSignals(comparison.lead.greenSignals, "Ingen tydelige forbedringer")}
        </div>
      </div>
    `;

    element("specialMetrics").innerHTML = comparison.metrics
      .map((metric) => {
        const status = metric.isNegative ? "is-negative" : metric.isPositive ? "is-positive" : "is-neutral";
        const label = metric.isNegative ? "Svakere" : metric.isPositive ? "Bedre" : "Stabilt";
        return `
          <article class="special-metric ${status}">
            <div>
              <span>${escapeHtml(metric.title)}</span>
              <strong>${number(metric.last2, metric.digits)}</strong>
            </div>
            <p>Siste 7: ${number(metric.last7, metric.digits)} · ${signedNumber(metric.change, metric.digits)}</p>
            <em>${escapeHtml(label)}</em>
          </article>
        `;
      })
      .join("");

    element("specialMatches").innerHTML = comparison.matchCards
      .map(
        (match) => `
          <article class="special-match">
            <strong>${escapeHtml(match.label)}</strong>
            <span>${escapeHtml(match.result)} · ${integer(match.points)} poeng</span>
            <em>${escapeHtml(match.drivers)}</em>
          </article>
        `,
      )
      .join("");
  };

  const renderTeamTrends = (trends) => {
    element("teamTrendCount").textContent = `${trends.length} trender`;
    element("teamTrendList").innerHTML = trends
      .map(
        (trend, index) => `
          <article class="trend-card">
            <span class="rank">${index + 1}</span>
            <div class="trend-main">
              <div class="trend-label">
                <h3>${escapeHtml(trend.title)}</h3>
                <span class="tag is-red">${escapeHtml(trend.category)}</span>
                <span class="tag">${escapeHtml(trend.source)}</span>
              </div>
              <p class="trend-text">${escapeHtml(trend.note)}</p>
              <div class="evidence-foot">
                <span>Sesong: ${formatValue(trend, trend.seasonAverage)}</span>
                <span>Siste 6: ${formatValue(trend, trend.recentAverage)}</span>
                <span>Retning: ${formatSlope(trend)}</span>
              </div>
            </div>
            <div class="trend-evidence">
              <div class="metric-shift">
                <div class="metric-box">
                  <span>Sesong</span>
                  <strong>${formatValue(trend, trend.seasonAverage)}</strong>
                </div>
                <div class="metric-box">
                  <span>Siste 6</span>
                  <strong>${formatValue(trend, trend.recentAverage)}</strong>
                </div>
                <div class="metric-box">
                  <span>Siste kamp</span>
                  <strong>${formatValue(trend, trend.latest)}</strong>
                </div>
              </div>
              <div class="sparkline" aria-hidden="true">${buildSparkline(trend.values, trend.direction)}</div>
            </div>
          </article>
        `,
      )
      .join("");
  };

  const renderChanceAnalysis = (analysis) => {
    const metrics = analysis.metrics;
    element("chanceTrendCount").textContent = "fase og sone";
    element("chanceLead").innerHTML = `
      <strong>Sjansene mot oss kommer oftest gjennom tilgang til assistsoner og innleggssoner før selve avslutningen.</strong>
      <span>
        I siste 6 ligger xG mot på ${number(metrics.xga.recentAverage, 2)} mot ${number(metrics.xga.seasonAverage, 2)}
        i sesongsnitt, mens skudd mot ligger på ${number(metrics.shots.recentAverage, 1)} mot ${number(metrics.shots.seasonAverage, 1)}.
        Det som går igjen er ikke én enkelt fase, men at motstander får etablert siste handling fra side-/assistsoner for ofte.
      </span>
    `;

    element("chanceKpis").innerHTML = [
      { label: "xG mot", value: `${number(metrics.xga.recentAverage, 2)}`, detail: `siste 6 · sesong ${number(metrics.xga.seasonAverage, 2)}` },
      { label: "Skudd mot", value: `${number(metrics.shots.recentAverage, 1)}`, detail: `siste 6 · sesong ${number(metrics.shots.seasonAverage, 1)}` },
      { label: "Assist zone mot", value: `${number(metrics.assist.recentAverage, 1)}`, detail: `siste 6 · sesong ${number(metrics.assist.seasonAverage, 1)}` },
      { label: "Cross zone mot", value: `${number(metrics.cross.recentAverage, 1)}`, detail: `siste 6 · sesong ${number(metrics.cross.seasonAverage, 1)}` },
    ]
      .map(
        (item) => `
          <article class="chance-kpi">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <em>${escapeHtml(item.detail)}</em>
          </article>
        `,
      )
      .join("");

    element("chancePatterns").innerHTML = analysis.patterns
      .map(
        (pattern, index) => `
          <div class="pattern-item">
            <span class="rank">${index + 1}</span>
            <div>
              <strong>${escapeHtml(pattern.title)}</strong>
              <span>${escapeHtml(pattern.text)}</span>
            </div>
          </div>
        `,
      )
      .join("");

    const maxPhaseValue = Math.max(...analysis.phaseRows.flatMap((row) => [row.seasonAverage, row.recentAverage, row.latest]));
    element("chancePhases").innerHTML = analysis.phaseRows
      .map((row) => {
        const width = (value) => `${Math.max(5, (value / maxPhaseValue) * 100)}%`;
        return `
          <div class="phase-row">
            <div class="phase-label">
              <strong>${escapeHtml(row.title)}</strong>
              <span>${escapeHtml(row.source)}</span>
            </div>
            <div class="phase-bars">
              <div class="phase-bar">
                <span>Sesong</span>
                <i style="width:${width(row.seasonAverage)}"></i>
                <span>${number(row.seasonAverage, 1)}</span>
              </div>
              <div class="phase-bar is-late">
                <span>Siste 6</span>
                <i style="width:${width(row.recentAverage)}"></i>
                <span>${number(row.recentAverage, 1)}</span>
              </div>
              <div class="phase-bar is-last">
                <span>Siste kamp</span>
                <i style="width:${width(row.latest)}"></i>
                <span>${number(row.latest, 1)}</span>
              </div>
              <div class="phase-note">${escapeHtml(row.note)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    element("chanceMatches").innerHTML = analysis.riskMatches
      .map(({ match, drivers }) => {
        const label = match.venue === "Hjemme" ? `Moss - ${match.opponent}` : `${match.opponent} - Moss`;
        return `
          <article class="risk-match">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(match.score)} · xG mot ${number(match.xgAgainst, 2)} · skudd mot ${integer(match.shotsAgainst)}</span>
            <em>${escapeHtml(drivers)}</em>
          </article>
        `;
      })
      .join("");
  };

  const renderIndividualSnapshot = (players) => {
    element("individualSnapshotCount").textContent = `${players.length} spillere · 8 parametere`;
    element("individualPlayerSnapshot").innerHTML = players
      .map(
        (player) => `
          <article class="player-snapshot-card">
            <div class="player-snapshot-head">
              <img src="${escapeHtml(player.image)}" alt="${escapeHtml(player.player)}" />
              <div>
                <h3>${escapeHtml(player.player)}</h3>
                <span>${player.trends.length} parametere · siste 6 tyngst</span>
              </div>
            </div>
            <div class="snapshot-list">
              ${player.trends
                .map(
                  (trend, index) => `
                    <div class="snapshot-item is-${trend.tone}">
                      <span class="rank">${index + 1}</span>
                      <div class="snapshot-main">
                        <strong>${escapeHtml(trend.title)}</strong>
                        <span>${escapeHtml(trend.category)} · ${escapeHtml(trend.source)}</span>
                        <em>Sesong ${formatSnapshotValue(trend, trend.seasonAverage)} · siste kamp ${formatSnapshotValue(
                          trend,
                          trend.latest,
                        )}</em>
                      </div>
                      <div class="snapshot-value">
                        <strong>${formatSnapshotValue(trend, trend.recentAverage)}</strong>
                        <span>Siste 6</span>
                        <em>${trend.tone === "negative" ? "Rød" : trend.tone === "positive" ? "Grønn" : "Stabil"} · ${formatSnapshotSlope(
                          trend,
                        )}</em>
                      </div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </article>
        `,
      )
      .join("");
  };

  const renderIndividualTrends = (trends) => {
    element("individualTrendCount").textContent = `${trends.length} trender`;
    element("individualTrendList").innerHTML = trends
      .map(
        (trend, index) => `
          <article class="trend-card">
            <span class="rank">${index + 1}</span>
            <div class="trend-main">
              <div class="player-head">
                <img src="${escapeHtml(trend.image)}" alt="${escapeHtml(trend.player)}" />
                <div class="trend-label">
                  <h3>${escapeHtml(trend.player)}</h3>
                  <span class="tag is-red">${escapeHtml(trend.title)}</span>
                  <span class="tag">${escapeHtml(trend.category)}</span>
                  <span class="tag">${escapeHtml(trend.source)}</span>
                </div>
              </div>
              <p class="trend-text">${escapeHtml(trend.note)}</p>
              <div class="evidence-foot">
                <span>Sesong: ${escapeHtml(trend.seasonMeta)}</span>
                <span>Siste 6: ${escapeHtml(trend.recentMeta)}</span>
                <span>Retning: ${formatSlope(trend)}</span>
              </div>
            </div>
            <div class="trend-evidence">
              <div class="metric-shift">
                <div class="metric-box">
                  <span>Sesong</span>
                  <strong>${formatValue(trend, trend.seasonAverage)}</strong>
                </div>
                <div class="metric-box">
                  <span>Siste 6</span>
                  <strong>${formatValue(trend, trend.recentAverage)}</strong>
                </div>
                <div class="metric-box">
                  <span>Siste kamp</span>
                  <strong>${formatValue(trend, trend.latest)}</strong>
                </div>
              </div>
              <div class="sparkline" aria-hidden="true">${buildSparkline(trend.values, trend.direction)}</div>
            </div>
          </article>
        `,
      )
      .join("");
  };

  const initializeEvaluation = () => {
    const teamTrends = buildTeamTrends();
    const specialComparison = buildSpecialComparison();
    const chanceAnalysis = buildChanceAnalysis();
    const individualCandidates = buildIndividualTrendCandidates();
    const individualTrends = buildIndividualTrends(individualCandidates);
    const individualSnapshot = buildIndividualSnapshot();

    renderKpis(teamTrends, individualTrends);
    renderOverview("teamOverview", "teamOverviewCount", teamTrends, "team");
    renderOverview("individualOverview", "individualOverviewCount", individualTrends, "individual");
    renderSpecialComparison(specialComparison);
    renderChanceAnalysis(chanceAnalysis);
    renderTeamTrends(teamTrends);
    renderIndividualSnapshot(individualSnapshot);
    renderIndividualTrends(individualTrends);
  };

  const showEvaluation = () => {
    element("passwordGate").hidden = true;
    element("evaluationShell").hidden = false;
    initializeEvaluation();
  };

  element("passwordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const password = element("dashboardPassword").value.trim();
    if (password !== dashboardPassword) {
      element("passwordError").hidden = false;
      return;
    }
    localStorage.setItem(authStorageKey, "true");
    showEvaluation();
  });

  document.querySelectorAll("[data-jump-target]").forEach((button) => {
    button.addEventListener("click", () => {
      element(button.dataset.jumpTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (localStorage.getItem(authStorageKey) === "true") {
    showEvaluation();
  }
})();
