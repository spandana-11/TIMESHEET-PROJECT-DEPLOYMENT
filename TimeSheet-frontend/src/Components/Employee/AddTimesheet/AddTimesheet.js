import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { submitON, submitOFF } from "../../features/submitBtn";
import { Modal, Button } from "react-bootstrap";
import successCheck from "../../Image/checked.png";
import { employeeWorkingHours_Url, serverUrl } from "../../APIs/Base_UrL";

import "./AddTimesheet.css";
import { adminUrl } from "../../APIs/Base_UrL";

const AddTimesheet = () => {
  const [total, setTotal] = useState(0);
  const [startSubmitDate, setStartSubmitDate] = useState("");
  const [endSubmitDate, setEndSubmitDate] = useState("");
  const [submitEmployeeId, setSubmitEmployeeId] = useState("");
  const [hoursError, setHoursError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [projectIdError, setProjectIdError] = useState("");
  const [timesheetData, setTimesheetData] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [projectRows, setProjectRows] = useState([{}]);
  const [showFirstHalf, setShowFirstHalf] = useState(true);
  const [addDataSubmitConfirmation, setAddDataSubmitConfirmation] =
    useState(false);
  const [successModalForTimesheet, setSuccessModalForTimesheet] =
    useState(false);
  const [saveModalForTimesheet, setSaveModalForTimesheet] = useState(false);
const [savedWorkHours, setSavedWorkHours] = useState([]);
  let navigate = useNavigate();

  let { isSubmit } = useSelector((state) => state.submitBtn.value);
  const dispatch = useDispatch();

  const employeeValue = useSelector((state) => state.employeeLogin.value);
  const employeeId = employeeValue.employeeId;

  useEffect(() => {
    generateTimesheetData(selectedMonth);
  }, [selectedMonth, showFirstHalf]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${serverUrl}/admin/projects/employees/${employeeId}`);
        
        // Access the projects array within the response data
        let projectDatas = response.data.projects;
    
        if (Array.isArray(projectDatas)) {
          let projectIds = projectDatas.map((projectId) => projectId); // Assuming each entry is a project ID
          setAvailableProjects(projectIds);
        } else {
          console.error("Projects data is not an array:", projectDatas);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    

    fetchProjects();
  }, [employeeId]);

  
  const handleForward = () => {
    if (selectedMonth) {
      const nextMonth = new Date(selectedMonth);
      nextMonth.setMonth(nextMonth.getMonth() + (showFirstHalf ? 0 : 1));

      const currentDate = new Date();
      if (
        nextMonth.getFullYear() > currentDate.getFullYear() ||
        (nextMonth.getFullYear() === currentDate.getFullYear() &&
          nextMonth.getMonth() > currentDate.getMonth())
      ) {
        console.warn("Navigation beyond current month is not allowed.");
        return;
      }

      const newMonth = nextMonth.toISOString().split("T")[0].slice(0, 7);
      console.log("Navigating forward to:", newMonth);

      setSelectedMonth(newMonth);
      setShowFirstHalf(!showFirstHalf);

      // Regenerate timesheet data for the updated range
      generateTimesheetData(newMonth);
    } else {
      console.error("Selected month is invalid:", selectedMonth);
    }
  };
  const handleBackward = () => {
    if (selectedMonth) {
      const previousMonth = new Date(selectedMonth);
      previousMonth.setMonth(previousMonth.getMonth() - (showFirstHalf ? 1 : 0));
      setSelectedMonth(previousMonth.toISOString().split("T")[0].slice(0, 7));
      setShowFirstHalf(!showFirstHalf);

      // Preserve existing workHours and leave unset days blank
      setProjectRows((prevRows) =>
        prevRows.map((row) => ({
          ...row,
          workHours: {
            ...row.workHours, // Keep previously entered hours
          },
        }))
      );
    }
  };

  const isSubmitEnabled = () => {
    const today = new Date();
    // return today.getDate() === 14; 
    const selectedMonthDate = new Date(selectedMonth); // The selected month in the date format
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0);
  
    if (showFirstHalf) {
      const fifteenthDate = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 15);
      // Enable only if today's date is the 15th of the month or later in the first half
      return today.toDateString() === fifteenthDate.toDateString();
    } else {
      // Enable only if today's date matches the last date of the month for the second half
      return today.toDateString() === endOfMonth.toDateString();
    }
  };

  const generateTimesheetData = (selectedMonth) => {
    // if (!selectedMonth) {
    //   console.error("Selected month is invalid:", selectedMonth);
    //   return;
    // }

    const selectedYear = parseInt(selectedMonth.slice(0, 4), 10);
    const selectedMonthIndex = parseInt(selectedMonth.slice(5, 7), 10) - 1;

    // Ensure that only dates strictly within the current month are generated
    const startOfMonth = new Date(selectedYear, selectedMonthIndex, 1, 0, 0, 0);
    const endOfMonth = new Date(selectedYear, selectedMonthIndex + 1, 0, 23, 59, 59);

    // Determine range based on showFirstHalf flag
    const startDay = showFirstHalf ? 1 : 16;
    const endDay = showFirstHalf ? 15 : endOfMonth.getDate();

    // Generate dates within the specified range, strictly for the selected month
    const newTimesheetData = Array.from({ length: endDay - startDay + 1 }, (_, i) => {
      const dayOfMonth = startDay + i;
      const date = new Date(selectedYear, selectedMonthIndex, dayOfMonth, 12, 0, 0); // Noon ensures no timezone shift
      if (date >= startOfMonth && date <= endOfMonth) {
        return { date };
      } else {
        console.warn("Date out of range:", date);
        return null;
      }
    }).filter(Boolean); // Remove any null values

    if (newTimesheetData.length === 0) {
      console.warn("No timesheet data generated for the selected month:", selectedMonth);
    }

    setTimesheetData(newTimesheetData);

    console.log(
      "Generated timesheet data:",
      newTimesheetData.map((entry) => entry.date.toISOString().split("T")[0])
    );
  };
  console.log(timesheetData);

  const handleProjectChange = (rowIndex, selectedOption) => {
    if (selectedOption && selectedOption.value) {
      setProjectIdError(""); // Clear the error when a valid projectId is selected
      let result = projectRows.some(
        (project) => project.projectId === selectedOption.value
      );
      if (result) {
        setProjectIdError("Project Already In Use");
      } else {
        const updatedProjectRows = [...projectRows];
        updatedProjectRows[rowIndex] = {
          ...updatedProjectRows[rowIndex],
          projectId: selectedOption.value,
        };
        setProjectRows(updatedProjectRows);
      }
    } else {
      setProjectIdError("Please select a valid project");
    }
  };
  console.log("project", projectRows);

  const isSunday = (date) => date.getDay() === 0;

  const handleWorkHoursChange = (rowIndex, columnIndex, value) => {
    let parsedValue = value.replace(/[^0-9]/g, "");
    parsedValue = parsedValue ? Number(parsedValue) : 0;

    const newProjectRows = [...projectRows];
    const previousValue = Number(
      newProjectRows[rowIndex].workHours?.[columnIndex] || 0
    );
    let dayTotal = 0;

    newProjectRows.forEach((row) => {
      if (row.workHours && row.workHours[columnIndex]) {
        dayTotal += Number(row.workHours[columnIndex]);
      }
    });

    const newDayTotal = dayTotal - previousValue + parsedValue;

    if (newDayTotal <= 15) {
      if (!newProjectRows[rowIndex].workHours) {
        newProjectRows[rowIndex].workHours = {};
      }
      newProjectRows[rowIndex].workHours[columnIndex] = parsedValue;
      setProjectRows(newProjectRows);
      setHoursError("");
      if (projectIdError && projectRows[rowIndex].projectId) {
        setProjectIdError("");
      }
    } else {
      setHoursError("Maximum work hours per day is 15.");
      if (newProjectRows[rowIndex].workHours) {
        newProjectRows[rowIndex].workHours[columnIndex] = previousValue;
      } else {
        newProjectRows[rowIndex].workHours = { [columnIndex]: previousValue };
      }
      setProjectRows(newProjectRows);
    }
  };

  function calculateTotalWorkHours() {
    let totalWorkHours = 0;
    projectRows.forEach((row) => {
      if (row.workHours) {
        for (let key in row.workHours) {
          totalWorkHours += Number(row.workHours[key]);
        }
      }
    });
    setTotal(totalWorkHours);
  }

  useEffect(() => {
    calculateTotalWorkHours();
  }, [projectRows]);

  const handleAddRow = () => {
    setProjectRows((prev) => [...prev, {}]);
  };

  const handleRemoveRow = (rowIndex) => {
    const newProjectRows = [...projectRows];
    newProjectRows.splice(rowIndex, 1);
    setProjectRows(newProjectRows);
  };

  const validateTimesheetData = () => {
    let isValid = true;

    const invalidRows = projectRows.filter(
      (row) =>
        !row.projectId ||
        !Object.values(row.workHours || {}).some((hours) => hours > 0)
    );
    if (invalidRows.length > 0) {
      setProjectIdError("Please select a valid project and enter work hours.");
      isValid = false;
    } else {
      setProjectIdError("");
    }

    return isValid;
  };

  // Inside your AdminAddTimesheet component

  useEffect(() => {
    const loadSavedData = () => {
      const savedData = JSON.parse(localStorage.getItem(employeeId)) || [];
      
      const filteredData = savedData.flat().filter((entry) => {
        const entryDate = new Date(entry.date);
        const selectedYear = parseInt(selectedMonth.slice(0, 4), 10);
        const selectedMonthIndex = parseInt(selectedMonth.slice(5, 7), 10) - 1;
        return (
          entryDate.getFullYear() === selectedYear &&
          entryDate.getMonth() === selectedMonthIndex
        );
      });
  
      let updatedProjectRows = [...projectRows];
  
      filteredData.forEach((entry) => {
        const rowIndex = updatedProjectRows.findIndex(
          (row) => row.projectId === entry.projectId
        );
        
        // Update existing rows or create a new one
        if (rowIndex !== -1) {
          if (!updatedProjectRows[rowIndex].workHours) {
            updatedProjectRows[rowIndex].workHours = {};
          }
          updatedProjectRows[rowIndex].workHours[entry.date] = entry.hours;
        } else if (updatedProjectRows.length === 1 && !updatedProjectRows[0].projectId) {
          // Fill the first default empty row
          updatedProjectRows[0] = {
            projectId: entry.projectId,
            workHours: { [entry.date]: entry.hours },
          };
        } else {
          // Add a new row if necessary
          updatedProjectRows.push({
            projectId: entry.projectId,
            workHours: { [entry.date]: entry.hours },
          });
        }
      });
  
      setProjectRows(updatedProjectRows);
    };
  
    loadSavedData();
  }, [selectedMonth]);
  

const handleSaveTimesheetData = () => {
  if (validateTimesheetData()) {
    const formattedData = [];

    // Populate formattedData with timesheet entries
    timesheetData.forEach((entry) => {
      const dateStr = entry.date.toISOString().split("T")[0]; // YYYY-MM-DD format
      projectRows.forEach((row) => {
        if (row.projectId) {
          formattedData.push({
            employeeId: employeeId,
            projectId: row.projectId,
            date: dateStr,
            hours: row.workHours?.[dateStr] || 0, // Default to 0 if no hours entered
          });
        }
      });
    });

    // Update the state with saved work hours
    setSavedWorkHours(formattedData);
    // Save data to localStorage
    const existingData = JSON.parse(localStorage.getItem(employeeId)) || [];
    localStorage.setItem(employeeId, JSON.stringify([...existingData, formattedData]));
    setSaveModalForTimesheet(true); // Display save success modal
  }
};


  const submitTimesheetData = async () => {
    if (!validateTimesheetData()) {
      return;
    }
    setAddDataSubmitConfirmation(false);
    // Array to hold the formatted timesheet entries
    const formattedData = [];

    // Create a date formatter for 'en-GB' locale
    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Initialize formattedData with zero hours for all dates
    timesheetData.forEach((entry) => {
      const formattedDate = dateFormatter.format(entry.date);
      const [day, month, year] = formattedDate.split("/");
      const dateStr = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD

      projectRows.forEach((row) => {
        if (row.projectId) {
          // Ensure that each date for each project has an entry
          formattedData.push({
            employeeId,
            projectId: row.projectId,
            date: dateStr,
            hours: row.workHours?.[dateStr] || 0, // Default to zero hours
          });
        }
      });
    });

    // Update formattedData with entered work hours
    projectRows.forEach((row) => {
      if (row.projectId && row.workHours) {
        Object.entries(row.workHours).forEach(([columnIndex, hours]) => {
          if (timesheetData[columnIndex]?.date && hours) { // Safe check
            const formattedDate = dateFormatter.format(
              timesheetData[columnIndex].date
            );
            const [day, month, year] = formattedDate.split("/");
            const dateStr = `${year}-${month}-${day}`;

            formattedData.push({
              employeeId,
              projectId: row.projectId,
              date: dateStr,
              hours: row.workHours?.[dateStr] || 0,
            });
          } else {
            console.warn("Missing or invalid date for work hours:", columnIndex);
          }
        });
      }
    });


    console.log(formattedData);

    // Check if there is any data to send
    if (formattedData.length > 0) {
      console.log(formattedData);
      try {
        // Send the data to the backend
        const response = await axios.post(
          `${serverUrl}/workinghours/bulk`,
          formattedData
        );

        if (response.data) {
          let data = response.data;
          let statusValue = data[0].status;

          // dispatch(submitAdminON(true));

          localStorage.setItem(`isSubmitOn${employeeId}`, "true");

          let receviedData = response.data;
          let lengthOfData = receviedData.length;
          console.log(lengthOfData);
          let last = receviedData[lengthOfData - 1];
          console.log(last);
          let lastDate = last.date;
          let first = receviedData[0];
          let empId = first.employeeId;
          console.log(empId);
          console.log(first);
          let firstDate = first.date;
          setSubmitEmployeeId(empId);
          setStartSubmitDate(firstDate);
          setEndSubmitDate(lastDate);
          localStorage.setItem(`startSubmitDate${employeeId}`, firstDate);
          localStorage.setItem(`endSubmitDate${employeeId}`, lastDate);
          localStorage.setItem(`submitEmployeeId${employeeId}`, empId);
          localStorage.setItem(`statusValue${employeeId}`, statusValue);
          setSuccessModalForTimesheet(true);
        }
      } catch (error) {
        // Handle errors in the request
        console.error("Error saving timesheet data:", error);
      }
    } else {
      console.log("No data to save.");
    }
  };

  function closeSuccessModal() {
    setSuccessModalForTimesheet(false);
    navigate("/employee");
  }
  function closeSaveModal() {
    setSaveModalForTimesheet(false);
    navigate("/employee");
  }

  // Get the current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g., "2024-10"

  // Create a Date object from the current month
  const [year, month] = currentMonth.split("-").map(Number); // Split and convert to numbers
  const currentDate = new Date(year, month - 1); // month - 1 because month is 0-indexed

  // Add 6 months
  currentDate.setMonth(currentDate.getMonth() + 5);

  // Get the new year and month in the desired format
  const newYear = currentDate.getFullYear();
  const newMonth = currentDate.getMonth() + 1; // Adding 1 to make it 1-indexed

  // Format the result as YYYY-MM
  const endMonth = `${newYear}-${newMonth < 10 ? "0" : ""}${newMonth}`; // Add leading zero if needed

  useEffect(() => {
    // Get the current month and year
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Month is zero-indexed
    setSelectedMonth(`${year}-${month}`);
  }, []);

  const getMaxDate = () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + 5);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  };

  return (
    <div className="AddTimesheet background-clr" >
      <div className="AddTimesheet employeeEdit-container pt-4" >
        <div>
          <p className="sprAdmin-createAdmin-title" > Add Timesheet </p>
        </div>

        < div className="d-flex justify-content-between" >
          <div className="m-1" >
            <label htmlFor="fromMonth" style={{ fontWeight: "bold" }
            }>Current Month and Year : </label>
            < input
              type="month"
              id="fromMonth"
              className="mx-1 selection-c"
              value={selectedMonth}
              min={currentMonth} // Ensure minimum is the current month
              max={currentMonth} // Restrict maximum to the current month
              readOnly // Makes the field non-editable
            />

          </div>
          {
            selectedMonth && (
              <div>
                <button
                  className="AddTimesheet btn btn-primary"
                  onClick={handleBackward}
                  disabled={selectedMonth === currentMonth && showFirstHalf
                  }
                >
                  <i className="bi bi-caret-left-fill" > </i>Backward
                </button>
                < button
                  className="AddTimesheet btn btn-primary ms-2"
                  onClick={handleForward}
                  disabled={selectedMonth === endMonth && !showFirstHalf}
                >
                  Forward < i className="bi bi-caret-right-fill" > </i>
                </button>
              </div>
            )}
        </div>

        {
          selectedMonth && (
            <div>
              <div
                className="table-responsive border border-1 rounded p-4 border-black my-4"
                style={{ position: "relative", zIndex: 1 }
                }
              >
                {projectIdError && (
                  <div style={{ color: "red", fontWeight: "bold" }}>
                    {projectIdError}
                  </div>
                )}
                <table className="table table-bordered border-dark text-center" >
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: "#c8e184" }}> Date </th>
                      {
                        timesheetData.map((entry, index) => (
                          <th key={index} style={{ backgroundColor: " #c8e184" }}>
                            {
                              entry?.date
                                ? entry.date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                                : "Invalid Date"}
                          </th>
                        ))}

                      <th style={{ backgroundColor: "#c8e184" }}> </th>
                    </tr>
                    < tr >
                      <th style={{ backgroundColor: " #c8e184" }}> Day </th>
                      {
                        timesheetData.map((entry, index) => (
                          <td
                            key={index}
                            style={{
                              backgroundColor: entry?.date?.getDay() === 0 ? "gold" : "#c8e184",
                            }}
                          >
                            {
                              entry?.date
                                ? entry.date.toLocaleDateString("en-US", { weekday: "short" })
                                : "Invalid"}
                          </td>

                        ))}
                      <td style={{ backgroundColor: "#c8e184" }}> </td>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      projectRows.map((project, rowIndex) => (
                        <tr key={rowIndex} >
                          <td
                            style={{ width: "120px", backgroundColor: "#e8fcaf" }}
                          >
                            <Select
                              options={
                                availableProjects.map((projectId) => ({
                                  value: projectId,
                                  label: projectId,
                                }))
                              }
                              value={
                                project.projectId
                                  ? {
                                    value: project.projectId,
                                    label: project.projectId,
                                  }
                                  : null
                              }
                              onChange={(selectedOption) =>
                                handleProjectChange(rowIndex, selectedOption)
                              }
                              placeholder="Project ID"
                              className="AddTimesheet my-2"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minWidth: "150px", // Adjust the width here
                                }),
                                menu: (base) => ({
                                  ...base,
                                  minWidth: "150px", // Adjust dropdown menu width
                                }),
                              }}
                            />
                          </td>
                          {
  timesheetData.map((entry, columnIndex) => (
    <td key={columnIndex} style={{ backgroundColor: "#e8fcaf" }}>
      <input
        type="text"
        inputMode="numeric"
        className="AddTimesheet form-control my-3"
        placeholder="0"
        value={
          project.workHours &&
          project.workHours[entry.date.toISOString().split("T")[0]]
            ? project.workHours[entry.date.toISOString().split("T")[0]]
            : ""
        }
        disabled={
          isSunday(entry.date) || // Disable if it's Sunday
          entry.date > new Date(new Date().setHours(23, 59, 59, 999)) // Disable future dates
        }
        onChange={(e) =>
          handleWorkHoursChange(
            rowIndex,
            entry.date.toISOString().split("T")[0],
            e.target.value
          )
        }
      />
    </td>
  ))
}

                          <td style={{ backgroundColor: "#e8fcaf" }}>
                            <button
                              className="AddTimesheet btn btn-danger my-3"
                              onClick={() => handleRemoveRow(rowIndex)}
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                < button
                  className="AddTimesheet btn btn-success ms-2 w-auto"
                  onClick={handleAddRow}
                >
                  +
                </button>
                {
                  hoursError && (
                    <div style={{ color: "red", fontWeight: "bold" }}>
                      {hoursError}
                    </div>
                  )
                }
              </div>

              < div >
                <span className="AddTimesheet fw-bold" >
                  Total Hours Worked: {total}
                </span>
              </div>
              < div className="d-flex justify-content-center" >
                <button
                  className="AddTimesheet btn btn-primary m-3 w-5"
                  onClick={handleSaveTimesheetData}
                  style={{ width: "100px" }}
                >
                  Save
                </button>
                < button
                  className="AddTimesheet btn btn-success m-3 w-5"
                  onClick={() => setAddDataSubmitConfirmation(true)}
                  disabled={isSubmit || !isSubmitEnabled()}
                  style={{ width: "100px" }}
                >
                  Submit
                </button>
                < button
                  className="AddTimesheet btn btn-secondary m-3 w-5"
                  style={{ width: "100px" }}
                  onClick={() => {
                    navigate("/employee");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
      </div>
      < Modal show={addDataSubmitConfirmation} >
        <Modal.Body>Do you want to Submit ? </Modal.Body>
        < Modal.Footer >
          <Button
            variant="secondary"
            onClick={() => setAddDataSubmitConfirmation(false)}
          >
            Cancel
          </Button>
          < Button variant="success" onClick={submitTimesheetData} >
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
      < Modal
        className="custom-modal"
        style={{ left: "50%", transform: "translateX(-50%)" }}
        dialogClassName="modal-dialog-centered"
        show={successModalForTimesheet}
      >
        <div className="d-flex flex-column modal-success p-4 align-items-center " >
          <img
            src={successCheck}
            className="img-fluid mb-4"
            alt="successCheck"
          />
          <p className="mb-4 text-center" >
            {" "}
            You Have Submitted Timesheet For Approval.
          </p>
          < p className="mb-4 text-center" >
            <b>
              {" "}
              {startSubmitDate} To {endSubmitDate} {" "}
            </b>
          </p>
          < button
            className="btn  w-100 text-white"
            onClick={closeSuccessModal}
            style={{ backgroundColor: "#5EAC24" }}
          >
            Close
          </button>
        </div>
      </Modal>
      < Modal
        className="custom-modal"
        style={{ left: "50%", transform: "translateX(-50%)" }}
        dialogClassName="modal-dialog-centered"
        show={saveModalForTimesheet}
      >
        <div className="d-flex flex-column modal-success p-4 align-items-center " >
          <img
            src={successCheck}
            className="img-fluid mb-4"
            alt="successCheck"
          />
          <p className="mb-4 text-center" >
            {" "}
            Your Timesheet Saved Successfully.
          </p>
          < button
            className="btn  w-100 text-white"
            onClick={closeSaveModal}
            style={{ backgroundColor: "#5EAC24" }}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AddTimesheet;
