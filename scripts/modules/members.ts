import { select, input, confirm } from "@inquirer/prompts";
import { getAuthenticatedClient } from "../lib/auth.js";
import { formatApiError } from "../lib/formatters.js";
import { promptPageNavigation } from "../lib/pagination.js";
import type { YesparkClient } from "../../src/index.js";

async function handleListMembers(cli: YesparkClient): Promise<void> {
  let pageNumber = 1;
  const pageSize = 10;
  let viewing = true;

  while (viewing) {
    const response = await cli.members.list({
      "pagination.pageSize": pageSize,
      "pagination.pageNumber": pageNumber,
    });
    const members = response.results || [];
    const pag = response.pagination || {};
    const totalPages = pag.totalPages || 1;
    const totalResults = pag.totalResults ?? members.length;

    console.log(
      `\n✨ Membres (Page ${pageNumber}/${totalPages} - ${members.length} sur ${totalResults} au total) :\n`,
    );
    members.forEach((m, i) => {
      console.log(
        `[${(pageNumber - 1) * pageSize + i + 1}] ID: ${m.userId} | ${m.firstName || ""} ${m.lastName || ""} (${m.email || "Pas d'email"})`,
      );
    });

    const navAction = await promptPageNavigation(
      "Navigation membres :",
      pageNumber,
      totalPages,
    );
    if (navAction === "next") pageNumber++;
    else if (navAction === "prev") pageNumber--;
    else viewing = false;
  }
}

async function handleCreateMember(cli: YesparkClient): Promise<void> {
  const userId = await input({
    message: "Nouvel ID Utilisateur (userId) :",
    default: `user_${Date.now()}`,
  });
  const firstName = await input({ message: "Prénom :", default: "Jean" });
  const lastName = await input({ message: "Nom :", default: "Dupont" });
  const email = await input({
    message: "Email :",
    default: `user_${Date.now()}@example.com`,
  });
  const plate = await input({
    message: "Plaque d'immatriculation :",
    default: "AA-123-BB",
  });

  const created = await cli.members.create({
    userId,
    firstName,
    lastName,
    email,
    registrationPlates: [{ plateNumber: plate }],
  });
  console.log(
    `\n✅ Membre créé avec succès !`,
    JSON.stringify(created, null, 2),
  );
}

async function handleUpdateMember(cli: YesparkClient): Promise<void> {
  const userId = await input({
    message: "ID de l'utilisateur à modifier :",
  });
  const firstName = await input({ message: "Nouveau prénom :" });
  const lastName = await input({ message: "Nouveau nom :" });

  const updated = await cli.members.update(userId, {
    firstName,
    lastName,
  });
  console.log(`\n✅ Membre mis à jour !`, JSON.stringify(updated, null, 2));
}

async function handleDeleteMember(cli: YesparkClient): Promise<void> {
  const userId = await input({
    message: "ID de l'utilisateur à supprimer :",
  });
  const confirmDel = await confirm({
    message: `Confirmer la suppression irréversible du membre ${userId} ?`,
    default: false,
  });
  if (confirmDel) {
    await cli.members.delete(userId);
    console.log(`\n🗑️ Membre ${userId} supprimé avec succès.`);
  }
}

export async function handleMemberManagement(): Promise<void> {
  const cli = await getAuthenticatedClient();
  const action = await select({
    message: "Gestion des membres - Choisissez une action :",
    choices: [
      { name: "📋 Lister tous les membres", value: "list" },
      { name: "🔍 Consulter la fiche d'un membre", value: "get" },
      { name: "➕ Créer un nouveau membre", value: "create" },
      { name: "✏️  Modifier un membre", value: "update" },
      { name: "🗑️  Supprimer un membre", value: "delete" },
    ],
  });

  try {
    switch (action) {
      case "list":
        await handleListMembers(cli);
        break;
      case "get": {
        const uId = await input({
          message: "Saisissez l'ID de l'utilisateur (userId) :",
        });
        const member = await cli.members.get(uId);
        console.log("\n", JSON.stringify(member, null, 2));
        break;
      }
      case "create":
        await handleCreateMember(cli);
        break;
      case "update":
        await handleUpdateMember(cli);
        break;
      case "delete":
        await handleDeleteMember(cli);
        break;
    }
  } catch (err: any) {
    console.error(formatApiError(err));
  }
}
