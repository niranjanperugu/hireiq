package com.hiresmart.repository;

import com.hiresmart.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, UUID> {
    List<EmailLog> findByRecipientEmailOrderBySentAtDesc(String email);
    List<EmailLog> findAllByOrderBySentAtDesc();
}
