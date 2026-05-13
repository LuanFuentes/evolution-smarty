export class StarMessageKey {
  id: string;
  remoteJid: string;
  fromMe: boolean;
}

export class StarMessageDto {
  key: StarMessageKey;
  star: boolean;
}
