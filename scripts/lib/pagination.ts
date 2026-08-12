import { select } from "@inquirer/prompts";

export interface NavigationChoice {
  name: string;
  value: string;
}

/** Prompt de navigation pour une liste paginée.
 *
 * Propose « page suivante » / « page précédente » selon la position dans la
 * pagination, les éventuelles actions propres à la liste (`extraChoices`),
 * puis le retour au menu. Renvoie `"next"`, `"prev"`, `"back"` ou la valeur
 * d'un choix supplémentaire.
 */
export async function promptPageNavigation(
  message: string,
  pageNumber: number,
  totalPages: number,
  extraChoices: NavigationChoice[] = [],
): Promise<string> {
  const choices: NavigationChoice[] = [];

  if (pageNumber < totalPages) {
    choices.push({
      name: `➡️ Page suivante (${pageNumber + 1}/${totalPages})`,
      value: "next",
    });
  }
  if (pageNumber > 1) {
    choices.push({
      name: `⬅️ Page précédente (${pageNumber - 1}/${totalPages})`,
      value: "prev",
    });
  }

  choices.push(...extraChoices, {
    name: `↩️ Retour au menu principal`,
    value: "back",
  });

  return select({ message, choices });
}
