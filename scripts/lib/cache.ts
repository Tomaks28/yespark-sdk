import type { YesparkClient } from "../../src/index.js";

// Caches for enriching reservation displays with Member Full Name & Parking Address
const memberCache = new Map<string, string>();
const parkingCache = new Map<string, { name: string; address: string }>();

export async function getMemberDisplayName(
  cli: YesparkClient,
  userId: string,
): Promise<string> {
  if (!userId) return "N/A";
  if (memberCache.has(userId)) return memberCache.get(userId)!;

  try {
    const member = await cli.members.get(userId);
    const fullName =
      `${member.firstName || ""} ${member.lastName || ""}`.trim();
    const display = fullName ? `${fullName} (${userId})` : userId;
    memberCache.set(userId, display);
    return display;
  } catch {
    memberCache.set(userId, userId);
    return userId;
  }
}

export async function getParkingInfo(
  cli: YesparkClient,
  parkingId: string,
): Promise<{ name: string; address: string }> {
  if (!parkingId) return { name: "N/A", address: "N/A" };
  if (parkingCache.has(parkingId)) return parkingCache.get(parkingId)!;

  try {
    const details = await cli.parkings.get(parkingId);
    const p = (details as any).parking || details;
    const name = p.name || `Parking #${parkingId}`;
    let addressStr = "N/A";
    if (p.address) {
      addressStr =
        `${p.address.street || ""}, ${p.address.postcode || ""} ${p.address.city || ""}`
          .replace(/^, /, "")
          .trim();
    }
    const info = { name, address: addressStr || "N/A" };
    parkingCache.set(parkingId, info);
    return info;
  } catch {
    const fallback = { name: `Parking #${parkingId}`, address: "N/A" };
    parkingCache.set(parkingId, fallback);
    return fallback;
  }
}
