import { select } from "@inquirer/prompts";
import { getAuthenticatedClient } from "../lib/auth.js";
import { formatDateFr, formatApiError } from "../lib/formatters.js";

export async function handleOvertimesManagement(): Promise<void> {
  const cli = await getAuthenticatedClient();
  let pageNumber = 1;
  let pageSize = 10;
  let viewing = true;

  while (viewing) {
    console.log(
      `\n⏱️ Récupération des dépassements de durée (Page ${pageNumber}, ${pageSize}/page)...`,
    );

    try {
      const listRes = await cli.overtimes.list({
        "pagination.pageSize": pageSize,
        "pagination.pageNumber": pageNumber,
      });
      const overtimes = (listRes as any).results || [];
      const pag = (listRes as any).pagination || {};
      const totalPages = pag.totalPages || 1;
      const totalResults = pag.totalResults ?? overtimes.length;

      if (overtimes.length === 0) {
        console.log("ℹ️ Aucun dépassement de durée (overtime) enregistré.");
        return;
      }

      console.log(
        `\n✨ Dépassements (Page ${pageNumber}/${totalPages} - ${overtimes.length} sur ${totalResults} au total) :\n`,
      );
      overtimes.forEach((o: any, i: number) => {
        console.log(
          `[${(pageNumber - 1) * pageSize + i + 1}] ID Overtime : ${o.id || "N/A"}`,
        );
        console.log(`    Parking ID  : ${o.parkingId}`);
        console.log(`    Membre      : ${o.userId}`);
        console.log(
          `    Période     : du ${formatDateFr(o.beginDate)} au ${formatDateFr(o.endDate)}`,
        );
        if (o.amount !== undefined)
          console.log(`    Surcoût     : ${o.amount} €`);
        console.log("-------------------------------------------------");
      });

      const choices: Array<{ name: string; value: string }> = [];
      if (pageNumber < totalPages)
        choices.push({
          name: `➡️ Page suivante (${pageNumber + 1}/${totalPages})`,
          value: "next",
        });
      if (pageNumber > 1)
        choices.push({
          name: `⬅️ Page précédente (${pageNumber - 1}/${totalPages})`,
          value: "prev",
        });
      choices.push(
        { name: `🔍 Voir le détail d'un dépassement`, value: "detail" },
        { name: `↩️ Retour au menu principal`, value: "back" },
      );

      const navAction = await select({
        message: "Navigation dépassements :",
        choices,
      });

      if (navAction === "next") pageNumber++;
      else if (navAction === "prev") pageNumber--;
      else if (navAction === "detail") {
        const selectedId: string = await select({
          message: "Sélectionnez le dépassement :",
          choices: overtimes.map((o: any) => ({
            name: `Overtime ${o.id || o.parkingId}`,
            value: String(o.id),
          })),
        });
        const details = await cli.overtimes.get(selectedId);
        console.log("\n", JSON.stringify(details, null, 2));
      } else {
        viewing = false;
      }
    } catch (err: any) {
      console.error(formatApiError(err));
      viewing = false;
    }
  }
}
