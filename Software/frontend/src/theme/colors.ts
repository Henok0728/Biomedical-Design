export const colors = {
  green: "#1B7A3D",
  greenDark: "#145C2E",
  yellow: "#C9A227",
  yellowDark: "#8A6E12",
  red: "#C41E3A",
  redDark: "#8E1529",
  navy: "#12324A",
  ink: "#12202C",
  muted: "#5C6B76",
  paper: "#F4F6F8",
  white: "#FFFFFF",
  card: "#FFFFFF",
  border: "#D8DEE4",
};

export const severityColors = {
  green: { bg: colors.green, text: colors.white },
  yellow: { bg: colors.yellow, text: colors.ink },
  red: { bg: colors.red, text: colors.white },
} as const;
