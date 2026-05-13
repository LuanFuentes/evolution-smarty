export interface ChatLabelEntry {
  chatId: string;
  labelIds: string[];
}

export interface GetChatLabelsResponse {
  success: true;
  chats: ChatLabelEntry[];
}
