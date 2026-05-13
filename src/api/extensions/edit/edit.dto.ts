export class EditMessageKey {
  id: string;
  remoteJid: string;
  fromMe: boolean;
}

export class EditMessageDto {
  key: EditMessageKey;
  text: string;
}
