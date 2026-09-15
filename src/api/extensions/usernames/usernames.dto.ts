export class ResolveUsernameDto {
  // El @usuario de WhatsApp, con o sin la arroba (ej. "luan.fuentes").
  username: string;
  // Opcional: el PIN/llave del usuario, si el contacto lo exige (Baileys: `withUsernameKey`).
  usernameKey?: string;
}
