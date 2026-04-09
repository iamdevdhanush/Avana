function calculateRiskScore(data) {
  /*
    data = {
      routeDeviation: meters,
      timeOfDay: "day" | "night",
      crimeLevel: 0-100,      // from your map system
      driverRating: 1-5,
      userInactive: true/false,
      unexpectedStop: true/false
    }
  */

  let score = 100; // Start from safe

  // 🚖 Route Deviation Impact
  if (data.routeDeviation > 500) {
    score -= 30;
  } else if (data.routeDeviation > 300) {
    score -= 15;
  }

  // 🌙 Time Risk
  if (data.timeOfDay === "night") {
    score -= 10;
  }

  // 📍 Crime Area Risk
  score -= (data.crimeLevel * 0.3); // weighted

  // 🚗 Driver Rating Impact
  if (data.driverRating < 3) {
    score -= 15;
  } else if (data.driverRating < 4) {
    score -= 5;
  }

  // 🧍 User Inactivity
  if (data.userInactive) {
    score -= 10;
  }

  // ⛔ Unexpected Stop
  if (data.unexpectedStop) {
    score -= 20;
  }

  // Ensure score stays between 0–100
  score = Math.max(0, Math.min(100, score));

  // 🚨 Risk Level Classification
  let status = "SAFE";

  if (score < 40) {
    status = "DANGER";
  } else if (score < 70) {
    status = "SUSPICIOUS";
  }

  return {
    score: Math.round(score),
    status: status
  };
}