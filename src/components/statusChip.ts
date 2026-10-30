import type { Lego } from "@/lib";

/** Short status chip text (popover, Details). The full honest line is `lego.status.label`. */
export function statusChip(lego: Lego): string {
  switch (lego.statusKind) {
    case "live":
      return "Mainnet";
    case "testnet":
      return lego.id === "vibenet" ? "Preview" : "Sepolia";
    case "announced":
      return "Announced";
    default:
      return "Available";
  }
}
