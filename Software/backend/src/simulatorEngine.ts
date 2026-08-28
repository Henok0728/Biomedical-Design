import { ScenarioType, SensorDataPayload } from "./protocol.js";

export class SimulatorEngine {
  private activeScenario: ScenarioType = "NORMAL";
  private massG = 100.0;
  private heartRate: number | null = 75;
  private spo2: number | null = 98;
  private accelX = 0.01;
  private accelY = 0.02;
  private accelZ = 1.0;
  private motionLevel = 0.02;
  private temperature = 36.8;
  private bloodFraction = 0.15;
  private manualFluidRateGMin: number | null = null;
  private massHistory: { time: number; mass: number }[] = [];

  constructor() {
    this.resetHistory();
  }

  public setScenario(scenario: ScenarioType): SensorDataPayload {
    this.activeScenario = scenario;
    this.manualFluidRateGMin = null;

    switch (scenario) {
      case "NORMAL":
        this.massG = 100.0;
        this.heartRate = 75;
        this.spo2 = 98;
        this.motionLevel = 0.02;
        this.accelX = 0.01;
        this.accelY = 0.02;
        this.accelZ = 1.0;
        this.temperature = 36.8;
        this.bloodFraction = 0.15;
        break;

      case "MILD_BLEEDING":
        this.heartRate = 88;
        this.spo2 = 97;
        this.motionLevel = 0.04;
        this.bloodFraction = 0.35;
        break;

      case "INCREASING_BLEEDING":
        this.heartRate = 105;
        this.spo2 = 96;
        this.motionLevel = 0.05;
        this.bloodFraction = 0.6;
        break;

      case "SEVERE_BLEEDING":
        this.heartRate = 125;
        this.spo2 = 93;
        this.motionLevel = 0.06;
        this.bloodFraction = 0.85;
        break;

      case "MOVEMENT":
        this.motionLevel = 0.88;
        this.accelX = 0.45;
        this.accelY = -0.35;
        this.accelZ = 1.62;
        break;

      case "RESET":
        this.activeScenario = "NORMAL";
        this.massG = 0.0;
        this.heartRate = 75;
        this.spo2 = 98;
        this.motionLevel = 0.02;
        this.accelX = 0.01;
        this.accelY = 0.02;
        this.accelZ = 1.0;
        this.temperature = 36.8;
        this.bloodFraction = 0.15;
        this.resetHistory();
        break;
    }

    return this.tick(0);
  }

  public updateManualData(data: Partial<SensorDataPayload>): SensorDataPayload {
    if (data.mass_g !== undefined) this.massG = data.mass_g;
    if (data.fluid_rate_g_min !== undefined) this.manualFluidRateGMin = data.fluid_rate_g_min;
    if (data.heart_rate !== undefined) this.heartRate = data.heart_rate;
    if (data.spo2 !== undefined) this.spo2 = data.spo2;
    if (data.motion_level !== undefined) this.motionLevel = data.motion_level;
    if (data.temperature !== undefined) this.temperature = data.temperature;
    if (data.blood_fraction !== undefined) this.bloodFraction = data.blood_fraction;
    if (data.accel_x !== undefined) this.accelX = data.accel_x;
    if (data.accel_y !== undefined) this.accelY = data.accel_y;
    if (data.accel_z !== undefined) this.accelZ = data.accel_z;

    return this.tick(0);
  }

  public getActiveScenario(): ScenarioType {
    return this.activeScenario;
  }

  public resetHistory(): void {
    const now = Date.now();
    this.massHistory = [
      { time: now - 60000, mass: this.massG },
      { time: now, mass: this.massG }
    ];
  }

  public tick(deltaSeconds: number = 1.0): SensorDataPayload {
    // 1. Advance mass based on active scenario bleeding rate
    let increment = 0;
    if (this.activeScenario === "MILD_BLEEDING") {
      increment = 0.25 * deltaSeconds; // ~15 g/min
    } else if (this.activeScenario === "INCREASING_BLEEDING") {
      increment = 0.75 * deltaSeconds; // ~45 g/min
    } else if (this.activeScenario === "SEVERE_BLEEDING") {
      increment = 1.5 * deltaSeconds; // ~90 g/min
    }

    if (this.activeScenario === "MOVEMENT") {
      // Add slight mechanical noise to load cell readings during high motion
      const noise = (Math.random() - 0.5) * 4.0;
      this.massG = Math.max(0, this.massG + noise);
    } else {
      this.massG += increment;
    }

    // 2. Track mass history window (last 60 seconds)
    const now = Date.now();
    this.massHistory.push({ time: now, mass: this.massG });
    const windowStart = now - 60000;
    this.massHistory = this.massHistory.filter((entry) => entry.time >= windowStart);

    // 3. Calculate fluid rate (g/min)
    let calculatedRate = 0;
    if (this.massHistory.length >= 2) {
      const oldest = this.massHistory[0];
      const newest = this.massHistory[this.massHistory.length - 1];
      const elapsedMin = (newest.time - oldest.time) / 60000;
      if (elapsedMin > 0.05) {
        calculatedRate = Math.max(0, (newest.mass - oldest.mass) / elapsedMin);
      }
    }

    const fluidRateGMin = this.manualFluidRateGMin ?? Math.round(calculatedRate * 10) / 10;

    // 4. Optical characterization (TCS34725 simulated RGB values based on blood fraction)
    const bf = Math.min(1.0, Math.max(0.0, this.bloodFraction));
    const red = Math.round(120 + bf * 135);
    const green = Math.round(180 - bf * 130);
    const blue = Math.round(160 - bf * 120);
    const clear = Math.round(red + green + blue);

    // 5. Quality evaluation
    const isHighMotion = this.motionLevel > 0.4;
    const quality = isHighMotion ? "UNRELIABLE" : "GOOD";

    return {
      mass_g: Math.round(this.massG * 10) / 10,
      fluid_rate_g_min: fluidRateGMin,
      heart_rate: this.heartRate,
      spo2: this.spo2,
      red,
      green,
      blue,
      clear,
      accel_x: Math.round(this.accelX * 100) / 100,
      accel_y: Math.round(this.accelY * 100) / 100,
      accel_z: Math.round(this.accelZ * 100) / 100,
      motion_level: Math.round(this.motionLevel * 100) / 100,
      temperature: Math.round(this.temperature * 10) / 10,
      measurement_quality: quality,
      sensor_health: {
        load_cell: true,
        max30102: this.heartRate !== null,
        tcs34725: true,
        mpu6050: true,
        temp: true
      },
      blood_fraction: Math.round(bf * 100) / 100
    };
  }
}
