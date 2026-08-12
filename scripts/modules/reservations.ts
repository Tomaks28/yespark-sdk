import { select, input, confirm } from "@inquirer/prompts";
import { getAuthenticatedClient, globalConfig } from "../lib/auth.js";
import { formatDateFr, formatApiError } from "../lib/formatters.js";
import { geocodeAddress } from "../lib/geocode.js";
import { getMemberDisplayName, getParkingInfo } from "../lib/cache.js";
import { promptPageNavigation } from "../lib/pagination.js";
import { YesparkApiError } from "../../src/errors.js";
import type { YesparkClient } from "../../src/index.js";

/** Charge les réservations encore actives, ou `null` si l'appel a échoué.
 *
 * L'erreur éventuelle est déjà rapportée à l'utilisateur : un `null` signifie
 * simplement à l'appelant qu'il n'y a rien à proposer.
 */
async function loadActiveReservations(
  cli: YesparkClient,
): Promise<any[] | null> {
  try {
    const listResponse = await cli.reservations.list({
      "pagination.pageSize": 20,
    });
    return (listResponse.results || []).filter((r) => !r.cancellationDate);
  } catch (err) {
    console.error(formatApiError(err));
    return null;
  }
}

async function renderReservationCard(
  cli: YesparkClient,
  r: any,
  index: number,
  pageNumber: number,
  pageSize: number,
): Promise<void> {
  let statusStr = "✅ Active";
  if (r.cancellationDate) {
    statusStr = "❌ Annulée";
  } else if (new Date(r.endDate || "") < new Date()) {
    statusStr = "⌛ Expirée";
  }

  const memberDisplay = await getMemberDisplayName(cli, r.userId || "");
  const parkingInfo = await getParkingInfo(cli, r.parkingId || "");

  console.log(
    `[${(pageNumber - 1) * pageSize + index + 1}] N° ${r.number || "N/A"} | Status: ${statusStr}`,
  );
  console.log(`    👤 Membre  : ${memberDisplay}`);
  console.log(`    🅿️ Parking : ${parkingInfo.name} (ID: ${r.parkingId})`);
  console.log(`    📍 Adresse : ${parkingInfo.address}`);
  console.log(
    `    📅 Période : du ${formatDateFr(r.beginDate)} au ${formatDateFr(r.endDate)}`,
  );
  if (r.amount !== undefined && r.amount !== null) {
    console.log(`    💶 Montant : ${r.amount} €`);
  }
  console.log("-------------------------------------------------");
}

async function promptReservationFilter(): Promise<{
  userId: string;
  parkingId: string;
}> {
  const filterChoice = await select({
    message: "Filtre de recherche pour les réservations :",
    choices: [
      { name: "🌐 Toutes les réservations (Sans filtre)", value: "all" },
      { name: "👤 Filtrer par un membre spécifique (userId)", value: "user" },
      { name: "🅿️ Filtrer par un ID de parking", value: "parking" },
    ],
  });

  let userId = "";
  let parkingId = "";

  if (filterChoice === "user") {
    userId = await input({
      message: "Saisissez l'ID de l'utilisateur (userId) :",
      validate: (v) => v.trim() !== "" || "L'ID utilisateur est requis",
    });
  } else if (filterChoice === "parking") {
    parkingId = await input({
      message: "Saisissez l'ID du parking :",
      validate: (v) => v.trim() !== "" || "L'ID de parking est requis",
    });
  }

  return { userId, parkingId };
}

interface NavResult {
  action: "next" | "prev" | "refilter" | "size" | "back";
  newSize?: number;
  newFilter?: { userId: string; parkingId: string };
}

async function promptListNavigation(
  pageNumber: number,
  totalPages: number,
  pageSize: number,
): Promise<NavResult> {
  const navAction = await promptPageNavigation(
    "Navigation dans la liste des réservations :",
    pageNumber,
    totalPages,
    [
      {
        name: `🔍 Changer de filtre (Membre / Parking)`,
        value: "refilter",
      },
      {
        name: `🔢 Modifier la taille de page (actuellement: ${pageSize})`,
        value: "size",
      },
    ],
  );

  if (navAction === "refilter") {
    const newFilter = await promptReservationFilter();
    return { action: "refilter", newFilter };
  }

  if (navAction === "size") {
    const sizeStr = await input({
      message: "Éléments par page (5, 10, 20, 50) :",
      default: String(pageSize),
    });
    const newSize = Number.parseInt(sizeStr, 10) || pageSize;
    return { action: "size", newSize };
  }

  return { action: navAction as "next" | "prev" | "back" };
}

export async function handleListReservations(): Promise<void> {
  const cli = await getAuthenticatedClient();
  let pageNumber = 1;
  let pageSize = 10;
  let { userId: filterUserId, parkingId: filterParkingId } =
    await promptReservationFilter();
  let viewing = true;

  while (viewing) {
    const query: Record<string, any> = {
      "pagination.pageSize": pageSize,
      "pagination.pageNumber": pageNumber,
    };
    if (filterUserId) query.userId = filterUserId;
    if (filterParkingId)
      query.ParkingId = Number.parseInt(filterParkingId, 10) || filterParkingId;

    console.log(
      `\n📋 Récupération des réservations (Page ${pageNumber}, ${pageSize}/page)...`,
    );
    try {
      const listResponse = await cli.reservations.list(query);
      const reservations = listResponse.results || [];
      const pag = listResponse.pagination || {};
      const totalPages = pag.totalPages || 1;
      const totalResults = pag.totalResults ?? reservations.length;

      if (reservations.length === 0) {
        const userSuffix = filterUserId
          ? ` pour le membre ${filterUserId}`
          : "";
        console.log(`ℹ️ Aucune réservation trouvée${userSuffix}.`);
        const tryAgain = await confirm({
          message: "Réinitialiser les filtres et réessayer ?",
          default: true,
        });
        if (tryAgain) {
          filterUserId = "";
          filterParkingId = "";
          pageNumber = 1;
          continue;
        }
        return;
      }

      console.log(
        `\n✨ Réservations (Page ${pageNumber}/${totalPages} - ${reservations.length} sur ${totalResults} au total) :\n`,
      );

      for (let index = 0; index < reservations.length; index++) {
        const r = reservations[index];
        if (r) {
          await renderReservationCard(cli, r, index, pageNumber, pageSize);
        }
      }

      const nav = await promptListNavigation(pageNumber, totalPages, pageSize);
      if (nav.action === "next") pageNumber++;
      else if (nav.action === "prev") pageNumber--;
      else if (nav.action === "refilter" && nav.newFilter) {
        filterUserId = nav.newFilter.userId;
        filterParkingId = nav.newFilter.parkingId;
        pageNumber = 1;
      } else if (nav.action === "size" && nav.newSize) {
        pageSize = nav.newSize;
        pageNumber = 1;
      } else {
        viewing = false;
      }
    } catch (err: any) {
      console.error(formatApiError(err));
      viewing = false;
    }
  }
}

export async function handleGetReservationDetail(): Promise<void> {
  const cli = await getAuthenticatedClient();
  const resNumber = await input({
    message: "Saisissez le numéro de la réservation (ex: 3765050) :",
    validate: (v) => v.trim() !== "" || "Numéro de réservation obligatoire",
  });

  try {
    const details = await cli.reservations.get(resNumber);
    const memberDisplay = await getMemberDisplayName(cli, details.userId || "");
    const parkingInfo = await getParkingInfo(cli, details.parkingId || "");

    console.log(`\n=================================================`);
    console.log(`ℹ️ DÉTAILS DE LA RÉSERVATION N° ${resNumber}`);
    console.log(`=================================================`);
    console.log(`📌 Numéro   : ${details.number}`);
    console.log(`👤 Membre   : ${memberDisplay}`);
    console.log(`🅿️ Parking  : ${parkingInfo.name} (ID: ${details.parkingId})`);
    console.log(`📍 Adresse  : ${parkingInfo.address}`);
    console.log(`📅 Début    : ${formatDateFr(details.beginDate)}`);
    console.log(`📅 Fin      : ${formatDateFr(details.endDate)}`);
    if (details.amount !== undefined)
      console.log(`💶 Montant  : ${details.amount} €`);
    console.log(`\nJSON brut :`, JSON.stringify(details, null, 2));
    console.log(`=================================================\n`);
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}

async function ensureMemberExists(
  cli: YesparkClient,
  userId: string,
  plate: string,
): Promise<void> {
  try {
    await cli.members.get(userId);
  } catch (err) {
    if (err instanceof YesparkApiError && err.status === 404) {
      try {
        await cli.members.create({
          userId,
          firstName: "Client",
          lastName: "Test",
          email: globalConfig.email || `user_${userId}@sandbox-yespark.fr`,
          registrationPlates: [{ plateNumber: plate }],
        });
        console.log(`👤 Membre créé automatiquement (ID: ${userId})`);
      } catch (e: any) {
        console.log(`ℹ️ Info création membre automatique: ${e.message || e}`);
      }
    }
  }
}

async function findCandidateParkings(
  cli: YesparkClient,
  geo: { latitude: number; longitude: number },
  beginDateIso: string,
  endDateIso: string,
): Promise<Array<{ id: string; name: string; price?: number }>> {
  const delta = 0.015;
  const locationBounds = {
    northLatitude: geo.latitude + delta,
    southLatitude: geo.latitude - delta,
    eastLongitude: geo.longitude + delta,
    westLongitude: geo.longitude - delta,
  };

  try {
    const searchResponse = await cli.search.space({
      location: {
        latitude: geo.latitude,
        longitude: geo.longitude,
        locationBounds,
      },
      beginDate: beginDateIso,
      endDate: endDateIso,
      vehicleTypes: "Small,Medium,Large",
    });

    const results = searchResponse.searchResults || [];
    const candidates = results
      .filter((r) => r.parking?.id)
      .map((r) => ({
        id: String(r.parking!.id),
        name: r.parking!.name || `Parking #${r.parking!.id}`,
        price: r.price ?? undefined,
      }));

    if (candidates.length > 0) return candidates;
  } catch (err: any) {
    console.log(
      `ℹ️ Recherche via /search/space échouée (${err.message || err}). Passage à la liste de parkings...`,
    );
  }

  try {
    const parkingsList = await cli.parkings.list({
      "locationBounds.northLatitude": locationBounds.northLatitude,
      "locationBounds.southLatitude": locationBounds.southLatitude,
      "locationBounds.eastLongitude": locationBounds.eastLongitude,
      "locationBounds.westLongitude": locationBounds.westLongitude,
    });

    const parkings = (parkingsList as any).results || [];
    return parkings.map((p: any) => ({
      id: String(p.id),
      name: p.name || `Parking #${p.id}`,
    }));
  } catch (e: any) {
    console.error(
      `⚠️ Recherche secondaire des parkings échouée: ${e.message || e}`,
    );
    return [];
  }
}

async function selectParkingFromCandidates(
  candidates: Array<{ id: string; name: string; price?: number }>,
  isInteractive: boolean,
): Promise<{ id: string; name: string }> {
  if (isInteractive && candidates.length > 1) {
    const chosenId = await select({
      message: `✨ ${candidates.length} parking(s) trouvé(s). Choisissez le parking à réserver :`,
      choices: candidates.map((p) => {
        const priceSuffix = p.price !== undefined ? ` (${p.price} €)` : "";
        return { name: `${p.name}${priceSuffix}`, value: p.id };
      }),
    });
    const chosenName =
      candidates.find((p) => p.id === chosenId)?.name || chosenId;
    return { id: chosenId, name: chosenName };
  }

  const defaultParking = candidates[0] || { id: "", name: "" };
  console.log(
    `🎯 Parking sélectionné : ${defaultParking.name} (ID: ${defaultParking.id})`,
  );
  return { id: defaultParking.id, name: defaultParking.name };
}

export async function handleReserveParking(
  args: Record<string, string>,
  isInteractive: boolean,
): Promise<void> {
  const cli = await getAuthenticatedClient();

  let addressStr =
    args.address || "37 rue du Passeur de Boulogne 92130 Issy-les-Moulineaux";
  let hours = Number.parseFloat(args.hours || "2");
  let plate = args.plate || "AA-123-BB";
  const userId = args["user-id"] || `sandbox_user_${Date.now()}`;

  if (isInteractive) {
    addressStr = await input({
      message: "Adresse de destination pour le parking :",
      default: addressStr,
    });

    const hoursInput = await input({
      message: "Durée du stationnement (en heures) :",
      default: String(hours),
      validate: (v) =>
        (!Number.isNaN(Number.parseFloat(v)) && Number.parseFloat(v) > 0) ||
        "Veuillez entrer un nombre d'heures valide",
    });
    hours = Number.parseFloat(hoursInput);

    plate = await input({
      message: "Plaque d'immatriculation du véhicule :",
      default: plate,
    });
  }

  const geo = await geocodeAddress(addressStr);
  const now = new Date();
  const startDate = args.start
    ? new Date(args.start)
    : new Date(now.getTime() + 10 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
  const beginDateIso = startDate.toISOString();
  const endDateIso = endDate.toISOString();

  console.log(
    `\n⏰ Période : du ${formatDateFr(startDate)} au ${formatDateFr(endDate)} (${hours}h)`,
  );

  await ensureMemberExists(cli, userId, plate);

  console.log(`\n🔎 Recherche des parkings disponibles...`);
  const candidateParkings = await findCandidateParkings(
    cli,
    geo,
    beginDateIso,
    endDateIso,
  );

  if (candidateParkings.length === 0) {
    console.error(
      "❌ Aucun parking disponible trouvé à proximité de cette adresse.",
    );
    return;
  }

  const chosenParking = await selectParkingFromCandidates(
    candidateParkings,
    isInteractive,
  );

  if (isInteractive) {
    const confirmReservation = await confirm({
      message: `Confirmer la réservation pour ${hours}h dans "${chosenParking.name}" (Plaque: ${plate}) ?`,
      default: true,
    });
    if (!confirmReservation) {
      console.log("🚫 Réservation annulée.");
      return;
    }
  }

  console.log(`\n🎟️ Envoi de la réservation en cours...`);
  try {
    const reservation = await cli.reservations.reserve({
      parkingId: chosenParking.id,
      userId,
      beginDate: beginDateIso,
      endDate: endDateIso,
      registrationPlates: [{ plateNumber: plate }],
    });

    console.log("\n=================================================");
    console.log("🎉 RÉSERVATION EFFECTUÉE AVEC SUCCÈS !");
    console.log("=================================================");
    console.log(`📌 Numéro de réservation : ${reservation.number || "N/A"}`);
    console.log(`🅿️ Parking               : ${chosenParking.name}`);
    console.log(`📍 Adresse demandée     : ${geo.label}`);
    console.log(`👤 Utilisateur           : ${userId}`);
    console.log(`🚗 Immatriculation       : ${plate}`);
    console.log(
      `📅 Début                 : ${formatDateFr(reservation.beginDate || beginDateIso)}`,
    );
    console.log(
      `📅 Fin                   : ${formatDateFr(reservation.endDate || endDateIso)}`,
    );
    if (reservation.amount !== undefined) {
      console.log(`💶 Montant               : ${reservation.amount} €`);
    }
    console.log("=================================================\n");
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}

export async function handleExtendReservation(): Promise<void> {
  const cli = await getAuthenticatedClient();
  console.log("\n⏳ Prolongation d'une réservation...");

  const reservations = await loadActiveReservations(cli);
  if (!reservations) return;

  if (reservations.length === 0) {
    console.log("ℹ️ Aucune réservation active à prolonger.");
    return;
  }

  const reservationNumber = await select({
    message: "Sélectionnez la réservation à prolonger :",
    choices: reservations.map((r) => ({
      name: `N° ${r.number} | Parking: ${r.parkingId} | Fin actuelle: ${formatDateFr(r.endDate)}`,
      value: r.number!,
    })),
  });

  const selectedRes = reservations.find((r) => r.number === reservationNumber);
  const currentEnd = selectedRes?.endDate
    ? new Date(selectedRes.endDate)
    : new Date();

  const additionalHours = await input({
    message: "Nombre d'heures supplémentaires à ajouter :",
    default: "1",
    validate: (v) =>
      (!Number.isNaN(Number.parseFloat(v)) && Number.parseFloat(v) > 0) ||
      "Entrez un nombre d'heures valide",
  });

  const newEndDate = new Date(
    currentEnd.getTime() + Number.parseFloat(additionalHours) * 60 * 60 * 1000,
  ).toISOString();

  try {
    const info = await cli.reservations.extensionInfo(
      reservationNumber,
      newEndDate,
    );
    console.log(`\nℹ️ Informations de prolongation :`);
    console.log(`   Nouvelle fin : ${formatDateFr(newEndDate)}`);
    if ((info as any).isPossible !== undefined) {
      console.log(
        `   Possible     : ${(info as any).isPossible ? "Oui ✅" : "Non ❌"}`,
      );
    }

    const proceed = await confirm({
      message: `Confirmer la prolongation de la réservation N° ${reservationNumber} ?`,
      default: true,
    });

    if (!proceed) return;

    await cli.reservations.extend(reservationNumber, newEndDate);
    console.log(
      `✅ Réservation N° ${reservationNumber} prolongée avec succès jusqu'au ${formatDateFr(newEndDate)} !`,
    );
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}

export async function handleCancelReservation(): Promise<void> {
  const cli = await getAuthenticatedClient();
  console.log("\n❌ Annulation d'une réservation...");

  const reservations = await loadActiveReservations(cli);
  if (!reservations) return;

  if (reservations.length === 0) {
    console.log("ℹ️ Aucune réservation active à annuler.");
    return;
  }

  const reservationNumber = await select({
    message: "Sélectionnez la réservation à annuler :",
    choices: reservations.map((r) => ({
      name: `N° ${r.number} | Parking: ${r.parkingId} | Début: ${formatDateFr(r.beginDate)}`,
      value: r.number!,
    })),
  });

  try {
    const cancelInfo =
      await cli.reservations.cancellationInfo(reservationNumber);
    console.log(
      `\nℹ️ Conditions d'annulation :`,
      JSON.stringify(cancelInfo, null, 2),
    );

    const proceed = await confirm({
      message: `⚠️ Êtes-vous sûr de vouloir annuler la réservation N° ${reservationNumber} ?`,
      default: false,
    });

    if (!proceed) {
      console.log("Opération annulée.");
      return;
    }

    await cli.reservations.cancel(reservationNumber);
    console.log(`✅ Réservation N° ${reservationNumber} annulée avec succès.`);
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}
