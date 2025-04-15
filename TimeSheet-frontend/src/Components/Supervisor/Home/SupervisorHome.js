import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "../../Supervisor/Home/supervisor.css";
import { useSelector, useDispatch } from "react-redux";
import { submitON, submitOFF } from "../../features/submitBtn";

import { leaveSubmitON, leaveSubmitOFF } from "../../features/empLeaveSubmit";
import axios from "axios";
import { serverUrl, supervisorurl } from '../../APIs/Base_UrL'


function SupervisorHome() {
  const supervisorValue = useSelector((state) => state.supervisorLogin.value);
  const supervisorId = supervisorValue.supervisorId;
  const [isOpenTimesheet, setIsOpenTimesheet] = useState(true);
  const [isOpenLeaveManagement, setIsOpenLeaveManagement] = useState(true);
  const [startSubmitDate, setStartSubmitDate] = useState("");
  const [endSubmitDate, setEndSubmitDate] = useState("");
  const [submitSupervisorId, setSubmitSupervisorId] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [countTimesheet, setCountTimesheet] = useState(0);
  const [rejectTimesheetCount, setRejectTimesheetCount] = useState(0);
  const [leaveObjectId, setLeaveObjectId] = useState("");
  const [isLeaveSubmit, setIsLeaveSubmit] = useState("");
  const [leaveSubmitEmpId, setLeaveSubmitEmpId] = useState("");
  const [leaveSubmitStartDate, setLeaveSubmitStartDate] = useState("");
  const [leaveSubmitEndDate, setLeaveSubmitEndDate] = useState("");
  const [leaveSubmitStatus, setLeaveSubmitStatus] = useState("");
  const [leavePending, setLeavePending] = useState(0);
  const [rejectLeave, setRejectLeave] = useState(0);
  const dispatch = useDispatch();
  const [leaveRequests, setLeaveRequests] = useState([]);
  useEffect(() => {
    setLeaveObjectId(localStorage.getItem(`leaveObjectId${supervisorId}`));
  }, []);

  useEffect(() => {
    // Retrieve the submit state from local storage when the component mounts
    const savedSubmitState = localStorage.getItem(`isSubmitOn${supervisorId}`);
    const startSubmitDate = localStorage.getItem(
      `startSubmitDate${supervisorId}`
    );
    const endSubmitDate = localStorage.getItem(`endSubmitDate${supervisorId}`);
    const submitSupervisorId = localStorage.getItem(
      `submitSupervisorId${supervisorId}`
    );
    const status = localStorage.getItem(`statusValue${supervisorId}`);
    if (savedSubmitState === "true") {
      setStartSubmitDate(startSubmitDate);
      setEndSubmitDate(endSubmitDate);
      setSubmitSupervisorId(submitSupervisorId);
      setStatusValue(status);
      dispatch(submitON(true)); // Set the Redux state if needed
    } else {
      setStartSubmitDate(startSubmitDate);
      setEndSubmitDate(endSubmitDate);
      setStatusValue(status);
      setSubmitSupervisorId(submitSupervisorId);
    }
  }, []);

  console.log(startSubmitDate);
  console.log(endSubmitDate);
  console.log(submitSupervisorId);

  async function leaveStatus() {
    let response = await axios.get(
      `${serverUrl}/supervisor/leave-requests`
    );
    let data = response.data;

    let submitLeaveRequest = data.filter((obj) => obj.id == leaveObjectId);

    submitLeaveRequest.map((obj) => {
      setLeaveSubmitStartDate(obj.startDate);
      setLeaveSubmitEndDate(obj.endDate);
      setLeaveSubmitStatus(obj.status);
    });
    let leaveStatus = submitLeaveRequest.some(
      (obj) => obj.status === "PENDING"
    );

    if (leaveStatus) {
      dispatch(leaveSubmitON(true));
    } else {
      dispatch(leaveSubmitOFF(false));
    }
  }

  useEffect(() => {
    leaveStatus();
  }, [leaveObjectId]);

  async function timesheetState() {
    if (startSubmitDate && endSubmitDate && submitSupervisorId) {
      try {
        let response = await axios.get(
          `${serverUrl}/sup/api/working-hours/${supervisorId}/range?startDate=${startSubmitDate}&endDate=${endSubmitDate}`
        );
        let data = response.data;
        let status = data[0].status;
        console.log(statusValue);

        if (status === "APPROVED") {
          setStatusValue(status);
          dispatch(submitOFF(false));
          localStorage.setItem(`isSubmitOn${supervisorId}`, "false");
          localStorage.setItem(`statusValue${supervisorId}`, status);
        } else if (status === "REJECTED") {
          setStatusValue(status);
          dispatch(submitOFF(false));
          localStorage.setItem(`isSubmitOn${supervisorId}`, "false");
          localStorage.setItem(`statusValue${supervisorId}`, status);
        }
      } catch (error) {
        console.error("Error fetching timesheet data:", error);
      }
    }
  }

  useEffect(() => {
    timesheetState();
  }, [startSubmitDate, endSubmitDate, supervisorId]);

  useEffect(() => {
    async function fetchLeaveRequests() {
      try {
        let response = await axios.get(`${serverUrl}/supervisor/leave-requests`);
        let data = response.data;

        // Filter out leave requests that have already passed their end date
        const currentDate = new Date();
        const filteredLeaveRequests = data.filter(request => {
          const requestEndDate = new Date(request.endDate);
          // Compare only the date part, not the time
          return (
            requestEndDate.getFullYear() > currentDate.getFullYear() ||
            (requestEndDate.getFullYear() === currentDate.getFullYear() &&
              requestEndDate.getMonth() > currentDate.getMonth()) ||
            (requestEndDate.getFullYear() === currentDate.getFullYear() &&
              requestEndDate.getMonth() === currentDate.getMonth() &&
              requestEndDate.getDate() >= currentDate.getDate())
          );
        });
        setLeaveRequests(filteredLeaveRequests);
      } catch (error) {
        console.error("Error fetching leave requests:", error);
      }
    }

    fetchLeaveRequests();
  }, []);


  return (
    <>
      <div className="ti-background-clr">
        <div className="ti-home-container">
          <div className="left-navigation">
            <div
              className={`collapse-container mb-3 ${isOpenTimesheet ? "active" : ""
                }`}
            >
              <button
                onClick={() => setIsOpenTimesheet(!isOpenTimesheet)}
                className="collapse-toggle btn fw-bold"
              >
                Timesheet Options
              </button>
              {isOpenTimesheet && (
                <div className="collapse-content ">
                  <ul>
                    <Link to={"/supervisor/addtimesheet"}>Add Timesheet</Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/edittimesheet"}>Edit Timesheet</Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/rejecttimesheet"}>
                      View Rejected Timesheet
                    </Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/approvetimesheet"}>
                      Employee Timesheet Approval
                    </Link>
                  </ul>
                </div>
              )}
            </div>
            <div
              className={`collapse-container mb-3 ${isOpenLeaveManagement ? "active" : ""
                }`}
            >
              <button
                onClick={() => setIsOpenLeaveManagement(!isOpenLeaveManagement)}
                className="collapse-toggle btn fw-bold"
              >
                Leave Management
              </button>
              {isOpenLeaveManagement && (
                <div className="collapse-content ">
                  <ul>
                    <Link to={"/supervisor/leaverequest"}>
                      Add Leave Request
                    </Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/editleaverequest"}>
                      Edit Leave Request
                    </Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/viewrejectedleaverequests"}>
                      View Rejected Leave Requests
                    </Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/viewapprovedleaverequests"}>
                      View Approved Leave Requests
                    </Link>
                  </ul>
                  <ul>
                    <Link to={"/supervisor/leaveapproval"}>
                      Employee Leave Requests Approve
                    </Link>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="right-details">
            {/* notification about timesheet */}
            {/* <div className="row text-center ti-home-notification">

                            <div className="col   mx-5 my-2 p-2 ">Timesheet to be approved : {countTimesheet}</div>
                            <div className="col  mx-5  my-2 p-2  ">Rejected Timesheets : {rejectTimesheetCount}</div>

                        </div>
                        <div className="row text-center ti-home-notification">
                            <div className="col   mx-5 my-2 p-2 ">Leaves to be approved : {leavePending}</div>
                            <div className="col  mx-5  my-2 p-2  ">Rejected Leave Request : {rejectLeave}</div>
                        </div> */}

            <div className="row text-center ti-home-content mt-2">
              {/* timesheet status */}
              <div className="col mx-5 my-2 p-2 ">
                <p className="p-2 title">Your Submitted Timesheet</p>
                <div className="body   p-2 text-start">
                  <div className="m-4 ti-home-ti-status p-4">
                    <h5 className=""> Timesheet Period </h5>

                    <div className="d-flex flex-column ms-4">
                      <div className="d-flex align-items-center mb-2">
                        <p className="mb-0 me-2">Start date :</p>
                        <p className="mb-0">{startSubmitDate}</p>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <p className="mb-0 me-2">End date :</p>
                        <p className="mb-0">{endSubmitDate}</p>
                      </div>
                      <div className="d-flex align-items-center">
                        <p className="mb-0 me-2">STATUS :</p>
                        {statusValue && (
                          <button
                            className="view-btn p-2"
                            style={{
                              backgroundColor:
                                statusValue === "APPROVED"
                                  ? "green"
                                  : statusValue === "REJECTED"
                                    ? "red"
                                    : "blue",
                              color: "white", // Set the text color to white for better visibility
                            }}
                          >
                            {statusValue}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* navigation pages */}
              <div className="col mx-5 my-2 p-2">
                <p className="p-2 title">Your Requested Leaves</p>
                <div className="body p-2 text-start">
                  {leaveRequests.map((leave, index) => (
                    <div key={index} className="m-4 ti-home-ti-status p-4">
                      <h5>Leave Request Period</h5>
                      <div className="d-flex flex-column ms-4">
                        <div className="d-flex align-items-center mb-2">
                          <p className="mb-0 me-2">Start date:</p>
                          <p className="mb-0">{leave.startDate}</p>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <p className="mb-0 me-2">End date:</p>
                          <p className="mb-0">{leave.endDate}</p>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <p className="mb-0 me-2">Number of Days:</p>
                          <p className="mb-0">{leave.noOfDays}</p>
                        </div>
                        <div className="d-flex align-items-center">
                          <p className="mb-0 me-2">STATUS:</p>
                          <button
                            className="view-btn p-2"
                            style={{
                              backgroundColor:
                                leave.status === "APPROVED"
                                  ? "green"
                                  : leave.status === "REJECTED"
                                    ? "red"
                                    : "blue",
                              color: "white",
                            }}
                          >
                            {leave.status}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SupervisorHome;
