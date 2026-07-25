import { YesparkApiError } from "../../src/errors.js";

/** Format date to French locale string (ex: "25/07/2026 à 11h36") */
export function formatDateFr(
  dateStrOrObj: string | Date | null | undefined,
): string {
  if (!dateStrOrObj) return "N/A";
  const d =
    typeof dateStrOrObj === "string" ? new Date(dateStrOrObj) : dateStrOrObj;
  if (Number.isNaN(d.getTime())) return String(dateStrOrObj);

  const formattedStr = d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formattedStr.replace(":", "h");
}

/** Format API errors into clear, human-readable French messages */
export function formatApiError(err: unknown): string {
  if (err instanceof YesparkApiError) {
    const status = err.status;
    const body = (err.body as Record<string, any>) || {};
    const errorCode = err.errorCode || body.errorCode || body.code || "N/A";
    const detailMsg = body.message || err.message;

    let explanation = "";

    switch (errorCode) {
      case "RESERVATION_REQUIRED":
        explanation =
          "⚠️ RÉSERVATION OBLIGATOIRE : Aucune réservation n'est active à la minute présente pour cet utilisateur dans ce parking.";
        break;
      case "PARKING_NOT_FOUND":
        explanation =
          "⚠️ PARKING INTROUVABLE : L'ID de parking spécifié n'existe pas ou n'est pas reconnu par le service d'accès.";
        break;
      case "USER_NOT_FOUND":
        explanation =
          "⚠️ MEMBRE INTROUVABLE : L'ID utilisateur (userId) n'a pas été enregistré via la création de membres de votre compte.";
        break;
      case "INVALID_OPEN_REASON":
        explanation =
          "⚠️ MOTIF D'OUVERTURE INVALIDE : Le motif choisi (Entrée, Sortie, Piéton) n'est pas supporté par cette porte.";
        break;
      case "LOCKEDUP_ACCOUNT":
        explanation =
          "⚠️ COMPTE BLOQUÉ : Le compte utilisateur ou partenaire est temporairement suspendu.";
        break;
      case "NOT_AUTHORIZED":
        explanation =
          "⚠️ ACCÈS NON AUTORISÉ : Vous ne disposez pas des permissions nécessaires pour cette ressource.";
        break;
    }

    if (!explanation) {
      switch (status) {
        case 400:
          explanation =
            "⚠️ REQUÊTE INVALIDE (HTTP 400) : Paramètres manquants ou mal formatés.";
          break;
        case 401:
          explanation =
            "🔒 NON AUTORISÉ (HTTP 401) : Token Bearer ou identifiants (email/mot de passe) incorrects.";
          break;
        case 403:
          explanation =
            "🚫 ACCÈS INTERDIT (HTTP 403) : Action refusée par le serveur Yespark.";
          break;
        case 404:
          explanation =
            "🔍 RESSOURCE NON TROUVÉE (HTTP 404) : La ressource n'existe pas ou n'est pas disponible sur le serveur.";
          break;
        case 409:
          explanation =
            "⚔️ CONFLIT (HTTP 409) : La ressource existe déjà ou un conflit de créneau est survenu.";
          break;
        case 500:
        case 502:
        case 503:
          explanation =
            "🔥 ERREUR SERVEUR (HTTP 50x) : Problème temporaire sur les serveurs Yespark / Zenpark.";
          break;
        default:
          explanation = `❌ ERREUR API YESPARK (HTTP ${status})`;
      }
    }

    let output =
      `\n${explanation}\n` +
      `  │ • Statut HTTP      : ${status}\n` +
      `  │ • Code Erreur API  : ${errorCode}\n` +
      `  │ • Message Serveur  : ${detailMsg}`;

    if (Object.keys(body).length > 0 && body.message !== detailMsg) {
      output += `\n  │ • Détails JSON     : ${JSON.stringify(body)}`;
    }

    return output;
  }

  if (err instanceof Error) {
    return `❌ Erreur : ${err.message}`;
  }

  let errStr = "Erreur inconnue";
  if (typeof err === "string") {
    errStr = err;
  } else if (err !== null && typeof err === "object") {
    try {
      errStr = JSON.stringify(err);
    } catch {
      errStr = "Erreur Objet non sérialisable";
    }
  } else if (err !== undefined) {
    errStr = String(err);
  }

  return `❌ Erreur inattendue : ${errStr}`;
}
