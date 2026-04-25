export { TieredTickScheduler, type TickMetrics, type TieredTickConfig, type TickHandler } from './scheduler/tiered-tick-scheduler.js';
export { BatchLLMScheduler } from './scheduler/batch-llm-scheduler.js';
export type { BatchDecisionInput, BatchDecisionOutput } from './scheduler/batch-llm-scheduler.js';

export { VirtualityManager } from './virtuality/virtuality-manager.js';
export type { RunLevel, Entity, UserContext, LevelChange, VirtualityConfig } from './virtuality/virtuality-manager.js';
export { OnDemandGenerator } from './virtuality/on-demand-generator.js';
export type { GenerationType, GenerationRequest, GenerationResult } from './virtuality/on-demand-generator.js';

export { GeographyDB } from './geography/geography-db.js';
export type { Country, Province, City, TimeZone, ClimateZone } from './geography/geography-db.js';

export { AstronomyEngine } from './astronomy/astronomy-engine.js';
export type { Season, MoonPhaseType, SunriseSunsetResult, MoonPhaseResult, SeasonResult } from './astronomy/astronomy-engine.js';

export { WeatherEngine } from './weather/weather-engine.js';
export type { WeatherState, WeatherCondition, WeatherForecast } from './weather/weather-engine.js';

export { ErrorManager } from './performance/error-manager.js';
export type { ErrorCategory, ErrorSeverity, ManagedError, ErrorStats, ErrorHandlerConfig } from './performance/error-manager.js';
export { PerformanceMonitor } from './performance/performance-monitor.js';
export type { PerformanceThresholds, AlertLevel, PerformanceAlert, PerformanceSnapshot } from './performance/performance-monitor.js';