package com.timesheet.supervisor.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.timesheet.supervisor.entity.Supervisor;
import com.timesheet.supervisor.service.SupervisorService;

@RestController
@RequestMapping("/supervisors")
public class SupervisorController {

    @Autowired
    private SupervisorService supervisorService;

    @PostMapping
    public ResponseEntity<Supervisor> createSupervisor(@RequestBody Supervisor supervisor) {
        Supervisor createdSupervisor = supervisorService.createSupervisor(supervisor);
        return new ResponseEntity<>(createdSupervisor, HttpStatus.CREATED);
    }

    @DeleteMapping("/{supervisorId}")
    public ResponseEntity<Void> deleteSupervisor(@PathVariable String supervisorId) {
        supervisorService.deleteSupervisor(supervisorId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/{supervisorId}")
    public ResponseEntity<Supervisor> getSupervisorById(@PathVariable String supervisorId) {
        Supervisor supervisor = supervisorService.getSupervisorById(supervisorId);
        return new ResponseEntity<>(supervisor, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<List<Supervisor>> getAllSupervisors() {
        List<Supervisor> supervisors = supervisorService.getAllSupervisors();
        return new ResponseEntity<>(supervisors, HttpStatus.OK);
    }

    @GetMapping("/validate")
    public ResponseEntity<Supervisor> validateSupervisorCredentials(
            @RequestParam String emailId,
            @RequestParam String password) {
        Supervisor supervisor = supervisorService.validateSupervisorCredentials(emailId, password);
        return new ResponseEntity<>(supervisor, HttpStatus.OK);
    }

    @PutMapping("/{supervisorId}")
    public ResponseEntity<Supervisor> updateSupervisor(@PathVariable String supervisorId, @RequestBody Supervisor updatedSupervisor) {
        Supervisor supervisor = supervisorService.updateSupervisor(supervisorId, updatedSupervisor);
        return new ResponseEntity<>(supervisor, HttpStatus.OK);
    }
}
