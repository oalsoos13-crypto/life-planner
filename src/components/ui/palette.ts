// ألوان المحاور (دليل الواجهات §3.3): باليتة نوعية متقاربة بالسطوع (RHY). فاتح → داكن
export const PILLAR_DARK: Record<string, string> = {
  "#0f766e": "#2ec4a8",
  "#a87b00": "#e8be4a",
  "#d03b3b": "#f27b76",
  "#2f6fdb": "#7aa8ff",
  "#c23b78": "#f07cb2",
  "#4d7c0f": "#9bcb5a",
  "#7c3aed": "#b39bff",
  "#d9601f": "#ff9a5c",
};
export const darkOf = (c: string | null | undefined) => (c ? PILLAR_DARK[c.toLowerCase()] ?? c : undefined);
