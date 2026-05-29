package com.company.attendance.controller;

import com.company.attendance.dto.SalaryReportItem;
import com.company.attendance.entity.Attendance;
import com.company.attendance.entity.Employee;
import com.company.attendance.service.AttendanceService;
import com.company.attendance.service.EmployeeService;
import com.company.attendance.service.SalaryService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final AttendanceService attendanceService;
    private final SalaryService salaryService;
    private final EmployeeService employeeService;

    public ReportController(AttendanceService attendanceService, SalaryService salaryService, EmployeeService employeeService) {
        this.attendanceService = attendanceService;
        this.salaryService = salaryService;
        this.employeeService = employeeService;
    }

    @GetMapping("/attendance/export")
    public ResponseEntity<String> exportAttendance(
            @RequestParam Integer year,
            @RequestParam Integer month,
            @RequestParam(required = false) Long employeeId
    ) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate today = LocalDate.now();
        LocalDate endDate = (today.getYear() == year && today.getMonthValue() == month)
                ? today
                : yearMonth.atEndOfMonth();

        List<Employee> employees = (employeeId == null)
                ? employeeService.getAll(null).stream()
                    .sorted(Comparator.comparing(Employee::getEmployeeCode))
                    .toList()
                : List.of(employeeService.getById(employeeId));

        Map<Long, Map<LocalDate, Attendance>> attendanceMap = new LinkedHashMap<>();
        for (Attendance attendance : attendanceService.getMonthly(year, month)) {
            if (attendance.getDate().isAfter(endDate)) {
                continue;
            }
            attendanceMap
                    .computeIfAbsent(attendance.getEmployee().getId(), key -> new LinkedHashMap<>())
                    .put(attendance.getDate(), attendance);
        }

        StringJoiner csv = new StringJoiner("\n");
        StringJoiner header = new StringJoiner(",");
        header.add("Employee Code");
        header.add("Employee Name");
        header.add("Department");
        for (int day = 1; day <= endDate.getDayOfMonth(); day++) {
            header.add(String.format("%02d", day));
        }
        header.add("Present Days");
        header.add("Half Days");
        header.add("Absent Days");
        header.add("Leave Days");
        header.add("Extra Days");
        header.add("Overtime Hours");
        csv.add(header.toString());

        for (Employee employee : employees) {
            Map<LocalDate, Attendance> employeeAttendance = attendanceMap.getOrDefault(employee.getId(), Map.of());
            StringJoiner row = new StringJoiner(",");
            row.add(csvEscape(employee.getEmployeeCode()));
            row.add(csvEscape(employee.getName()));
            row.add(csvEscape(employee.getDepartment()));

            long presentDays = 0;
            long halfDays = 0;
            long absentDays = 0;
            long leaveDays = 0;
            BigDecimal extraDays = BigDecimal.ZERO;
            BigDecimal overtimeHours = BigDecimal.ZERO;

            for (int day = 1; day <= endDate.getDayOfMonth(); day++) {
                LocalDate date = yearMonth.atDay(day);
                Attendance attendance = employeeAttendance.get(date);
                row.add(csvEscape(attendanceCode(attendance)));
                if (attendance == null) {
                    continue;
                }

                switch (attendance.getStatus()) {
                    case PRESENT -> presentDays++;
                    case HALF_DAY -> halfDays++;
                    case ABSENT -> absentDays++;
                    case LEAVE -> leaveDays++;
                }
                extraDays = extraDays.add(nullSafe(attendance.getExtraDay()));
                overtimeHours = overtimeHours.add(nullSafe(attendance.getOvertimeHours()));
            }

            row.add(String.valueOf(presentDays));
            row.add(String.valueOf(halfDays));
            row.add(String.valueOf(absentDays));
            row.add(String.valueOf(leaveDays));
            row.add(extraDays.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
            row.add(overtimeHours.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
            csv.add(row.toString());
        }

        String filename = employeeId == null
                ? String.format("attendance-register-%d-%02d.csv", year, month)
                : String.format("attendance-register-%d-%02d-employee-%d.csv", year, month, employeeId);
        return csvResponse(csv.toString(), filename);
    }

    @GetMapping("/salary/export")
    public ResponseEntity<String> exportSalary(@RequestParam Integer year, @RequestParam Integer month) {
        List<SalaryReportItem> report = salaryService.generateMonthlyReport(year, month);
        StringJoiner csv = new StringJoiner("\n");
        csv.add("Employee Code,Employee Name,Department,Monthly Salary,Working Days,Present Days,Half Days,Absent Days,Leave Days,Payable Days,Attendance Salary,Extra Days,Extra Day Pay,Overtime Hours,Overtime Pay,Final Salary,Payment Number / Payment ID");
        for (SalaryReportItem item : report) {
            csv.add(String.join(",",
                    csvEscape(item.employeeCode()),
                    csvEscape(item.employeeName()),
                    csvEscape(item.department()),
                    item.monthlySalary().toPlainString(),
                    String.valueOf(item.totalWorkingDays()),
                    String.valueOf(item.presentDays()),
                    String.valueOf(item.halfDays()),
                    String.valueOf(item.absentDays()),
                    String.valueOf(item.leaveDays()),
                    String.valueOf(item.payableDays()),
                    item.attendanceSalary().toPlainString(),
                    item.extraDays().toPlainString(),
                    item.extraDayPay().toPlainString(),
                    item.overtimeHours().toPlainString(),
                    item.overtimePay().toPlainString(),
                    item.finalSalary().toPlainString(),
                    csvEscape(item.paymentNumber())
            ));
        }
        return csvResponse(csv.toString(), String.format("salary-report-%d-%02d.csv", year, month));
    }

    @GetMapping("/employees/summary")
    public List<Employee> employeeSummary() {
        return employeeService.getAll(null);
    }

    @GetMapping("/today")
    public List<Attendance> todayReport() {
        return attendanceService.getByDate(LocalDate.now());
    }

    private String attendanceCode(Attendance attendance) {
        if (attendance == null) {
            return "-";
        }
        return switch (attendance.getStatus()) {
            case PRESENT -> "P";
            case ABSENT -> "A";
            case HALF_DAY -> "HD";
            case LEAVE -> "L";
        };
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String csvEscape(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }

    private ResponseEntity<String> csvResponse(String data, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(new MediaType("text", "csv"))
                .body(data);
    }
}
