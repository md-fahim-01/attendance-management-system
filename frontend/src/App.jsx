import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const COMPANY_NAME = 'NARNIKA INDUSTRIES';
const COMPANY_TAGLINE = 'Attendance • Payroll • Reporting';
const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'employees', label: 'Employees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'salary', label: 'Salary' },
  { key: 'reports', label: 'Reports' }
];
const statusOptions = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'];
const statusLabels = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave'
};
const statusShort = {
  PRESENT: 'P',
  ABSENT: 'A',
  HALF_DAY: 'HD',
  LEAVE: 'L'
};

const toInputDate = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const todayString = () => toInputDate();
const currentMonth = () => todayString().slice(0, 7);
const roundDisplay = (value, digits = 2) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
const weekdayShort = (dateString) => new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

function parseMonth(monthValue) {
  const [year, month] = monthValue.split('-').map(Number);
  return { year, month };
}

function getMonthScope(monthValue) {
  const { year, month } = parseMonth(monthValue);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDay = new Date(year, month, 0).getDate();
  const visibleLastDay = isCurrentMonth ? Math.min(today.getDate(), lastDay) : lastDay;
  const dates = Array.from({ length: visibleLastDay }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return {
      label: day,
      weekday: weekdayShort(`${monthValue}-${day}`),
      value: `${monthValue}-${day}`
    };
  });

  return {
    year,
    month,
    dates,
    visibleLastDay,
    lastDay,
    startDate: `${monthValue}-01`,
    endDate: `${monthValue}-${String(visibleLastDay).padStart(2, '0')}`,
    isCurrentMonth
  };
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('attendance_token');
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    throw new Error('Session expired. Please login again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
}

function StatCard({ title, value, hint }) {
  return (
    <div className="card stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('attendance_token'));
  const [username, setUsername] = useState(localStorage.getItem('attendance_user') || 'narnika');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(todayString());
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [salaryMonth, setSalaryMonth] = useState(currentMonth());
  const [salaryReport, setSalaryReport] = useState([]);
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [reportEmployeeId, setReportEmployeeId] = useState('all');
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([]);

  const [employeeForm, setEmployeeForm] = useState({
    id: null,
    employeeCode: '',
    name: '',
    department: '',
    designation: '',
    phone: '',
    paymentNumber: '',
    idType: '',
    idNumber: '',
    salary: '',
    joiningDate: todayString()
  });

  const salaryMonthParts = useMemo(() => parseMonth(salaryMonth), [salaryMonth]);
  const reportScope = useMemo(() => getMonthScope(reportMonth), [reportMonth]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(window.__toastTimeout);
    window.__toastTimeout = window.setTimeout(() => setToast(null), 3200);
  };

  function populateEmployeeForm(employee = {}) {
    setEmployeeForm({
      id: employee.id ?? null,
      employeeCode: employee.employeeCode || '',
      name: employee.name || '',
      department: employee.department || '',
      designation: employee.designation || '',
      phone: employee.phone || '',
      paymentNumber: employee.paymentNumber || '',
      idType: employee.idType || '',
      idNumber: employee.idNumber || '',
      salary: employee.salary ?? '',
      joiningDate: employee.joiningDate || todayString()
    });
  }

  function updateAttendanceRow(index, patch) {
    setAttendanceRows((prev) => prev.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...patch } : row
    )));
  }

  useEffect(() => {
    if (!token) return;
    initialize();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadAttendanceData(attendanceDate);
  }, [attendanceDate, token]);

  useEffect(() => {
    if (!token) return;
    loadSalaryReport();
  }, [salaryMonth, token]);

  useEffect(() => {
    if (!token) return;
    loadMonthlyAttendanceReport(reportMonth);
  }, [reportMonth, token]);

  async function initialize() {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboard(),
        loadEmployees(),
        loadTodayReport(),
        loadSalaryReport(),
        loadAttendanceData(attendanceDate),
        loadMonthlyAttendanceReport(reportMonth)
      ]);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    const data = await apiRequest('/dashboard/summary');
    setSummary(data);
  }

  async function loadEmployees(term = search) {
    const query = term ? `?search=${encodeURIComponent(term)}` : '';
    const data = await apiRequest(`/employees${query}`);
    setEmployees(data);
    return data;
  }

  async function loadTodayReport() {
    const data = await apiRequest('/reports/today');
    setTodayAttendance(data);
  }

  async function loadAttendanceData(date) {
    const [employeeList, attendanceList] = await Promise.all([
      apiRequest('/employees'),
      apiRequest(`/attendance?date=${date}`)
    ]);

    const mapped = employeeList.map((employee) => {
      const existing = attendanceList.find((record) => record.employee.id === employee.id);
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: employee.department,
        status: existing?.status || 'PRESENT',
        checkIn: existing?.checkIn || '09:00',
        checkOut: existing?.checkOut || '17:00',
        extraDay: existing?.extraDay ?? 0,
        overtimeHours: existing?.overtimeHours ?? 0,
        hasExisting: Boolean(existing),
        isEditing: !existing
      };
    });

    setAttendanceRows(mapped);
  }

  async function loadSalaryReport() {
    const { year, month } = parseMonth(salaryMonth);
    const data = await apiRequest(`/salary/report?year=${year}&month=${month}`);
    setSalaryReport(data);
  }

  async function loadMonthlyAttendanceReport(monthValue = reportMonth) {
    const { year, month } = parseMonth(monthValue);
    const data = await apiRequest(`/attendance/monthly?year=${year}&month=${month}`);
    setMonthlyAttendanceRecords(data);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.target);
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password')
        })
      });
      localStorage.setItem('attendance_token', response.token);
      localStorage.setItem('attendance_user', response.username);
      setToken(response.token);
      setUsername(response.username);
      showToast('Login successful');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function resetEmployeeForm() {
    populateEmployeeForm();
  }

  async function submitEmployee(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...employeeForm,
        salary: Number(employeeForm.salary)
      };
      if (employeeForm.id) {
        await apiRequest(`/employees/${employeeForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Employee updated successfully');
      } else {
        await apiRequest('/employees', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Employee added successfully');
      }
      resetEmployeeForm();
      await Promise.all([loadEmployees(), loadDashboard(), loadAttendanceData(attendanceDate), loadMonthlyAttendanceReport(reportMonth)]);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteEmployee(id) {
    if (!window.confirm('Delete this employee?')) return;
    setLoading(true);
    try {
      await apiRequest(`/employees/${id}`, { method: 'DELETE' });
      showToast('Employee deleted');
      if (String(reportEmployeeId) === String(id)) {
        setReportEmployeeId('all');
      }
      await Promise.all([loadEmployees(), loadDashboard(), loadAttendanceData(attendanceDate), loadMonthlyAttendanceReport(reportMonth)]);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function searchEmployees(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await loadEmployees(search);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function attendancePayload(row) {
    const activeTime = row.status === 'PRESENT' || row.status === 'HALF_DAY';
    return {
      employeeId: row.employeeId,
      date: attendanceDate,
      status: row.status,
      checkIn: activeTime ? row.checkIn : null,
      checkOut: activeTime ? row.checkOut : null,
      extraDay: Number(row.extraDay || 0),
      overtimeHours: Number(row.overtimeHours || 0)
    };
  }

  async function saveAttendanceRow(row) {
    setLoading(true);
    try {
      await apiRequest('/attendance', {
        method: 'POST',
        body: JSON.stringify(attendancePayload(row))
      });
      showToast(`Attendance saved for ${row.name}`);
      await Promise.all([
        loadDashboard(),
        loadTodayReport(),
        loadSalaryReport(),
        loadMonthlyAttendanceReport(reportMonth),
        loadAttendanceData(attendanceDate)
      ]);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveAllAttendance() {
    setLoading(true);
    try {
      for (const row of attendanceRows) {
        await apiRequest('/attendance', {
          method: 'POST',
          body: JSON.stringify(attendancePayload(row))
        });
      }
      showToast('Attendance saved for all employees');
      await Promise.all([
        loadDashboard(),
        loadTodayReport(),
        loadSalaryReport(),
        loadMonthlyAttendanceReport(reportMonth),
        loadAttendanceData(attendanceDate)
      ]);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv(type) {
    try {
      const tokenValue = localStorage.getItem('attendance_token');
      let url = '';
      let downloadName = '';

      if (type === 'salary') {
        url = `${API_BASE}/reports/salary/export?year=${salaryMonthParts.year}&month=${salaryMonthParts.month}`;
        downloadName = `salary-report-${salaryMonthParts.year}-${salaryMonthParts.month}.csv`;
      } else {
        url = `${API_BASE}/reports/attendance/export?year=${reportScope.year}&month=${reportScope.month}`;
        if (reportEmployeeId !== 'all') {
          url += `&employeeId=${reportEmployeeId}`;
        }
        downloadName = `attendance-register-${reportScope.year}-${reportScope.month}.csv`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenValue}` }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = downloadName;
      link.click();
      showToast(`${type === 'salary' ? 'Salary' : 'Attendance'} report downloaded`);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function logout() {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    setToken(null);
    setUsername('');
  }

  const totalPayable = salaryReport.reduce((sum, item) => sum + Number(item.finalSalary || 0), 0);
  const totalOvertimePay = salaryReport.reduce((sum, item) => sum + Number(item.overtimePay || 0), 0);
  const totalExtraDayPay = salaryReport.reduce((sum, item) => sum + Number(item.extraDayPay || 0), 0);

  const attendanceRecordMap = useMemo(() => {
    const map = new Map();
    monthlyAttendanceRecords.forEach((record) => {
      if (!map.has(record.employee.id)) {
        map.set(record.employee.id, new Map());
      }
      map.get(record.employee.id).set(record.date, record);
    });
    return map;
  }, [monthlyAttendanceRecords]);

  const filteredEmployeesForReport = useMemo(() => {
    if (reportEmployeeId === 'all') return employees;
    return employees.filter((employee) => String(employee.id) === String(reportEmployeeId));
  }, [employees, reportEmployeeId]);

  const monthlyRegisterRows = useMemo(() => {
    return filteredEmployeesForReport.map((employee) => {
      const employeeRecords = attendanceRecordMap.get(employee.id) || new Map();
      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let extraDays = 0;
      let overtimeHours = 0;

      const days = reportScope.dates.map((day) => {
        const record = employeeRecords.get(day.value);
        const shortCode = record ? statusShort[record.status] : '-';
        const extra = Number(record?.extraDay || 0);
        const overtime = Number(record?.overtimeHours || 0);

        if (record?.status === 'PRESENT') presentDays += 1;
        if (record?.status === 'HALF_DAY') halfDays += 1;
        if (record?.status === 'ABSENT') absentDays += 1;
        if (record?.status === 'LEAVE') leaveDays += 1;
        extraDays += extra;
        overtimeHours += overtime;

        const tooltip = record
          ? `${day.value} • ${statusLabels[record.status]}${record.checkIn || record.checkOut ? ` • ${record.checkIn || '--'} to ${record.checkOut || '--'}` : ''}${extra ? ` • Extra Day: ${extra}` : ''}${overtime ? ` • OT Hours: ${overtime}` : ''}`
          : `${day.value} • Not marked`;

        return {
          ...day,
          shortCode,
          tooltip,
          record
        };
      });

      return {
        employee,
        days,
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        extraDays,
        overtimeHours
      };
    });
  }, [attendanceRecordMap, filteredEmployeesForReport, reportScope]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === String(reportEmployeeId)) || null,
    [employees, reportEmployeeId]
  );

  const selectedEmployeeDetailRows = useMemo(() => {
    if (!selectedEmployee) return [];
    const employeeRecords = attendanceRecordMap.get(selectedEmployee.id) || new Map();
    return reportScope.dates.map((day) => {
      const record = employeeRecords.get(day.value);
      return {
        date: day.value,
        dayName: day.weekday,
        status: record ? statusLabels[record.status] : 'Not Marked',
        checkIn: record?.checkIn || '-',
        checkOut: record?.checkOut || '-',
        extraDay: record?.extraDay ?? 0,
        overtimeHours: record?.overtimeHours ?? 0
      };
    });
  }, [attendanceRecordMap, reportScope, selectedEmployee]);

  const monthlyTotals = useMemo(() => {
    return monthlyRegisterRows.reduce((acc, row) => ({
      presentDays: acc.presentDays + row.presentDays,
      halfDays: acc.halfDays + row.halfDays,
      absentDays: acc.absentDays + row.absentDays,
      leaveDays: acc.leaveDays + row.leaveDays,
      extraDays: acc.extraDays + row.extraDays,
      overtimeHours: acc.overtimeHours + row.overtimeHours
    }), {
      presentDays: 0,
      halfDays: 0,
      absentDays: 0,
      leaveDays: 0,
      extraDays: 0,
      overtimeHours: 0
    });
  }, [monthlyRegisterRows]);

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div>
            <div className="badge">Web Based Attendance System</div>
            <div className="company-name login-company">{COMPANY_NAME}</div>
            <h1>Attendance, Salary and Monthly Reporting</h1>
            <p className="muted">Manage employees, mark daily attendance, track month-to-date records, and prepare payroll-ready reports from one system.</p>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Username
              <input name="username" defaultValue="narnika" required />
            </label>
            <label>
              Password
              <input name="password" type="password" defaultValue="fahim620" required />
            </label>
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : 'Login'}
            </button>
            <div className="login-note">Security login is prefilled for quick setup: username narnika and password fahim620.</div>
          </form>
        </div>
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">NI</div>
          <div className="company-name">{COMPANY_NAME}</div>
          <div className="sidebar-subtitle">{COMPANY_TAGLINE}</div>
        </div>
        <nav className="menu">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeTab === item.key ? 'menu-item active' : 'menu-item'}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">Logged in: {username}</div>
          <button className="secondary-btn full-width" type="button" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div>
            <h2>{menuItems.find((item) => item.key === activeTab)?.label}</h2>
            <p className="muted">Live attendance entry, month-to-date tracking, overtime notes, and payroll-ready reporting from one panel.</p>
          </div>
          <div className="topbar-actions">
            <button className="secondary-btn" type="button" onClick={initialize}>Refresh Data</button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <section className="page-grid">
            <div className="stats-grid">
              <StatCard title="Total Employees" value={summary?.totalEmployees ?? 0} hint="Registered staff members" />
              <StatCard title="Present Today" value={summary?.presentToday ?? 0} hint="Marked as present today" />
              <StatCard title="Absent Today" value={summary?.absentToday ?? 0} hint="Marked as absent today" />
              <StatCard title="Monthly Salary Budget" value={`Rs. ${roundDisplay(summary?.monthlySalaryBudget || 0)}`} hint="Base monthly salary total" />
            </div>

            <div className="card">
              <div className="section-head">
                <h3>Today Attendance Snapshot</h3>
                <span className="pill">{todayString()}</span>
              </div>
              <div className="table-wrap large-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Extra Day</th>
                      <th>OT Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendance.map((item) => (
                      <tr key={item.id}>
                        <td>{item.employee.employeeCode}</td>
                        <td>{item.employee.name}</td>
                        <td><span className={`status ${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span></td>
                        <td>{item.checkIn || '-'}</td>
                        <td>{item.checkOut || '-'}</td>
                        <td>{roundDisplay(item.extraDay || 0)}</td>
                        <td>{roundDisplay(item.overtimeHours || 0)}</td>
                      </tr>
                    ))}
                    {!todayAttendance.length && (
                      <tr><td colSpan="7" className="empty">No attendance marked for today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'employees' && (
          <section className="page-grid two-col">
            <div className="card">
              <div className="section-head"><h3>{employeeForm.id ? 'Edit Employee' : 'Add Employee'}</h3></div>
              <form className="form-grid" onSubmit={submitEmployee}>
                <label>
                  Employee Code
                  <input
                    type="text"
                    value={employeeForm.employeeCode}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, employeeCode: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Name
                  <input
                    type="text"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Department
                  <input
                    type="text"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Designation
                  <input
                    type="text"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, designation: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Payment Number / Payment ID
                  <input
                    type="text"
                    value={employeeForm.paymentNumber}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, paymentNumber: e.target.value }))}
                    placeholder="PhonePe / Google Pay / UPI / Number"
                  />
                </label>
                <label>
                  ID Type
                  <input
                    type="text"
                    value={employeeForm.idType}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, idType: e.target.value }))}
                    placeholder="Aadhaar"
                  />
                </label>
                <label>
                  ID Number
                  <input
                    type="text"
                    value={employeeForm.idNumber}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="5882255..."
                  />
                </label>
                <label>
                  Salary
                  <input
                    type="number"
                    step="0.01"
                    value={employeeForm.salary}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, salary: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Joining Date
                  <input
                    type="date"
                    value={employeeForm.joiningDate}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, joiningDate: e.target.value }))}
                    required
                  />
                </label>
                <div className="button-row">
                  <button className="primary-btn" type="submit">{employeeForm.id ? 'Update Employee' : 'Save Employee'}</button>
                  <button className="secondary-btn" type="button" onClick={resetEmployeeForm}>Clear</button>
                </div>
              </form>
            </div>
            <div className="card">
              <div className="section-head">
                <h3>Employee List</h3>
                <form className="inline-form" onSubmit={searchEmployees}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee / payment / ID number" />
                  <button className="secondary-btn" type="submit">Search</button>
                </form>
              </div>
              <div className="table-wrap large-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Phone</th>
                      <th>Payment Number / ID</th>
                      <th>ID Type</th>
                      <th>ID Number</th>
                      <th>Salary</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>{employee.employeeCode}</td>
                        <td>{employee.name}</td>
                        <td>{employee.department}</td>
                        <td>{employee.designation}</td>
                        <td>{employee.phone}</td>
                        <td>{employee.paymentNumber || '-'}</td>
                        <td>{employee.idType || '-'}</td>
                        <td>{employee.idNumber || '-'}</td>
                        <td>Rs. {roundDisplay(employee.salary || 0)}</td>
                        <td>
                          <div className="action-row">
                            <button className="link-btn" type="button" onClick={() => populateEmployeeForm(employee)}>Edit</button>
                            <button className="link-btn danger" type="button" onClick={() => deleteEmployee(employee.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!employees.length && (
                      <tr><td colSpan="10" className="empty">No employees found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'attendance' && (
          <section className="page-grid">
            <div className="card">
              <div className="section-head">
                <h3>Daily Attendance Entry</h3>
                <div className="inline-form">
                  <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                  <button className="primary-btn" type="button" onClick={saveAllAttendance}>Save All</button>
                </div>
              </div>
              <p className="muted">This view keeps one selected day visible for all employees. Saved records can be changed later by choosing the same date and clicking Edit, so Present, Absent, Half Day, Leave, time, extra day, or OT can be corrected anytime.</p>
              <div className="table-wrap large-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Extra Day</th>
                      <th>OT Hours</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((row, index) => (
                      <tr key={row.employeeId}>
                        <td>{row.employeeCode}</td>
                        <td>{row.name}</td>
                        <td>{row.department}</td>
                        <td>
                          <select
                            value={row.status}
                            onChange={(e) => updateAttendanceRow(index, { status: e.target.value })}
                            disabled={!row.isEditing}
                          >
                            {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={row.checkIn}
                            onChange={(e) => updateAttendanceRow(index, { checkIn: e.target.value })}
                            disabled={!row.isEditing || row.status === 'ABSENT' || row.status === 'LEAVE'}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={row.checkOut}
                            onChange={(e) => updateAttendanceRow(index, { checkOut: e.target.value })}
                            disabled={!row.isEditing || row.status === 'ABSENT' || row.status === 'LEAVE'}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={row.extraDay}
                            onChange={(e) => updateAttendanceRow(index, { extraDay: e.target.value })}
                            disabled={!row.isEditing}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={row.overtimeHours}
                            onChange={(e) => updateAttendanceRow(index, { overtimeHours: e.target.value })}
                            disabled={!row.isEditing}
                          />
                        </td>
                        <td>
                          <div className="action-row">
                            {row.hasExisting && !row.isEditing ? (
                              <button className="secondary-btn" type="button" onClick={() => updateAttendanceRow(index, { isEditing: true })}>Edit</button>
                            ) : (
                              <button className="secondary-btn" type="button" onClick={() => saveAttendanceRow(row)}>{row.hasExisting ? 'Update' : 'Save'}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!attendanceRows.length && (
                      <tr><td colSpan="9" className="empty">No employees available for attendance entry.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'salary' && (
          <section className="page-grid">
            <div className="card">
              <div className="section-head">
                <h3>Monthly Salary Report</h3>
                <div className="inline-form">
                  <input type="month" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
                  <button className="secondary-btn" type="button" onClick={() => exportCsv('salary')}>Export CSV</button>
                </div>
              </div>
              <div className="summary-banner">
                <div>
                  <strong>Formula:</strong> (Monthly Salary / Total Days × Payable Days) + Extra Day Pay + Overtime Pay
                </div>
                <div>
                  <strong>Total Payable:</strong> Rs. {totalPayable.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="stats-inline">
                <div><strong>Extra Day Pay:</strong> Rs. {totalExtraDayPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div><strong>Overtime Pay:</strong> Rs. {totalOvertimePay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="table-wrap large-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Monthly Salary</th>
                      <th>Days in Month</th>
                      <th>Present</th>
                      <th>Half Day</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Payable Days</th>
                      <th>Attendance Salary</th>
                      <th>Extra Days</th>
                      <th>Extra Day Pay</th>
                      <th>OT Hours</th>
                      <th>OT Pay</th>
                      <th>Final Salary</th>
                      <th>Payment Number / ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryReport.map((item) => (
                      <tr key={item.employeeId}>
                        <td>{item.employeeCode}</td>
                        <td>{item.employeeName}</td>
                        <td>{item.department}</td>
                        <td>Rs. {roundDisplay(item.monthlySalary)}</td>
                        <td>{item.totalWorkingDays}</td>
                        <td>{item.presentDays}</td>
                        <td>{item.halfDays}</td>
                        <td>{item.absentDays}</td>
                        <td>{item.leaveDays}</td>
                        <td>{roundDisplay(item.payableDays)}</td>
                        <td>Rs. {roundDisplay(item.attendanceSalary)}</td>
                        <td>{roundDisplay(item.extraDays)}</td>
                        <td>Rs. {roundDisplay(item.extraDayPay)}</td>
                        <td>{roundDisplay(item.overtimeHours)}</td>
                        <td>Rs. {roundDisplay(item.overtimePay)}</td>
                        <td><strong>Rs. {roundDisplay(item.finalSalary)}</strong></td>
                        <td>{item.paymentNumber || '-'}</td>
                      </tr>
                    ))}
                    {!salaryReport.length && (
                      <tr><td colSpan="17" className="empty">No salary data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="page-grid reports-layout">
            <div className="card">
              <div className="section-head">
                <h3>Monthly Attendance Register</h3>
                <div className="inline-form">
                  <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
                  <select value={reportEmployeeId} onChange={(e) => setReportEmployeeId(e.target.value)}>
                    <option value="all">All Employees</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>{employee.name}</option>
                    ))}
                  </select>
                  <button className="secondary-btn" type="button" onClick={() => exportCsv('attendance')}>Download CSV</button>
                </div>
              </div>
              <p className="muted">For the current month, this register automatically shows day 1 up to today. Past months show the complete month so you can prepare payroll and shareable attendance sheets.</p>
              <div className="summary-banner compact">
                <div><strong>Period:</strong> {reportScope.startDate} to {reportScope.endDate}</div>
                <div><strong>Employees in view:</strong> {monthlyRegisterRows.length}</div>
                <div><strong>Visible days:</strong> {reportScope.visibleLastDay}</div>
              </div>
              <div className="table-wrap register-wrap">
                <table className="monthly-register">
                  <thead>
                    <tr>
                      <th className="sticky-col first-col">Code</th>
                      <th className="sticky-col second-col">Employee</th>
                      <th className="sticky-col third-col">Department</th>
                      {reportScope.dates.map((day) => (
                        <th key={day.value} className="day-col">
                          <div className="day-label">{day.label}</div>
                          <div className="day-name">{day.weekday}</div>
                        </th>
                      ))}
                      <th>Present</th>
                      <th>Half Day</th>
                      <th>Absent</th>
                      <th>Leave</th>
                      <th>Extra Days</th>
                      <th>OT Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRegisterRows.map((row) => (
                      <tr key={row.employee.id}>
                        <td className="sticky-col first-col strong-cell">{row.employee.employeeCode}</td>
                        <td className="sticky-col second-col">{row.employee.name}</td>
                        <td className="sticky-col third-col">{row.employee.department}</td>
                        {row.days.map((day) => (
                          <td key={`${row.employee.id}-${day.value}`} title={day.tooltip} className="center-cell">{day.shortCode}</td>
                        ))}
                        <td>{row.presentDays}</td>
                        <td>{row.halfDays}</td>
                        <td>{row.absentDays}</td>
                        <td>{row.leaveDays}</td>
                        <td>{roundDisplay(row.extraDays)}</td>
                        <td>{roundDisplay(row.overtimeHours)}</td>
                      </tr>
                    ))}
                    {!monthlyRegisterRows.length && (
                      <tr>
                        <td colSpan={reportScope.dates.length + 9} className="empty">No attendance register data available for this view.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="page-grid two-equal">
              <div className="card">
                <div className="section-head"><h3>Monthly Summary</h3></div>
                <div className="report-stat-grid">
                  <StatCard title="Present Marks" value={monthlyTotals.presentDays} hint="Full-day attendance entries" />
                  <StatCard title="Half-Day Marks" value={monthlyTotals.halfDays} hint="Half-day attendance entries" />
                  <StatCard title="Extra Days" value={roundDisplay(monthlyTotals.extraDays)} hint="Additional payable days entered" />
                  <StatCard title="OT Hours" value={roundDisplay(monthlyTotals.overtimeHours)} hint="Overtime hours entered" />
                </div>
                <div className="info-note">
                  <strong>Status Guide:</strong> P = Present, A = Absent, HD = Half Day, L = Leave.
                </div>
              </div>

              <div className="card">
                <div className="section-head"><h3>{selectedEmployee ? `${selectedEmployee.name} Day-wise Detail` : 'Employee Summary'}</h3></div>
                {selectedEmployee ? (
                  <div className="table-wrap large-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Day</th>
                          <th>Status</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Extra Day</th>
                          <th>OT Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployeeDetailRows.map((item) => (
                          <tr key={item.date}>
                            <td>{item.date}</td>
                            <td>{item.dayName}</td>
                            <td>{item.status}</td>
                            <td>{item.checkIn}</td>
                            <td>{item.checkOut}</td>
                            <td>{roundDisplay(item.extraDay)}</td>
                            <td>{roundDisplay(item.overtimeHours)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="table-wrap large-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Department</th>
                          <th>Payment Number / ID</th>
                          <th>ID Type</th>
                          <th>ID Number</th>
                          <th>Joining Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id}>
                            <td>{employee.employeeCode}</td>
                            <td>{employee.name}</td>
                            <td>{employee.department}</td>
                            <td>{employee.paymentNumber || '-'}</td>
                            <td>{employee.idType || '-'}</td>
                            <td>{employee.idNumber || '-'}</td>
                            <td>{employee.joiningDate}</td>
                          </tr>
                        ))}
                        {!employees.length && (
                          <tr><td colSpan="7" className="empty">No employees found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <footer className="app-footer">Developed and Designed by Fahim</footer>
      </main>

      {loading && <div className="loading-bar" />}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
