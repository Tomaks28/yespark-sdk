import { select, input } from "@inquirer/prompts";
import { getAuthenticatedClient } from "../lib/auth.js";
import { formatApiError } from "../lib/formatters.js";
import { geocodeAddress } from "../lib/geocode.js";

export async function handleOpenDoor(): Promise<void> {
  const cli = await getAuthenticatedClient();
  console.log("\n🚪 Ouverture de porte de parking...");

  let parkingId = "";
  let userId = "";

  try {
    const listRes = await cli.reservations.list({ "pagination.pageSize": 10 });
    const reservations = (listRes.results || []).filter((r) => !r.cancellationDate);

    if (reservations.length > 0) {
      const choice = await select({
        message: "Sélectionnez un parking à ouvrir ou entrez un ID :",
        choices: [
          ...reservations.map((r) => ({
            name: `Parking ID: ${r.parkingId} (Résa N° ${r.number} - Membre: ${r.userId})`,
            value: `${r.parkingId}|${r.userId}`,
          })),
          { name: "🔍 Saisir manuellement un Parking ID et User ID", value: "manual" },
        ],
      });

      if (choice !== "manual") {
        const parts = choice.split("|");
        parkingId = parts[0] || "";
        userId = parts[1] || "";
      }
    }
  } catch (err: any) {
    console.log("ℹ️ Pré-récupération des réservations non disponible, saisie manuelle requise.");
  }

  if (!parkingId) {
    parkingId = await input({
      message: "Saisissez l'ID du parking (ex: 539) :",
      validate: (v) => v.trim() !== "" || "Veuillez entrer un ID de parking valide",
    });
  }

  if (!userId) {
    userId = await input({
      message: "Saisissez l'ID de l'utilisateur (userId) :",
      default: "sandbox_user_demo",
    });
  }

  let accessId: number | undefined = undefined;
  try {
    const accesses = await cli.accesses.listForParking(parkingId);
    if (accesses && accesses.length > 0) {
      const selectedAccess = await select({
        message: "Sélectionnez l'accès du parking à ouvrir :",
        choices: [
          ...accesses.map((a) => ({
            name: `${a.name || 'Accès'} (ID: ${a.id}, Kind: ${a.kind || 'N/A'})`,
            value: a.id,
          })),
          { name: "Ouverture générale sans ID d'accès spécifique", value: undefined },
        ],
      });
      accessId = selectedAccess;
    }
  } catch (e: any) {
    console.log(`ℹ️ Liste des accès spécifiques non disponible (${e.message || e}), ouverture par défaut.`);
  }

  const openingReason = await select({
    message: "Motif d'ouverture :",
    choices: [
      { name: "🚗 Entrée voiture (CarEntry)", value: "CarEntry" as const },
      { name: "🚗 Sortie voiture (CarExit)", value: "CarExit" as const },
      { name: "🚶 Accès piéton (Pedestrian)", value: "Pedestrian" as const },
    ],
  });

  console.log(`\n📶 Envoi de la commande d'ouverture au parking ID: ${parkingId}...`);
  try {
    await cli.parkings.openDoor(parkingId, {
      userId,
      openingReason,
      accessId,
    });

    console.log("\n=================================================");
    console.log("🔓 ORDRE D'OUVERTURE DE PORTE ENVOYÉ AVEC SUCCÈS !");
    console.log("=================================================");
    console.log(`🅿️ Parking ID : ${parkingId}`);
    console.log(`👤 Utilisateur: ${userId}`);
    console.log(`🚪 Motif      : ${openingReason}`);
    if (accessId !== undefined) {
      console.log(`🔑 Accès ID   : ${accessId}`);
    }
    console.log("=================================================\n");
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}

export async function handleGetParkingDetails(): Promise<void> {
  const cli = await getAuthenticatedClient();
  const parkingId = await input({
    message: "Saisissez l'ID du parking (ex: 539) :",
    validate: (v) => v.trim() !== "" || "Veuillez entrer un ID de parking",
  });

  try {
    const details = await cli.parkings.get(parkingId);
    console.log(`\n=================================================`);
    console.log(`ℹ️ FICHE DU PARKING ID: ${parkingId}`);
    console.log(`=================================================`);
    console.log(JSON.stringify(details, null, 2));
    console.log(`=================================================\n`);
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}

export async function handleListParkingsInArea(): Promise<void> {
  const cli = await getAuthenticatedClient();
  const addressStr = await input({
    message: "Adresse pour rechercher les parkings à proximité :",
    default: "37 rue du Passeur de Boulogne 92130 Issy-les-Moulineaux",
  });

  const geo = await geocodeAddress(addressStr);
  const delta = 0.02;
  let pageNumber = 1;
  const pageSize = 10;
  let viewing = true;

  while (viewing) {
    console.log(`\n🔎 Recherche des parkings dans la zone (Page ${pageNumber}, ${pageSize}/page)...`);
    try {
      const res = await cli.parkings.list({
        "locationBounds.northLatitude": geo.latitude + delta,
        "locationBounds.southLatitude": geo.latitude - delta,
        "locationBounds.eastLongitude": geo.longitude + delta,
        "locationBounds.westLongitude": geo.longitude - delta,
        "pagination.pageSize": pageSize,
        "pagination.pageNumber": pageNumber,
      });

      const parkings = (res as any).results || res || [];
      const pag = (res as any).pagination || {};
      const totalPages = pag.totalPages || 1;
      const totalResults = pag.totalResults ?? parkings.length;

      console.log(`\n✨ Parkings (Page ${pageNumber}/${totalPages} - ${parkings.length} sur ${totalResults} au total) :\n`);
      parkings.forEach((p: any, index: number) => {
        console.log(`[${(pageNumber - 1) * pageSize + index + 1}] ID: ${p.id} | ${p.name || 'Parking sans nom'}`);
        if (p.address) {
          console.log(`    Adresse : ${p.address.street || ''}, ${p.address.postcode || ''} ${p.address.city || ''}`);
        }
        if (p.location) {
          console.log(`    GPS     : Lat ${p.location.latitude}, Lon ${p.location.longitude}`);
        }
        console.log("-------------------------------------------------");
      });

      const choices: Array<{ name: string; value: string }> = [];
      if (pageNumber < totalPages) {
        choices.push({ name: `➡️ Page suivante (${pageNumber + 1}/${totalPages})`, value: "next" });
      }
      if (pageNumber > 1) {
        choices.push({ name: `⬅️ Page précédente (${pageNumber - 1}/${totalPages})`, value: "prev" });
      }
      choices.push({ name: `↩️ Retour au menu principal`, value: "back" });

      const navAction = await select({
        message: "Navigation dans la liste des parkings :",
        choices,
      });

      if (navAction === "next") pageNumber++;
      else if (navAction === "prev") pageNumber--;
      else viewing = false;

    } catch (err: any) {
      console.error(formatApiError(err));
      viewing = false;
    }
  }
}
