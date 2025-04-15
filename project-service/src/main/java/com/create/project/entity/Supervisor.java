package com.create.project.entity;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;



@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Supervisor {

	
	
	@Id
	private String supervisorId;

	@NotBlank(message = "First name must not be blank")
    private String firstName;

    @NotBlank(message = "Last name must not be blank")
    private String lastName;

    @NotBlank(message = "Address must not be blank")
    private String address;

    @NotNull(message = "Mobile number must not be null")
    private Long mobileNumber;

    @NotBlank(message = "Email ID must not be blank")
    @Pattern(regexp = ".*@gmail\\.com$", message = "Email address must end with @gmail.com")
    private String emailId;

    @NotBlank(message = "Password is required")
    private String password;

    @NotNull(message = "Aadhar number must not be null")
    private Long aadharNumber;

    @NotBlank(message = "PAN number must not be blank")
    @Pattern(regexp = "[A-Z]{5}[0-9]{4}[A-Z]{1}", message = "PAN number must have the format ABCDE1234F")
    private String panNumber;

    
    private List<String> projects;
	

}
