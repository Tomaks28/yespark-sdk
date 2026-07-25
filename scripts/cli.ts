import { select } from "@inquirer/prompts";
import { parseArgs, printHelp } from "./lib/args.js";
import {
  globalConfig,
  resetClientInstance,
  getAuthenticatedClient,
} from "./lib/auth.js";
import {
  handleReserveParking,
  handleListReservations,
  handleGetReservationDetail,
  handleExtendReservation,
  handleCancelReservation,
} from "./modules/reservations.js";
import {
  handleOpenDoor,
  handleGetParkingDetails,
  handleListParkingsInArea,
} from "./modules/parkings.js";
import { handleMemberManagement } from "./modules/members.js";
import { handleOvertimesManagement } from "./modules/overtimes.js";

async function runInteractiveLoop(args: Record<string, string>): Promise<void> {
  console.clear();
  console.log("=================================================");
  console.log("🅿️  CONSOLE INTERACTIVE EXHAUSTIVE YESPARK (SANDBOX)");
  console.log("=================================================");

  let running = true;
  while (running) {
    const action = await select({
      message: "\nChoisissez une catégorie ou une opération :",
      choices: [
        {
          name: "🎟️  [Réservation] Réserver une place (Issy-les-Moulineaux / Autre)",
          value: "reserve",
        },
        {
          name: "📋 [Réservation] Lister mes réservations (Par membre, Adresse & Nom)",
          value: "list_res",
        },
        {
          name: "🔍 [Réservation] Consulter les détails d'une réservation",
          value: "get_res",
        },
        {
          name: "⏳ [Réservation] Prolonger une réservation",
          value: "extend_res",
        },
        {
          name: "❌ [Réservation] Annuler une réservation",
          value: "cancel_res",
        },
        {
          name: "🚪 [Parking/Accès] Ouvrir la porte d'un parking",
          value: "opendoor",
        },
        {
          name: "ℹ️  [Parking/Accès] Consulter la fiche d'un parking",
          value: "get_parking",
        },
        {
          name: "🔎 [Parking/Accès] Lister les parkings par zone GPS (Pagination)",
          value: "list_parkings",
        },
        {
          name: "👥 [Membres] Gestion des membres (Lister avec pagination, Créer, Modifier, Supprimer)",
          value: "members",
        },
        {
          name: "⏱️  [Dépassements] Lister les dépassements de durée (Overtimes & Pagination)",
          value: "overtimes",
        },
        {
          name: "⚙️  [Config] Changer d'environnement / identifiants",
          value: "reauth",
        },
        { name: "🚪 Quitter", value: "quit" },
      ],
    });

    switch (action) {
      case "reserve":
        await handleReserveParking(args, true);
        break;
      case "list_res":
        await handleListReservations();
        break;
      case "get_res":
        await handleGetReservationDetail();
        break;
      case "extend_res":
        await handleExtendReservation();
        break;
      case "cancel_res":
        await handleCancelReservation();
        break;
      case "opendoor":
        await handleOpenDoor();
        break;
      case "get_parking":
        await handleGetParkingDetails();
        break;
      case "list_parkings":
        await handleListParkingsInArea();
        break;
      case "members":
        await handleMemberManagement();
        break;
      case "overtimes":
        await handleOvertimesManagement();
        break;
      case "reauth":
        resetClientInstance();
        await getAuthenticatedClient();
        break;
      case "quit":
        console.log("\n👋 Au revoir et à bientôt !");
        running = false;
        break;
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.token) globalConfig.token = args.token;
  if (args.email) globalConfig.email = args.email;
  if (args.password) globalConfig.password = args.password;
  if (args.env) globalConfig.environment = args.env as "sandbox" | "production";

  const isNonInteractive = args["non-interactive"] === "true";

  if (isNonInteractive) {
    await handleReserveParking(args, false);
  } else {
    await runInteractiveLoop(args);
  }
}

main().catch((err) => {
  console.error("❌ Une erreur est survenue :", err);
  process.exit(1);
});
