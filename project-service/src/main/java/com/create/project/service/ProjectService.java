package com.create.project.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.create.project.client.EmployeeClient;
import com.create.project.client.SupervisorClient;
import com.create.project.entity.Project;
import com.create.project.entity.ProjectResponse;
import com.create.project.entity.Supervisor;
import com.create.project.entity.SupervisorResponse;
import com.create.project.exceptions.EmployeeNotFoundException;
import com.create.project.exceptions.InvalidRequestException;
import com.create.project.exceptions.ProjectNotFoundException;
import com.create.project.exceptions.ResourceNotFoundException;
import com.create.project.entity.ArchiveProject;
import com.create.project.entity.Employee;
import com.create.project.entity.EmployeeResponse;
import com.create.project.repo.ArchiveProjectRepository;
import com.create.project.repo.EmployeeRepository;
import com.create.project.repo.ProjectRepository;
import com.create.project.repo.SupervisorRepository;

import feign.FeignException;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional
public class ProjectService {

 private static final Logger logger = LoggerFactory.getLogger(ProjectService.class);
	 
    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private EmployeeClient employeeClient;

    @Autowired
    private SupervisorClient supervisorClient;

    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private SupervisorRepository supervisorRepository;
    
    @Autowired
    private ArchiveProjectRepository archiveProjectRepository;

    @Autowired
    private ModelMapper modelMapper;
    
   private static final String ID_GENERATION_SERVICE_URL = "http://id-generation-service:9090/api/id-generation/generate-supervisor-id";
    private static final String PROJECT_ID_GENERATION_URL = "http://id-generation-service:9090/api/id-generation/generate-project-id";

    
    public ProjectResponse createProject(Project project) {
        Set<String> uniqueErrors = new LinkedHashSet<>();

        // Validate employee and supervisor IDs
        try {
            validateEmployeeIds(project.getEmployeeTeamMembers());
        } catch (EmployeeNotFoundException e) {
            uniqueErrors.add(e.getMessage());
        }

        try {
            validateSupervisorIds(project.getSupervisorTeamMembers());
        } catch (EmployeeNotFoundException | ProjectNotFoundException e) {
            uniqueErrors.add(e.getMessage());
        }

        if (!uniqueErrors.isEmpty()) {
            throw new InvalidRequestException(String.join(" and ", uniqueErrors));
        }

        try {
            // Generate and assign project ID if not provided
            if (project.getProjectId() == null || project.getProjectId().isEmpty()) {
                project.setProjectId(generateUniqueProjectId());
            }

            String projectId = project.getProjectId();

            if (projectIdExists(projectId)) {
                uniqueErrors.add("Project already exists: " + projectId);
                throw new InvalidRequestException(String.join(" and ", uniqueErrors));
            }

            List<EmployeeResponse> employeeResponses = handleEmployeeTeamMembers(project);
            List<SupervisorResponse> supervisorResponses = handleSupervisorTeamMembers(project);

            project.setSupervisorTeamMembers(supervisorResponses.stream()
                .map(SupervisorResponse::getSupervisorId)
                .collect(Collectors.toList()));

            projectRepository.save(project);

            return buildProjectResponse(project, employeeResponses, supervisorResponses);

        } catch (FeignException.NotFound e) {
            uniqueErrors.add("Employee not found with ID: " + extractIdFromException(e));
        } catch (Exception e) {
            uniqueErrors.add("An unexpected error occurred.");
        }

        if (!uniqueErrors.isEmpty()) {
            throw new InvalidRequestException(String.join(" and ", uniqueErrors));
        }

        return null;
    }


   private List<EmployeeResponse> handleEmployeeTeamMembers(Project project) {
        return project.getEmployeeTeamMembers().stream()
            .map(empId -> {
                try {
                    Employee employee = employeeClient.getEmployeeById(empId);
                    if (employee == null) {
                        throw new EmployeeNotFoundException("Employee not found with ID: " + empId);
                    }

                    // Map employee to EmployeeResponse
                    EmployeeResponse employeeResponse = modelMapper.map(employee, EmployeeResponse.class);
                    employeeResponse.setProjects(Collections.singletonList(project.getProjectId()));

                    // Retrieve and set supervisor details if available
                    if (employee.getSupervisorId() != null) {
                        Supervisor supervisor = supervisorClient.getSupervisorById(employee.getSupervisorId());
                        if (supervisor != null) {
                            SupervisorResponse supervisorResponse = modelMapper.map(supervisor, SupervisorResponse.class);
                            supervisorResponse.setProjects(Collections.singletonList(project.getProjectId()));
                            employeeResponse.setSupervisor(supervisorResponse);
                        } else {
                            throw new ProjectNotFoundException("Supervisor not found with ID: " + employee.getSupervisorId());
                        }
                    }

                    return employeeResponse;
                } catch (FeignException.NotFound e) {
                    logger.warn("Employee not found with ID: {}", empId, e);
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    private List<SupervisorResponse> handleSupervisorTeamMembers(Project project) {
        List<SupervisorResponse> supervisorResponses = new ArrayList<>();
        for (String supId : project.getSupervisorTeamMembers()) {
            try {
                if (supId.startsWith("EMP")) {
                    // Handle case where supervisor ID is an employee ID
                    String newSupervisorId = generateUniqueSupervisorId();
                    Supervisor supervisor = createSupervisorFromEmployee(supId, newSupervisorId, project.getProjectId());
                    supervisorClient.createSupervisor(supervisor);

                    SupervisorResponse supervisorResponse = modelMapper.map(supervisor, SupervisorResponse.class);
                    supervisorResponse.setProjects(Collections.singletonList(project.getProjectId()));
                    supervisorResponses.add(supervisorResponse);

                    // Optionally, remove the employee if needed
                    employeeClient.deleteEmployeeProj(supId); // Handle employee removal
                } else {
                    // Handle case where supervisor ID is a valid supervisor ID
                    Supervisor supervisor = supervisorClient.getSupervisorById(supId);
                    if (supervisor == null) {
                        throw new ProjectNotFoundException("Supervisor not found with ID: " + supId);
                    }

                    SupervisorResponse supervisorResponse = modelMapper.map(supervisor, SupervisorResponse.class);
                    supervisorResponse.setProjects(Collections.singletonList(project.getProjectId()));

                    // Retrieve and set employee details for supervisors
                    List<EmployeeResponse> employeesForSupervisor = getEmployeesForSupervisor(supId);
                    supervisorResponse.setEmployee(employeesForSupervisor);

                    supervisorResponses.add(supervisorResponse);
                }
            } catch (FeignException.NotFound e) {
                logger.warn("Supervisor not found with ID: {}", supId, e);
            }
        }
        return supervisorResponses;
    }
    
    private List<EmployeeResponse> getEmployeesForSupervisor(String supervisorId) {
        // Fetch all projects where the supervisor is part of the team
        List<Project> projects = projectRepository.findBySupervisorTeamMembersContains(supervisorId);

        // Collect unique employee IDs from these projects
        Set<String> employeeIds = new HashSet<>();
        for (Project project : projects) {
            employeeIds.addAll(project.getEmployeeTeamMembers());
        }

        // Retrieve employee details and convert to EmployeeResponse
        return employeeIds.stream()
            .map(empId -> {
                Employee employee = employeeClient.getEmployeeById(empId);
                if (employee == null) {
                    throw new EmployeeNotFoundException("Employee not found: " + empId);
                }
                return modelMapper.map(employee, EmployeeResponse.class);
            }).collect(Collectors.toList());
    }
    
    private Supervisor createSupervisorFromEmployee(String empId, String supervisorId, String projectId) {
        Employee employee = employeeClient.getEmployeeById(empId);
        if (employee == null) {
            throw new EmployeeNotFoundException("Employee not found for supervisor ID: " + empId);
        }

        Supervisor supervisor = modelMapper.map(employee, Supervisor.class);
        supervisor.setSupervisorId(supervisorId);
        supervisor.setProjects(Collections.singletonList(projectId));
        return supervisor;
    }
    
    private String extractIdFromException(FeignException e) {
        // Extract the employee or supervisor ID from the exception message
        String message = e.getMessage();
        int startIndex = message.lastIndexOf("/") + 1;
        int endIndex = message.indexOf("]", startIndex);
        return message.substring(startIndex, endIndex);
    }

    private void validateEmployeeIds(List<String> employeeIds) {
        for (String empId : employeeIds) {
            if (employeeClient.getEmployeeById(empId) == null) {
                throw new ResourceNotFoundException("Employee not found with ID: " + empId);
            }
        }
    }

    private void validateSupervisorIds(List<String> supervisorIds) {
        for (String supId : supervisorIds) {
            if (supId.startsWith("EMP")) {
                if (employeeClient.getEmployeeById(supId) == null) {
                    throw new ResourceNotFoundException("Employee not found for supervisor ID: " + supId);
                }
            } else if (supervisorClient.getSupervisorById(supId) == null) {
                throw new ResourceNotFoundException("Supervisor not found with ID: " + supId);
            }
        }
    }

    private String generateUniqueProjectId() {
        try {
            String newProjectId = restTemplate.getForObject(PROJECT_ID_GENERATION_URL, String.class);
            if (newProjectId == null || newProjectId.isEmpty()) {
                throw new RuntimeException("Failed to generate project ID.");
            }
            return newProjectId;
        } catch (Exception e) {
            throw new RuntimeException("Error generating project ID", e);
        }
    }

    private String generateUniqueSupervisorId() {
        try {
            String newSupervisorId = restTemplate.getForObject(ID_GENERATION_SERVICE_URL, String.class);
            if (newSupervisorId == null || newSupervisorId.isEmpty()) {
                throw new RuntimeException("Failed to generate supervisor ID.");
            }
            return newSupervisorId;
        } catch (Exception e) {
            throw new RuntimeException("Error generating supervisor ID", e);
        }
    }
   
    private boolean projectIdExists(String projectId) {
        return projectRepository.existsById(projectId);
    }

 public Project getProjectById(String projectId) {
    return projectRepository.findById(projectId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found: " + projectId));
}

    public List<Project> getAllProjects() {
        List<Project> projects = projectRepository.findAll();
        projects.forEach(project -> {
            List<String> validEmployeeIds = project.getEmployeeTeamMembers().stream()
                .filter(empId -> {
                    try {
                        employeeClient.getEmployeeById(empId);
                        return true;
                    } catch (FeignException.NotFound e) {
                        logger.warn("Employee not found with ID: {}", empId, e);
                        return false;
                    }
                })
                .collect(Collectors.toList());
            project.setEmployeeTeamMembers(validEmployeeIds);

            List<String> validSupervisorIds = project.getSupervisorTeamMembers().stream()
                .filter(supId -> {
                    try {
                        supervisorClient.getSupervisorById(supId);
                        return true;
                    } catch (FeignException.NotFound e) {
                        logger.warn("Supervisor not found with ID: {}", supId, e);
                        return false;
                    }
                })
                .collect(Collectors.toList());
            project.setSupervisorTeamMembers(validSupervisorIds);
        });
        return projects;
    }

    public ProjectResponse updateProject(String projectId, Project updatedProject) {
        Set<String> uniqueErrors = new LinkedHashSet<>();

        // Check if the project exists
        Project existingProject = null;
        try {
            existingProject = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));
        } catch (ResourceNotFoundException e) {
            uniqueErrors.add(e.getMessage());
            throw new InvalidRequestException(String.join(" and ", uniqueErrors));
        }

        // Update project details
        existingProject.setProjectTitle(updatedProject.getProjectTitle());
        existingProject.setProjectDescription(updatedProject.getProjectDescription());

        // Validate employee and supervisor IDs
        try {
            validateEmployeeIds(updatedProject.getEmployeeTeamMembers());
        } catch (EmployeeNotFoundException e) {
            uniqueErrors.add(e.getMessage());
        }

        try {
            validateSupervisorIds(updatedProject.getSupervisorTeamMembers());
        } catch (EmployeeNotFoundException | ProjectNotFoundException e) {
            uniqueErrors.add(e.getMessage());
        }

        if (!uniqueErrors.isEmpty()) {
            throw new InvalidRequestException(String.join(" and ", uniqueErrors));
        }

        // Handle and validate employee team members
        List<EmployeeResponse> employeeResponses = new ArrayList<>();
        try {
            employeeResponses = handleEmployeeTeamMembers(updatedProject);
        } catch (FeignException.NotFound e) {
            uniqueErrors.add("Employee not found with ID: " + extractIdFromException(e));
        }

        // Handle and validate supervisor team members
        List<SupervisorResponse> supervisorResponses = new ArrayList<>();
        try {
            supervisorResponses = handleSupervisorTeamMembers(updatedProject);
        } catch (FeignException.NotFound e) {
            uniqueErrors.add("Supervisor not found with ID: " + extractIdFromException(e));
        }

        if (!uniqueErrors.isEmpty()) {
            throw new InvalidRequestException(String.join(" and ", uniqueErrors));
        }

        // Update project members
        existingProject.setEmployeeTeamMembers(updatedProject.getEmployeeTeamMembers());
        existingProject.setSupervisorTeamMembers(updatedProject.getSupervisorTeamMembers());

        // Save updated project
        projectRepository.save(existingProject);

        // Build and return the project response
        return buildProjectResponse(existingProject, employeeResponses, supervisorResponses);
    }



    public void deleteProject(String projectId) {
        Set<String> uniqueErrors = new LinkedHashSet<>();

        // Retrieve the project entity
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        // Convert Project to ArchiveProject using ModelMapper
        ArchiveProject archiveProject = modelMapper.map(project, ArchiveProject.class);

        // Save the archived project record
        archiveProjectRepository.save(archiveProject);

        // Delete the project record from the main table
        try {
            projectRepository.delete(project);
        } catch (Exception e) {
            uniqueErrors.add("An unexpected error occurred while deleting the project.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join(" and ", uniqueErrors));
        }
    }


    private ProjectResponse buildProjectResponse(Project project, List<EmployeeResponse> employeeResponses, List<SupervisorResponse> supervisorResponses) {
        ProjectResponse response = modelMapper.map(project, ProjectResponse.class);
        response.setEmployeeTeamMembers(employeeResponses);
        response.setSupervisorTeamMembers(supervisorResponses);
        return response;
    }
    
    

    public EmployeeResponse getEmployeeById(String employeeId) {
        Employee employee = employeeClient.getEmployeeById(employeeId);
        if (employee == null) {
            throw new ResourceNotFoundException("Employee not found: " + employeeId);
        }

        SupervisorResponse supervisorResponse = null;
        if (employee.getSupervisorId() != null) {
            Supervisor supervisor = supervisorClient.getSupervisorById(employee.getSupervisorId());
            if (supervisor != null) {
                supervisorResponse = modelMapper.map(supervisor, SupervisorResponse.class);
            } else {
                System.err.println("Warning: Supervisor not found with ID: " + employee.getSupervisorId());
            }
        }

        EmployeeResponse employeeResponse = modelMapper.map(employee, EmployeeResponse.class);
        employeeResponse.setSupervisor(supervisorResponse);
        return employeeResponse;
    }
    
//    

    public SupervisorResponse getSupervisorById(String supervisorId) {
        Supervisor supervisor = supervisorClient.getSupervisorById(supervisorId);
        if (supervisor == null) {
            throw new RuntimeException("Supervisor not found: " + supervisorId);
        }

        List<Project> projects = projectRepository.findBySupervisorTeamMembersContains(supervisorId);

        SupervisorResponse response = new SupervisorResponse();
        response.setSupervisorId(supervisor.getSupervisorId());
        response.setFirstName(supervisor.getFirstName());
        response.setLastName(supervisor.getLastName());
        response.setAddress(supervisor.getAddress());
        response.setMobileNumber(supervisor.getMobileNumber());
        response.setEmailId(supervisor.getEmailId());
        response.setPassword(supervisor.getPassword());
        response.setAadharNumber(supervisor.getAadharNumber());
        response.setPanNumber(supervisor.getPanNumber());
        response.setProjects(projects.stream().map(Project::getProjectId).collect(Collectors.toList()));

        return response;
    }

    public boolean isSupervisorForEmployee(String supervisorId, String empId) {
        return projectRepository.findAll().stream()
            .anyMatch(project -> project.getEmployeeTeamMembers().contains(empId) &&
                project.getSupervisorTeamMembers().contains(supervisorId));
    }

    public List<String> getSupervisorsForProject(String projectId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        return project.getSupervisorTeamMembers().stream()
            .map(supId -> {
                Supervisor supervisor = supervisorClient.getSupervisorById(supId);
                if (supervisor != null) {
                    return supervisor.getFirstName() + " " + supervisor.getLastName();
                } else {
                    throw new RuntimeException("Supervisor not found for ID: " + supId);
                }
            }).collect(Collectors.toList());
    }

    public List<ProjectResponse> getProjectsByEmployeeId(String employeeId) {
        List<Project> projects = projectRepository.findByEmployeeTeamMembersContains(employeeId);

        if (projects.isEmpty()) {
            throw new RuntimeException("No projects found for employee ID: " + employeeId);
        }

        return projects.stream()
            .map(project -> {
                ProjectResponse response = new ProjectResponse();
                response.setProjectId(project.getProjectId());
                response.setProjectTitle(project.getProjectTitle());
                return response;
            }).collect(Collectors.toList());
    }

    public List<String> findSupervisorsByProjectAndEmployee(String projectId, String employeeId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        if (!project.getEmployeeTeamMembers().contains(employeeId)) {
            throw new RuntimeException("Employee with ID " + employeeId + " is not part of the project " + projectId);
        }

        List<String> supervisorIds = project.getSupervisorTeamMembers();
        if (supervisorIds.isEmpty()) {
            throw new RuntimeException("No supervisors found for the project " + projectId);
        }

        return supervisorIds;
    }

    public List<Project> getProjectsBySupervisorId(String supervisorId) {
        return projectRepository.findBySupervisorTeamMembersContains(supervisorId);
    }

    public ProjectResponse createProjectResponse(Project project) {
        List<EmployeeResponse> employeeResponses = getEmployeeResponses(project);
        List<SupervisorResponse> supervisorResponses = getSupervisorResponses(project);

        ProjectResponse projectResponse = new ProjectResponse();
        projectResponse.setProjectId(project.getProjectId());
        projectResponse.setProjectTitle(project.getProjectTitle());
        projectResponse.setProjectDescription(project.getProjectDescription());
        projectResponse.setEmployeeTeamMembers(employeeResponses);
        projectResponse.setSupervisorTeamMembers(supervisorResponses);

        return projectResponse;
    }
    
    private List<EmployeeResponse> getEmployeeResponses(Project project) {
        return project.getEmployeeTeamMembers().stream()
            .map(empId -> {
                Employee employee = employeeClient.getEmployeeById(empId);
                if (employee == null) {
                    throw new RuntimeException("Employee not found: " + empId);
                }
                return modelMapper.map(employee, EmployeeResponse.class);
            }).collect(Collectors.toList());
    }

    private List<SupervisorResponse> getSupervisorResponses(Project project) {
        return project.getSupervisorTeamMembers().stream()
            .map(supId -> {
                Supervisor supervisor = supervisorClient.getSupervisorById(supId);
                if (supervisor == null) {
                    throw new RuntimeException("Supervisor not found: " + supId);
                }
                return modelMapper.map(supervisor, SupervisorResponse.class);
            }).collect(Collectors.toList());
    }
    public List<SupervisorResponse> getSupervisorsByEmployeeId(String employeeId) {
        // Fetch all projects where the employee is part of the team
        List<Project> projects = projectRepository.findByEmployeeTeamMembersContains(employeeId);

        if (projects.isEmpty()) {
            throw new RuntimeException("No projects found for employee ID: " + employeeId);
        }

        // Set to collect unique supervisor IDs
        Set<String> supervisorIds = new HashSet<>();

        // Collect all unique supervisor IDs from these projects
        for (Project project : projects) {
            supervisorIds.addAll(project.getSupervisorTeamMembers());
        }

        // Retrieve supervisor details and convert to SupervisorResponse
        List<SupervisorResponse> supervisorResponses = supervisorIds.stream()
            .map(supervisorId -> {
                Supervisor supervisor = supervisorRepository.findById(supervisorId)
                    .orElseThrow(() -> new RuntimeException("Supervisor not found: " + supervisorId));

                SupervisorResponse supervisorResponse = new SupervisorResponse();
                supervisorResponse.setSupervisorId(supervisor.getSupervisorId());
                supervisorResponse.setFirstName(supervisor.getFirstName());
                supervisorResponse.setLastName(supervisor.getLastName());
                supervisorResponse.setAddress(supervisor.getAddress());
                supervisorResponse.setMobileNumber(supervisor.getMobileNumber());
                supervisorResponse.setEmailId(supervisor.getEmailId());
                supervisorResponse.setPassword(supervisor.getPassword());
                supervisorResponse.setAadharNumber(supervisor.getAadharNumber());
                supervisorResponse.setPanNumber(supervisor.getPanNumber());
                supervisorResponse.setProjects(projectRepository.findBySupervisorTeamMembersContains(supervisorId)
                    .stream().map(Project::getProjectId).collect(Collectors.toList()));

                return supervisorResponse;
            })
            .collect(Collectors.toList());

        return supervisorResponses;
    }

}
