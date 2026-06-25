package com.hiresmart.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class AiChatRequest {
    private String organizationId;
    private String question;
    /** Conversation history: [{role: "user"|"assistant", content: "..."}] */
    private List<Map<String, String>> history;
}
