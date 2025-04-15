import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import './CreateProject.css';
import NavPages from '../NavPages';
import successCheck from '../../Image/checked.png'
import Button from "react-bootstrap/Button";
import successImage from '../../Image/checked.png'; // Import your success image here
import Modal from "react-bootstrap/Modal";
import { useSelector } from 'react-redux';
import { adminUrl, employee_Url, serverUrl, supervisorurl } from '../../APIs/Base_UrL';

const CreateProject = () => {
  const navigate = useNavigate();
  const adminValue = useSelector((state) => state.adminLogin.value);
  const adminId = adminValue.adminId;

  // State for form input values
  const [formData, setFormData] = useState({
    projectTitle: '',
    projectDescription: '',
    employeeTeamMembers: [''],
    supervisorTeamMembers: [''],
  });

  // Error state for each field
  const [projectTitleError, setProjectTitleError] = useState('');
  const [projectDescriptionError, setProjectDescriptionError] = useState('');
  const [employeeTeamMembersError, setEmployeeTeamMembersError] = useState([]);
  const [supervisorTeamMembersError, setSupervisorTeamMembersError] = useState([]);
  const [createdProjectId, setCreatedProjectId] = useState(null); // New state to hold the created employee ID
  // State for available IDs
  const [availableEmployeeIds, setAvailableEmployeeIds] = useState([]);
  const [availableSupervisorIds, setAvailableSupervisorIds] = useState([]);

  // State for confirmation page
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false); // Modal for confirmation

  // State for showing the success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const validateEmployeeID = (id) => /^EMP\d{3}$/.test(id);

  const validateEmployeeOrSupervisorID = (id) => {
    // Regex that matches both Employee IDs (e.g., EMP123) and Supervisor IDs (e.g., SUP456)
    return /^EMP\d{3}$|^SUP\d{3}$/.test(id);
  };

  const handleTeamMemberChange = (index, value) => {
    const updatedEmployeeTeamMembers = [...formData.employeeTeamMembers];
    const updatedEmployeeTeamMembersError = [...employeeTeamMembersError];

    updatedEmployeeTeamMembers[index] = value;

    // Validate input for both Employee ID and Supervisor ID
    if (!validateEmployeeOrSupervisorID(value)) {
      updatedEmployeeTeamMembersError[index] = "Please enter a valid Employee or Supervisor ID";
    } else {
      updatedEmployeeTeamMembersError[index] = ""; // Clear error if valid
    }

    setFormData({
      ...formData,
      employeeTeamMembers: updatedEmployeeTeamMembers,
    });

    setEmployeeTeamMembersError(updatedEmployeeTeamMembersError);
  };


  const handleSupervisorChange = (index, value) => {
    const updatedSupervisorTeamMembers = [...formData.supervisorTeamMembers];
    const updatedSupervisorTeamMembersError = [...supervisorTeamMembersError];

    updatedSupervisorTeamMembers[index] = value;

    // Validate input for both Employee ID and Supervisor ID
    if (!validateEmployeeOrSupervisorID(value)) {
      updatedSupervisorTeamMembersError[index] = "Please enter a valid Employee or Supervisor ID";
    } else {
      updatedSupervisorTeamMembersError[index] = ""; // Clear error if valid
    }

    setFormData({
      ...formData,
      supervisorTeamMembers: updatedSupervisorTeamMembers,
    });

    setSupervisorTeamMembersError(updatedSupervisorTeamMembersError);
  };



  const handleAddTeamMember = () => {
    setFormData({
      ...formData,
      employeeTeamMembers: [...formData.employeeTeamMembers, ''],
    });
    setEmployeeTeamMembersError([...employeeTeamMembersError, '']);
  };

  const handleRemoveTeamMember = (index) => {
    const updatedEmployeeTeamMembers = [...formData.employeeTeamMembers];
    updatedEmployeeTeamMembers.splice(index, 1);
    setFormData({
      ...formData,
      employeeTeamMembers: updatedEmployeeTeamMembers,
    });
  };

  const handleAddSupervisor = () => {
    setFormData({
      ...formData,
      supervisorTeamMembers: [...formData.supervisorTeamMembers, ''],
    });
    setSupervisorTeamMembersError([...supervisorTeamMembersError, '']);
  };

  const handleRemoveSupervisor = (index) => {
    const updatedSupervisorTeamMembers = [...formData.supervisorTeamMembers];
    updatedSupervisorTeamMembers.splice(index, 1);
    setFormData({
      ...formData,
      supervisorTeamMembers: updatedSupervisorTeamMembers,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent the default behavior of form submission

    if (!validateFields()) {
      return; // If validation fails, stay on the same page
    }

    setFormSubmitted(true); // Proceed only if validation passes
  };


  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear error messages if the input becomes valid
    if (field === "projectTitle" && value.trim() !== "") {
      setProjectTitleError(""); // Clear the project title error if valid input is entered
    }
    if (field === "projectDescription" && value.trim() !== "") {
      setProjectDescriptionError(""); // Clear the project description error if valid input is entered
    }
    if (field === "employeeTeamMembers") {
      const updatedErrors = [...employeeTeamMembersError];
      if (validateEmployeeID(value)) {
        updatedErrors[field] = ""; // Clear the specific employee ID error if valid
      }
      setEmployeeTeamMembersError(updatedErrors);
    }
    if (field === "supervisorTeamMembers") {
      const updatedErrors = [...supervisorTeamMembersError];
      // Add validation logic for supervisors if necessary
      updatedErrors[field] = ""; // Clear the specific supervisor ID error if valid
      setSupervisorTeamMembersError(updatedErrors);
    }
  };


  const handleConfirmSubmit = async () => {
    setShowConfirmationModal(false); // Hide confirmation modal
    const { projectTitle, projectDescription, employeeTeamMembers, supervisorTeamMembers } = formData;

    try {
      const response = await axios.post(
        `${serverUrl}/admin/projects`,
        
        {
          projectTitle,
          projectDescription,
          employeeTeamMembers,
          supervisorTeamMembers,
        },
        {
          params: {
            adminId,
          },
        }
        
      );
      console.log('API Response:', response.data);
      const createdProjectId = response.data.projectId;

      setCreatedProjectId(createdProjectId);

      console.log('API Response:', response.data);
      setShowSuccessModal(true); // Show success modal when form is successfully submitted
      // navigate('/admin');
      return createdProjectId;
    } catch (error) {
      console.error('Error creating project:', error.message);
      // alert('Error creating project. Please try again.');
      setFormSubmitted(false);
    }
  };


  const handleCancel = () => {
    navigate('/admin');
  };

  // const handleConfirmationCancel = () => {
  //   setFormSubmitted(false);
  // };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate('/admin/updateprojectdetails');
  };

  const handleShowConfirmationModal = () => {
    setShowConfirmationModal(true);
  };

  const handleConfirmationCancel = () => {
    setShowConfirmationModal(false);
    navigate('/admin');
  };

  const validateFields = () => {
    let isValid = true;

    setProjectTitleError('');
    setProjectDescriptionError('');
    setEmployeeTeamMembersError([]);
    setSupervisorTeamMembersError([]);

    if (!formData.projectTitle) {
      setProjectTitleError('Project Title is required.');
      isValid = false;
    }

    if (!formData.projectDescription) {
      setProjectDescriptionError('Project Description is required.');
      isValid = false;
    }

    const employeeTeamMembersErrors = formData.employeeTeamMembers.map((member) => {
      let idError = '';

      if (!validateEmployeeID(member)) {
        idError = 'Type valid employee ID.';
      }

      if (idError) {
        isValid = false;
      }
      return idError;
    });

    setEmployeeTeamMembersError(employeeTeamMembersErrors);

    const supervisorTeamMembersErrors = formData.supervisorTeamMembers.map((supervisor) => {
      let idError = '';

      if (!validateEmployeeOrSupervisorID(supervisor)) {
        idError = 'Type valid supervisor ID.';
      }

      return idError;
    });

    setSupervisorTeamMembersError(supervisorTeamMembersErrors);

    return isValid;
  };


  // Fetch employee IDs from the backend when the component mounts
  // Fetch IDs from the backend
  useEffect(() => {
    const fetchEmployeeIds = async () => {
      try {
        const response = await axios.get(`${serverUrl}/employee/getemployees`);
        if (Array.isArray(response.data)) {
          setAvailableEmployeeIds(response.data); // Assuming the response contains an array of employee IDs
        } else {
          console.error("Expected an array but got:", response.data);
          setAvailableEmployeeIds([]); // Fallback to an empty array
        }
      } catch (error) {
        console.error("Error fetching employee IDs:", error.message);
        setAvailableEmployeeIds([]); // Handle errors by setting to an empty array
      }
    };

    const fetchSupervisorIds = async () => {
      try {
        const response = await axios.get(`${serverUrl}/supervisors`);
        if (Array.isArray(response.data)) {
          setAvailableSupervisorIds(response.data); // Valid array
        } else {
          console.error("Expected an array but got:", response.data);
          setAvailableSupervisorIds([]); // Fallback to empty array
        }
      } catch (error) {
        console.error("Error fetching supervisor IDs:", error.message);
        setAvailableSupervisorIds([]); // Fallback to empty array
      }
    };

    fetchEmployeeIds();
    fetchSupervisorIds();
  }, []);

  const combinedTeamMembers = availableSupervisorIds.concat(availableEmployeeIds);

  // State to manage selected ID
  const [selectedId, setSelectedId] = useState("");

  // Handle dropdown value change
  const handleSelectionChange = (value) => {
    setSelectedId(value);
  };
  return (
    <div className="ti-background-clr" style={{ marginTop: "-90px" }}>
      <NavPages />
      <div className="adminUser-ProjectForm">
        <div className="createAdmin-ProjectForm">
          <p
            className="createAdmin-title-ProjectForm"
            
          >
            Create New Project
          </p>
          <form>
            {formSubmitted ? (
              // Confirmation Page
              <div
                className="createAdmin-body-ProjectForm border border-1 border-dark rounded"
              >
                <div className="createAdmin-confirmation-text-container">
                  <p className="createAdmin-confirmation-text">
                    Confirm the following details before submitting:
                  </p>
                </div>

                <div className="confirmation-field">
                  <p>Project Title: {formData.projectTitle}</p>
                </div>
                <div className="confirmation-field">
                  <p>Project Description: {formData.projectDescription}</p>
                </div>
                <div className="confirmation-field">
                  <p>Team Members:</p>
                  <ul>
                    {formData.employeeTeamMembers.map((member, index) => {
                      // Find the details for the current member
                      const memberDetails = combinedTeamMembers.find(
                        (combinedMember) =>
                          combinedMember.employeeId === member || combinedMember.supervisorId === member
                      );

                      return (
                        <li key={index}>
                          ID: {member} -{" "}
                          {memberDetails
                            ? `${memberDetails.firstName} ${memberDetails.lastName}`
                            : "Details not found"}
                        </li>
                      );
                    })}
                  </ul>

                </div>
                <div className="confirmation-field">
                  <p>Supervisor Employees:</p>
                  <ul>
                    {formData.supervisorTeamMembers.map((supervisor, index) => {
                      const supervisorDetails = combinedTeamMembers.find(
                        (member) =>
                          member.supervisorId === supervisor || member.employeeId === supervisor
                      );

                      return (
                        <li key={index}>
                          {supervisorDetails
                            ? `${supervisorDetails.supervisorId || supervisorDetails.employeeId} - ${supervisorDetails.firstName} ${supervisorDetails.lastName}`
                            : `ID: ${supervisor}`}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="confirmation-button-group">
                  <div className="d-flex justify-content-center">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleShowConfirmationModal}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary ms-2"
                      onClick={handleConfirmationCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Form Fields
              <div
                className="createAdmin-body-ProjectForm border border-1 border-dark rounded"
              >
                <label>Project Title:</label>
                <input
                  type="text"
                  className="form-control-1-ProjectForm"
                  value={formData.projectTitle}
                  onChange={(e) =>
                    handleInputChange("projectTitle", e.target.value)
                  }
                />
                {projectTitleError && (
                  <p className="error-message-ProjectForm">{projectTitleError}</p>
                )}

                <label>Project Description:</label>
                <textarea
                  className="form-control-1-ProjectForm"
                  value={formData.projectDescription}
                  onChange={(e) =>
                    handleInputChange("projectDescription", e.target.value)
                  }
                />
                {projectDescriptionError && (
                  <p className="error-message-ProjectForm">
                    {projectDescriptionError}
                  </p>
                )}

                {/* Team Members */}
                <div className="mt-3">
                  <label>Team Members:</label>
                  {formData.employeeTeamMembers.map((member, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                      <select
                        className="form-control-ProjectForm me-2"
                        value={member || ""}
                        onChange={(e) => handleTeamMemberChange(index, e.target.value)}
                      >
                        <option value="" disabled>
                          Select an Employee ID
                        </option>
                        {availableEmployeeIds
                          .filter(
                            (employee) =>
                              !formData.employeeTeamMembers.some(
                                (selectedMember, selectedIndex) =>
                                  selectedMember === employee.employeeId && selectedIndex !== index
                              ) && // Exclude already selected in Team Members
                              !formData.supervisorTeamMembers.includes(employee.employeeId) // Exclude IDs selected in Supervisors
                          )
                          .map((employee) => (
                            <option key={employee.employeeId} value={employee.employeeId}>
                              {employee.employeeId} - {employee.firstName} {employee.lastName}
                            </option>
                          ))}
                      </select>
                      {employeeTeamMembersError[index] && (
                        <p className="error-message-ProjectForm text-danger">
                          {employeeTeamMembersError[index]}
                        </p>
                      )}
                      {index === 0 ? (
                        <button
                          type="button"
                          className="btn btn-success btn-sm d-inline-block"
                          style={{ width: "100px", height: "33.7px" }}
                          onClick={handleAddTeamMember}
                          disabled={
                            availableEmployeeIds.filter(
                              (employee) =>
                                !formData.employeeTeamMembers.includes(employee.employeeId) &&
                                !formData.supervisorTeamMembers.includes(employee.employeeId)
                            ).length === 0
                          } // Disable button if no available employees
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm d-inline-block"
                          style={{ width: "100px", height: "33.7px" }}
                          onClick={() => handleRemoveTeamMember(index)}
                        >
                          -
                        </button>
                      )}
                    </div>
                  ))}
                </div>


                {/* Supervisor Employees */}
                <div className="mt-3">
                  <label>Supervisor Employees:</label>
                  {formData.supervisorTeamMembers.map((supervisor, index) => (
                    <div key={index} className="d-flex align-items-center gap-2 mb-2">
                      <select
                        className="form-control-ProjectForm me-2"
                        value={supervisor || ""}
                        onChange={(e) => handleSupervisorChange(index, e.target.value)}
                      >
                        <option value="" disabled>
                          Select a Supervisor ID
                        </option>
                        {combinedTeamMembers
                          .filter(
                            (member) =>
                              // Exclude IDs already selected in the Supervisor Dropdown
                              !formData.supervisorTeamMembers.some(
                                (selectedSupervisor, selectedIndex) =>
                                  selectedSupervisor === (member.supervisorId || member.employeeId) &&
                                  selectedIndex !== index
                              ) &&
                              // Exclude IDs already selected in the Employee Dropdown
                              !formData.employeeTeamMembers.includes(member.employeeId)
                          )
                          .map((member) => (
                            <option
                              key={member.supervisorId || member.employeeId}
                              value={member.supervisorId || member.employeeId}
                            >
                              {member.supervisorId
                                ? `${member.supervisorId} - ${member.firstName} ${member.lastName}`
                                : `${member.employeeId} - ${member.firstName} ${member.lastName}`}
                            </option>
                          ))}
                      </select>
                      {supervisorTeamMembersError[index] && (
                        <p className="error-message-ProjectForm text-danger">
                          {supervisorTeamMembersError[index]}
                        </p>
                      )}
                      {index === 0 ? (
                        <button
                          type="button"
                          className="btn btn-success btn-sm d-inline-block"
                          style={{ width: "100px", height: "33.7px" }}
                          onClick={handleAddSupervisor}
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm d-inline-block"
                          style={{ width: "100px", height: "33.7px" }}
                          onClick={() => handleRemoveSupervisor(index)}
                        >
                          -
                        </button>
                      )}
                    </div>
                  ))}
                </div>


                <br />

                <div className="buttons text-center mt-3">
                  <button
                    type="submit"
                    className="btn btn-success mx-2"
                    onClick={handleSubmit}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary mx-2"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal show={showConfirmationModal} onHide={handleConfirmationCancel}>
        <Modal.Body>Are you sure you want to create this project?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleConfirmationCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmSubmit}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
      {showSuccessModal && (
        <Modal show={showSuccessModal} onHide={handleCloseSuccessModal}>
          <div className="d-flex flex-column modal-success p-4 align-items-center ">
            <img
              src={successCheck}
              className="img-fluid mb-4"
              alt="successCheck"
            />
            <p className="mb-4 text-center">Project created Successfully.</p>
            {createdProjectId && (
              // Conditionally render project ID
              <p className="mb-4 text-center">Project ID: {createdProjectId}</p>
            )}
            <p className="mb-4 text-center">
              Project Title: {formData.projectTitle}
            </p>

            <button
              className="btn  w-100 text-white"
              onClick={handleCloseSuccessModal}
              style={{ backgroundColor: "#5EAC24" }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

};

export default CreateProject;