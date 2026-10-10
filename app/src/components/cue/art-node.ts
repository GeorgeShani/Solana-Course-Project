/** One element of a Cue pose: tag, React-ready attributes, children. */
export interface CueArtNode {
  t: string;
  a: Record<string, string>;
  c?: CueArtNode[];
}
