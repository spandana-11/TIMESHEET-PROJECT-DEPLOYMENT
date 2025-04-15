package com.timesheet.supervisor.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.timesheet.supervisor.entity.Supervisor;
import com.timesheet.supervisor.exceptions.InvalidCredentialsException;
import com.timesheet.supervisor.exceptions.SupervisorNotFoundException;
import com.timesheet.supervisor.repo.SupervisorRepository;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SupervisorService {

    @Autowired
    private SupervisorRepository supervisorRepository;

    @Autowired
    private RestTemplate restTemplate;

    private static final String ID_GENERATION_SERVICE_URL = "http://localhost:9090/api/id-generation/generate-supervisor-id";

    public Supervisor createSupervisor(Supervisor supervisor) {
        validateSupervisorFields(supervisor);
        checkForDuplicateEntries(supervisor);

        if (supervisor.getSupervisorId() == null || supervisor.getSupervisorId().isEmpty()) {
            supervisor.setSupervisorId(restTemplate.getForObject(ID_GENERATION_SERVICE_URL, String.class));
        }
     // Encode the password before saving
        if (supervisor.getPassword() != null && !supervisor.getPassword().isEmpty()) {
            BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
            supervisor.setPassword(passwordEncoder.encode(supervisor.getPassword()));
        }
        return supervisorRepository.save(supervisor);
    }

    public Supervisor updateSupervisor(String supervisorId, Supervisor updatedSupervisor) {
        Supervisor existingSupervisor = supervisorRepository.findById(supervisorId)
                .orElseThrow(() -> new SupervisorNotFoundException("Supervisor not found with ID: " + supervisorId));

        validateSupervisorFields(updatedSupervisor);
        validateSupervisorUpdate(updatedSupervisor, existingSupervisor);

        // Update fields
        existingSupervisor.setFirstName(updatedSupervisor.getFirstName());
        existingSupervisor.setLastName(updatedSupervisor.getLastName());
        existingSupervisor.setAddress(updatedSupervisor.getAddress());
        existingSupervisor.setMobileNumber(updatedSupervisor.getMobileNumber());
        existingSupervisor.setEmailId(updatedSupervisor.getEmailId());
        existingSupervisor.setAadharNumber(updatedSupervisor.getAadharNumber());
        existingSupervisor.setPanNumber(updatedSupervisor.getPanNumber());
     // Encode the password before updating
        if (updatedSupervisor.getPassword() != null && !updatedSupervisor.getPassword().isEmpty()) {
            BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
            existingSupervisor.setPassword(passwordEncoder.encode(updatedSupervisor.getPassword()));
        }
        existingSupervisor.setProjects(updatedSupervisor.getProjects());

        return supervisorRepository.save(existingSupervisor);
    }

    public Supervisor getSupervisorById(String supervisorId) {
        return supervisorRepository.findById(supervisorId)
                .orElseThrow(() -> new SupervisorNotFoundException("Supervisor not found with ID: " + supervisorId));
    }

    public void deleteSupervisor(String supervisorId) {
        Supervisor supervisor = supervisorRepository.findById(supervisorId)
                .orElseThrow(() -> new SupervisorNotFoundException("Supervisor not found with ID: " + supervisorId));
        supervisorRepository.delete(supervisor);
    }

    public List<Supervisor> getAllSupervisors() {
        return supervisorRepository.findAll();
    }

    
    public Supervisor validateSupervisorCredentials(String emailId, String rawPassword) {
        Supervisor supervisor = supervisorRepository.findSupervisorByEmailId(emailId);
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        // If email does not exist, check if the password exists for any supervisor
        if (supervisor == null) {
            List<Supervisor> allSupervisors = supervisorRepository.findAll(); // Fetch all supervisors

            boolean passwordExists = allSupervisors.stream()
                    .anyMatch(sup -> passwordEncoder.matches(rawPassword, sup.getPassword()));

            if (!passwordExists) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Both email ID and password are incorrect.");
            } else {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Email ID does not exist.");
            }
        }

        // If email exists but password is incorrect
        if (!passwordEncoder.matches(rawPassword, supervisor.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password.");
        }

        return supervisor; // Return validated Supervisor entity
    }


    private void validateSupervisorFields(Supervisor supervisor) {
        List<String> errors = new ArrayList<>();

        // Validate mobile number
        if (supervisor.getMobileNumber() != null && !supervisor.getMobileNumber().toString().matches("\\d{10}")) {
            errors.add("Mobile number must be exactly 10 digits.");
        }

        // Validate Aadhar number
        if (supervisor.getAadharNumber() != null && !supervisor.getAadharNumber().toString().matches("\\d{12}")) {
            errors.add("Aadhar number must be exactly 12 digits.");
        }

        // Validate PAN number format
        if (supervisor.getPanNumber() != null && !supervisor.getPanNumber().matches("[A-Z]{5}[0-9]{4}[A-Z]{1}")) {
            errors.add("PAN number must have the format ABCDE1234F.");
        }

        // Validate password requirements
        if (supervisor.getPassword() != null) {
            List<String> passwordErrors = validatePassword(supervisor.getPassword());
            errors.addAll(passwordErrors);
        }

        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join(", ", errors));
        }
    }

    private List<String> validatePassword(String password) {
        List<String> errors = new ArrayList<>();
        if (password.length() < 8) {
            errors.add("Password must be at least 8 characters long.");
        }
        if (!Pattern.compile("[A-Z]").matcher(password).find()) {
            errors.add("Password must contain at least one uppercase letter.");
        }
        if (!Pattern.compile("[a-z]").matcher(password).find()) {
            errors.add("Password must contain at least one lowercase letter.");
        }
        if (!Pattern.compile("\\d").matcher(password).find()) {
            errors.add("Password must contain at least one digit.");
        }
        if (!Pattern.compile("[!@#$^*()_+\\-=\\[\\]{}|;':\",.<>]").matcher(password).find()) {
	        errors.add("Password must contain at least one special character.");
	    }
        if (Pattern.compile("[%&=/<>?]").matcher(password).find()) {
            errors.add("Password must not contain reserved characters (% & = / < > ?).");
        }
        return errors;
    }

    private void checkForDuplicateEntries(Supervisor supervisor) {
        if (supervisorRepository.findByEmailId(supervisor.getEmailId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address already in use.");
        }
        if (supervisorRepository.findByMobileNumber(supervisor.getMobileNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mobile number already in use.");
        }
        if (supervisorRepository.findByAadharNumber(supervisor.getAadharNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aadhar number already in use.");
        }
        if (supervisorRepository.findByPanNumber(supervisor.getPanNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PAN number already in use.");
        }
    }

    private void validateSupervisorUpdate(Supervisor updatedSupervisor, Supervisor existingSupervisor) {
        List<String> errors = new ArrayList<>();

        if (!updatedSupervisor.getEmailId().equals(existingSupervisor.getEmailId()) &&
            supervisorRepository.findByEmailId(updatedSupervisor.getEmailId()).isPresent()) {
            errors.add("Email address already in use.");
        }

        if (!updatedSupervisor.getMobileNumber().equals(existingSupervisor.getMobileNumber()) &&
            supervisorRepository.findByMobileNumber(updatedSupervisor.getMobileNumber()).isPresent()) {
            errors.add("Mobile number already in use.");
        }

        if (!updatedSupervisor.getAadharNumber().equals(existingSupervisor.getAadharNumber()) &&
            supervisorRepository.findByAadharNumber(updatedSupervisor.getAadharNumber()).isPresent()) {
            errors.add("Aadhar number already in use.");
        }

        if (!updatedSupervisor.getPanNumber().equals(existingSupervisor.getPanNumber()) &&
            supervisorRepository.findByPanNumber(updatedSupervisor.getPanNumber()).isPresent()) {
            errors.add("PAN number already in use.");
        }

        if (updatedSupervisor.getPassword() != null) {
            List<String> passwordErrors = validatePassword(updatedSupervisor.getPassword());
            errors.addAll(passwordErrors);
        }

        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join(", ", errors));
        }
    }
}

