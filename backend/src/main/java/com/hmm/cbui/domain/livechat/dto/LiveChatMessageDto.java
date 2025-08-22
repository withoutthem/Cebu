package com.hmm.cbui.domain.livechat.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LiveChatMessageDto {
    private String roomId;
    private String sender;
    private String content;
    private String timestamp;
}
