// Shared mutable game state. Every module reads and writes this one object.
export const G = {
  state: 'menu', // menu | playing | paused | busted | wasted | win
  time: 0,
  money: 0,
  wanted: 0,
  crimeAt: -999,
  decayAt: 0,
  missionIndex: 0,
  missionDone: false,
  shotMode: 0, // 0 = live game, 1..4 = scripted screenshot scene
  camYaw: 0,
  camPitch: 0.32,
  keys: {},
  mouseDX: 0,
  mouseDY: 0,
};
