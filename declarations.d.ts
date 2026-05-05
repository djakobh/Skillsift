//Author: Brandon Christian
//Date: 4/6/2026
//Add type definitions for modules audio-context and wav-decoder

declare module 'audio-context' {
  const AudioContext: any;
export = AudioContext;
}

declare module 'wav-decoder' {
  const decode: any;
export { decode };
}