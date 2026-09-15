/** POST /chat/lidMapping/{instance} · los JIDs a cruzar (LID → teléfono o teléfono → LID). */
export class LidMappingDto {
  jids: string[];
}

/** POST /group/joinRequests/{instance} · las solicitudes pendientes de un grupo. */
export class GroupJoinRequestsDto {
  groupJid: string;
}

/** POST /group/updateJoinRequests/{instance} · aprobar o rechazar solicitudes. */
export class UpdateGroupJoinRequestsDto {
  groupJid: string;
  participants: string[];
  action: 'approve' | 'reject';
}
