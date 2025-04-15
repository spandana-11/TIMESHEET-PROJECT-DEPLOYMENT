package com.shared.idgeneration.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import com.shared.idgeneration.entity.IdGeneration;
import com.shared.idgeneration.repo.IdGenerationRepository;

import jakarta.transaction.Transactional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
public class IdGenerationService {

    @Autowired
    private IdGenerationRepository idGenerationRepository;

    private static final Pattern ID_TYPE_PATTERN = Pattern.compile("^[A-Z]{3,5}$"); // ID types should be 3 to 5 uppercase letters
    private static final Logger logger = LoggerFactory.getLogger(IdGenerationService.class);
    @Transactional
    public synchronized String generateId(String idType) {
        if (!isValidIdType(idType)) {
            throw new IllegalArgumentException("ID type must be 3 to 5 uppercase letters.");
        }

        IdGeneration idGen = idGenerationRepository.findByIdType(idType);
        if (idGen == null) {
            idGen = new IdGeneration();
            idGen.setIdType(idType);
            idGen.setLastId(0L);
            logger.debug("Creating new record for idType: {}", idType);
        } else {
            logger.debug("Existing record found for idType: {}", idGen);
        }

        try {
            long newId = idGen.getLastId() + 1;
            idGen.setLastId(newId);
            idGenerationRepository.save(idGen);
            logger.info("Generated ID: {} for idType: {}", idType + String.format("%03d", newId), idType);
            return idType + String.format("%03d", newId);
        } catch (OptimisticLockingFailureException e) {
            logger.error("Concurrency issue occurred while generating ID for idType: {}", idType, e);
            throw new RuntimeException("Concurrency issue occurred while generating ID.", e);
        }
    }


    // Method to handle missing ID type and provide a default ID type
    @Transactional
    public String generateIdWithDefaultType(String idType) {
        if (idType == null || idType.isEmpty()) {
            idType = "DEFAULT"; // Provide a default ID type if none is provided
        }

        return generateId(idType);
    }

    private boolean isValidIdType(String idType) {
        return idType != null && ID_TYPE_PATTERN.matcher(idType).matches();
    }
}
