# @tomaks28/yespark-ts-sdk

Fetch-based TypeScript SDK for the **Yespark Group Partner API** (Zenpark).

- Typed against the official OpenAPI spec (`api.json`) — types are generated, so
  they stay in sync with the contract.
- Zero runtime dependencies — uses the native `fetch` (Node ≥ 18).
- A configurable **singleton** for sharing one client across a project, plus the
  `YesparkClient` class for anyone needing multiple instances.
- Bearer-token **or** email/password auth (with lazy login + auto re-auth on 401).

## Install

```bash
npm install @tomaks28/yespark-ts-sdk
```

## Quick start (singleton)

Configure once at startup, then import `yespark` anywhere.

```ts
// setup.ts — run once
import { configure } from "@tomaks28/yespark-ts-sdk";

configure({
  environment: "production", // or "sandbox"
  credentials: { email: "partner@example.com", password: "•••" },
  // or: token: "a-static-bearer-token-from-yespark"
});
```

```ts
// anywhere.ts
import { yespark } from "@tomaks28/yespark-ts-sdk";

const members = await yespark.members.list({ "pagination.pageNumber": 1 });
const parking = await yespark.parkings.get("p_123");
```

`getClient()` returns the same underlying instance if you prefer an explicit
reference; both throw `YesparkConfigError` if `configure()` hasn't run yet.

## Standalone instances

```ts
import { YesparkClient } from "@tomaks28/yespark-ts-sdk";

const client = new YesparkClient({
  environment: "sandbox",
  token: "•••",
});
```

## Terminal CLI Interactive (Console interactive avec Prompts)

Un menu interactif riche (basé sur `@inquirer/prompts`) est désormais intégré pour gérer l'ensemble des opérations en ligne de commande :

- 🎟️ **Gestion des Réservations** :
  - `Réserver une place` (`search.space` + `reservations.reserve`)
  - `Lister mes réservations` (`reservations.list`)
  - `Consulter les détails d'une réservation` (`reservations.get`)
  - `Prolonger une réservation` (`reservations.extensionInfo` + `reservations.extend`)
  - `Annuler une réservation` (`reservations.cancellationInfo` + `reservations.cancel`)
- 🅿️ **Parkings & Accès** :
  - `Ouvrir la porte d'un parking` (`accesses.listForParking` + `parkings.openDoor`)
  - `Consulter la fiche détaillée d'un parking` (`parkings.get`)
  - `Lister les parkings par zone GPS` (`parkings.list`)
- 👥 **Gestion complète des Membres** :
  - `Lister`, `Consulter`, `Créer`, `Modifier` et `Supprimer` des membres (`members.list`, `get`, `create`, `update`, `delete`)
- ⏱️ **Dépassements & Surcoûts** :
  - `Lister et consulter les dépassements de durée (Overtimes)` (`overtimes.list`, `get`)
- ⚙️ **Changer d'environnement / Identifiants**

### Lancer la console interactive

```bash
# Lancement interactif (vous serez guidé à l'écran) :
npm run reserve

# Ou pré-remplir les identifiants pour éviter de les resaisir dans les prompts :
npm run reserve -- --email partner@example.com --password 'votre_mot_de_passe'
```

### Mode automatique direct (Non-interactif)

Pour des scripts automatisés ou une réservation directe sans interaction :

```bash
npm run reserve -- --email partner@example.com --password 'votre_mot_de_passe' --non-interactive
```

### Paramètres et options CLI

| Option | Description | Valeur par défaut |
| ------ | ----------- | ----------------- |
| `--address "<adresse>"` | Adresse ciblée | `"37 rue du Passeur de Boulogne 92130 Issy-les-Moulineaux"` |
| `--email "<email>"` | Email du compte Yespark | Variable `YESPARK_EMAIL` |
| `--password "<pass>"` | Mot de passe Yespark | Variable `YESPARK_PASSWORD` |
| `--token "<token>"` | Token Bearer statique | Variable `YESPARK_TOKEN` |
| `--env "<sandbox\|production>"` | Environnement API | `"sandbox"` |
| `--hours <nombre>` | Durée en heures | `2` |
| `--plate "<immatriculation>"` | Plaque d'immatriculation | `"AA-123-BB"` |
| `--user-id "<userId>"` | ID de membre unique | Auto-généré |
| `--non-interactive` | Exécution directe sans menu interactif | `false` |

## Configuration

| Option           | Type                              | Default        |
| ---------------- | --------------------------------- | -------------- |
| `environment`    | `"production" \| "sandbox"`       | `"production"` |
| `baseUrl`        | `string` (overrides environment)  | —              |
| `token`          | `string` (static Bearer token)    | —              |
| `credentials`    | `{ email, password }`             | —              |
| `timeoutMs`      | `number`                          | `30000`        |
| `fetch`          | `typeof fetch` (custom/injected)  | global `fetch` |
| `defaultHeaders` | `Record<string, string>`          | `{}`           |

Provide **either** `token` (used directly) **or** `credentials` (client logs in
lazily, caches the access token, and re-authenticates automatically on a 401).

## Resources

| Group                    | Methods                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `yespark.auth`           | `login`                                                                             |
| `yespark.members`        | `list`, `get`, `create`, `update`, `delete`                                         |
| `yespark.parkings`       | `list`, `get`, `openDoor`                                                           |
| `yespark.reservations`   | `list`, `get`, `reserve`, `cancel`, `cancellationInfo`, `extend`, `extensionInfo`  |
| `yespark.overtimes`      | `list`, `get`                                                                       |
| `yespark.accesses`       | `listForParking`                                                                    |
| `yespark.search`         | `space`                                                                             |

Every method returns a typed promise. Query parameters keep the API's
dot-notation keys (e.g. `"pagination.pageNumber"`, `"locationBounds.northLatitude"`).

```ts
const spaces = await yespark.parkings.list({
  "locationBounds.northLatitude": 48.87,
  "locationBounds.southLatitude": 48.85,
  "locationBounds.eastLongitude": 2.35,
  "locationBounds.westLongitude": 2.33,
  "pagination.pageSize": 20,
});

const reservation = await yespark.reservations.reserve({ /* ReservationRequestModel */ });
await yespark.reservations.extend(reservation.number!, "2026-08-01T10:00:00");
```

## Error handling

Non-2xx responses throw a `YesparkApiError`:

```ts
import { YesparkApiError } from "@tomaks28/yespark-ts-sdk";

try {
  await yespark.members.get("unknown");
} catch (err) {
  if (err instanceof YesparkApiError) {
    console.error(err.status, err.errorCode, err.message, err.body);
  }
}
```

## Escape hatch

For anything not yet wrapped, call the raw request pipeline (still typed via the
generic and still authenticated):

```ts
const data = await getClient().request<MyType>({
  method: "GET",
  path: "/api/partner/some/{id}",
  pathParams: { id: "42" },
  query: { foo: "bar" },
});
```

## Types

All schema types are re-exported from the package root, e.g.:

```ts
import type {
  MemberDetailsResponseModel,
  ParkingDetailResponseModel,
  ReservationRequestModel,
  Schemas, // Schemas["<AnyModelName>"]
} from "@tomaks28/yespark-ts-sdk";
```

## Development

```bash
npm install
npm run generate   # regenerate src/generated/schema.ts from api.json
npm run build      # clean + generate + tsc -> dist/ (js, d.ts, and *.map files)
npm run typecheck  # type-check without emitting
```

When the API spec changes, drop the new `api.json` at the repo root and run
`npm run build` — the types regenerate automatically.
