package com.smartbiz.survey.lead;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long> {

    @Query("""
            select l from Lead l
            where lower(l.fullName) like :q
               or lower(coalesce(l.email, '')) like :q
               or lower(coalesce(l.phone, '')) like :q
               or lower(coalesce(l.company, '')) like :q
            """)
    Page<Lead> search(@Param("q") String q, Pageable pageable);

    Optional<Lead> findFirstByEmailIgnoreCase(String email);
}
