export interface StructuredMathSettings {
  commitMode: "immediate" | "deferred";
  recentsLength: number;
  enableDollarShortcut: boolean;
  enableScriptShortcuts: boolean;
}

export const DEFAULT_SETTINGS: StructuredMathSettings = {
  commitMode: "immediate",
  recentsLength: 12,
  enableDollarShortcut: true,
  enableScriptShortcuts: true,
};
