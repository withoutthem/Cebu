// src/domains/test/services/testService.ts
import { GET, POST } from '@/shared/platform/http'

export interface LiveChatMessageDto {
  sender: string
  message: string
}

export const testService = {
  restPing: async (): Promise<string> => {
    const res = await GET<string>('/test/rest')
    return res.data
  },

  // ⬇️ HttpResponse를 UI로 올리지 않고 여기서 언래핑 → Promise<void>
  broadcast: async (roomId: string, body: LiveChatMessageDto): Promise<void> => {
    await POST<void, LiveChatMessageDto>(`/test/broadcast/${encodeURIComponent(roomId)}`, body)
  },
}
