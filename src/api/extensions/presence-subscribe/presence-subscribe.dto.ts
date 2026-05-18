export class PresenceSubscribeDto {
  // JID exacto del contacto (preferido — necesario para privacy mode @lid).
  // Si viene y matchea el formato, se usa tal cual sin resolver `number`.
  jid?: string;
  // Fallback: número a resolver vía whatsappNumber (devuelve @s.whatsapp.net,
  // JID equivocado para contactos en modo @lid — por eso `jid` es preferido).
  number?: string;
}
