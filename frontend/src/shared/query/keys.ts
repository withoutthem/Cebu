// src/shared/query/keys.ts
export const qk = {
  me: () => ['me'] as const,
  users: () => ['users'] as const,
  user: (id: string) => ['users', 'byId', id] as const,

  chat: {
    rooms: () => ['chat', 'rooms'] as const,
    room: (roomId: string) => ['chat', 'room', roomId] as const,
    roomMessages: (roomId: string) => ['chat', 'room', roomId, 'messages'] as const,
  },

  test: {
    restPing: () => ['test', 'rest', 'ping'] as const,
    broadcast: (roomId: string) => ['test', 'broadcast', roomId] as const,
  },

  testData: (id: string) => ['testData', id] as const,
} as const
