package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageableResponseDTO<T> {

    private List<T> content;

    private int pageNumber;

    private int pageSize;

    private long totalElements;

    private int totalPages;

    private boolean hasNext;

    private boolean hasPrevious;

    private boolean isFirst;

    private boolean isLast;

    public static <T> PageableResponseDTO<T> from(Page<T> page) {
        return PageableResponseDTO.<T>builder()
                .content(page.getContent())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .isFirst(page.isFirst())
                .isLast(page.isLast())
                .build();
    }
}
