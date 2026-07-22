import { installPowderIdle } from './game/runtime';

installPowderIdle();

// p5 global mode discovers callbacks during construction, so install them first.
const { default: P5 } = await import('p5');
const GlobalModeP5 = P5 as unknown as new () => unknown;
new GlobalModeP5();
