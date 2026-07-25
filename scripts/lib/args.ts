export function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--help" || arg === "-h") {
      params.help = "true";
    } else if (arg === "--interactive" || arg === "-i") {
      params.interactive = "true";
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        params[key] = next;
        i++;
      } else {
        params[key] = "true";
      }
    }
  }
  return params;
}

export function printHelp(): void {
  console.log(`
🚗 Console Interactive & CLI Yespark (Mode Sandbox / Production)

USAGE:
  npm run reserve                        Lancer le menu interactif (prompts avec pagination et filtres)
  npm run reserve -- --non-interactive  Lancer une réservation automatique rapide

OPTIONS CLI:
  --address "<adresse>"    Adresse cible (Défaut: "37 rue du Passeur de Boulogne 92130 Issy-les-Moulineaux")
  --token "<token>"        Token d'API Bearer Yespark (ou env YESPARK_TOKEN)
  --email "<email>"        Email de connexion Yespark (ou env YESPARK_EMAIL)
  --password "<pass>"      Mot de passe Yespark (ou env YESPARK_PASSWORD)
  --env "<prod|sandbox>"   Environnement Yespark (Défaut: "sandbox")
  --start "<ISO_DATE>"     Date de début ISO
  --hours <nombre>         Durée en heures (Défaut: 2)
  --plate "<immat>"        Plaque d'immatriculation (Défaut: "AA-123-BB")
  --user-id "<userId>"     ID utilisateur du membre
  --help, -h               Afficher cet aide-mémoire
`);
}
