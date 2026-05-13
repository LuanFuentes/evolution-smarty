export class PinMessageKey {
  id: string;
  remoteJid: string;
  fromMe: boolean;
}

export class PinMessageDto {
  key: PinMessageKey;
  type: 1 | 2;
  time?: number;
}
