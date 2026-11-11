export type ResultTone = "win" | "softWin" | "draw" | "loss";

export type FormResult = {
  key: string | number;
  label: string;
  tone: ResultTone;
  /** Small suffix such as OT or SO. */
  note?: string;
  title?: string;
};

/** W / D / T / L style results used by soccer, basketball and football. */
export function resultTone(result: string): ResultTone {
  if (result === "W") return "win";
  if (result === "D" || result === "T") return "draw";
  return "loss";
}
