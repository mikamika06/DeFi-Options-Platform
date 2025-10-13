const SQRT_2PI = Math.sqrt(2 * Math.PI);

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const approx = 1 - poly * Math.exp(-absX * absX);
  return sign * approx;
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export type BlackScholesInput = {
  isCall: boolean;
  spot: number;
  strike: number;
  time: number; // in years
  volatility: number;
  rate?: number;
};

export type BlackScholesResult = {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
};

export function blackScholes(input: BlackScholesInput): BlackScholesResult {
  const { isCall, spot, strike, time, volatility } = input;
  const rate = input.rate ?? 0;

  if (spot <= 0 || strike <= 0 || time <= 0 || volatility <= 0) {
    return { price: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  }

  const sqrtT = Math.sqrt(time);
  const sigmaSqrtT = volatility * sqrtT;
  if (sigmaSqrtT === 0) {
    return { price: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
  }

  const logTerm = Math.log(spot / strike);
  const d1 = (logTerm + (rate + 0.5 * volatility * volatility) * time) / sigmaSqrtT;
  const d2 = d1 - sigmaSqrtT;

  const pdfD1 = normPdf(d1);
  const cdfD1 = normCdf(d1);
  const cdfD2 = normCdf(d2);

  let price: number;
  let delta: number;
  let theta: number;
  let rho: number;

  const discount = Math.exp(-rate * time);

  if (isCall) {
    price = spot * cdfD1 - strike * discount * cdfD2;
    delta = cdfD1;
    theta = (-spot * pdfD1 * volatility) / (2 * sqrtT) - rate * strike * discount * cdfD2;
    rho = strike * time * discount * cdfD2;
  } else {
    const cdfNegD1 = normCdf(-d1);
    const cdfNegD2 = normCdf(-d2);
    price = strike * discount * cdfNegD2 - spot * cdfNegD1;
    delta = cdfD1 - 1;
    theta = (-spot * pdfD1 * volatility) / (2 * sqrtT) + rate * strike * discount * cdfNegD2;
    rho = -strike * time * discount * cdfNegD2;
  }

  const gamma = pdfD1 / (spot * sigmaSqrtT);
  const vega = spot * pdfD1 * sqrtT;

  return {
    price,
    delta,
    gamma,
    vega,
    theta,
    rho
  };
}
