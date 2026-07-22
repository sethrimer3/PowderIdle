import { installPowderIdle } from './game/runtime';

installPowderIdle();

// p5 global mode discovers callbacks during its automatic startup, so install them first.
await import('p5');
