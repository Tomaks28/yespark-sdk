/** Geocode address using French Government BAN API */
export async function geocodeAddress(
  addressStr: string,
): Promise<{ latitude: number; longitude: number; label: string }> {
  console.log(`\n🔍 Géocodage de l'adresse : "${addressStr}"...`);
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressStr)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Erreur lors du géocodage de l'adresse (HTTP ${res.status})`,
    );
  }
  const data: any = await res.json();
  if (!data.features || data.features.length === 0) {
    throw new Error(`Aucune coordonnée trouvée pour l'adresse : ${addressStr}`);
  }
  const [longitude, latitude] = data.features[0].geometry.coordinates;
  const label = data.features[0].properties.label;
  console.log(`📍 Adresse validée : ${label}`);
  console.log(`   Coordonnées GPS : Lat ${latitude}, Lon ${longitude}`);
  return { latitude, longitude, label };
}
