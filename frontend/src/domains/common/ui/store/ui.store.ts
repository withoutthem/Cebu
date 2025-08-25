// src/domains/common/ui/ui.store.ts

import type { ReactNode } from 'react'

import { create } from 'zustand'

// 1. 스토어의 전체 상태와 액션 타입을 한 번에 정의합니다.
interface UiState {
  // Modal State
  isModalOpen: boolean
  modalContent: ReactNode | null

  // Sidebar State
  isSidebarOpen: boolean

  // Actions
  openModal: (content: ReactNode) => void
  closeModal: () => void
  toggleSidebar: () => void
}

// 2. create 함수 안에 모든 초기 상태와 액션을 정의합니다.
const useUiStore = create<UiState>((set) => ({
  // 초기 상태
  isModalOpen: false,
  modalContent: null,
  isSidebarOpen: false,

  // 액션
  openModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))

export default useUiStore
