package com.company.attendance.service;

import com.company.attendance.dto.SalaryReportItem;
import com.company.attendance.entity.Attendance;
import com.company.attendance.entity.AttendanceStatus;
import com.company.attendance.entity.Employee;
import com.company.attendance.repository.AttendanceRepository;
import com.company.attendance.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class SalaryService {
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    public SalaryService(EmployeeRepository employeeRepository, AttendanceRepository attendanceRepository) {
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public List<SalaryReportItem> generateMonthlyReport(Integer year, Integer month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        int totalDays = yearMonth.lengthOfMonth();
        List<SalaryReportItem> report = new ArrayList<>();

        for (Employee employee : employeeRepository.findAll()) {
            List<Attendance> entries = attendanceRepository.findByEmployeeIdAndDateBetween(
                    employee.getId(),
                    yearMonth.atDay(1),
                    yearMonth.atEndOfMonth()
            );

            long presentDays = entries.stream().filter(e -> e.getStatus() == AttendanceStatus.PRESENT).count();
            long halfDays    = entries.stream().filter(e -> e.getStatus() == AttendanceStatus.HALF_DAY).count();
            long absentDays  = entries.stream().filter(e -> e.getStatus() == AttendanceStatus.ABSENT).count();
            long leaveDays   = entries.stream().filter(e -> e.getStatus() == AttendanceStatus.LEAVE).count();

            double payableDays = presentDays + halfDays * 0.5;

            BigDecimal extraDaysTotal    = entries.stream()
                    .map(e -> e.getExtraDay() != null ? e.getExtraDay() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal overtimeHoursTotal = entries.stream()
                    .map(e -> e.getOvertimeHours() != null ? e.getOvertimeHours() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal perDay = employee.getSalary().divide(BigDecimal.valueOf(totalDays), 4, RoundingMode.HALF_UP);
            BigDecimal perHour = perDay.divide(BigDecimal.valueOf(8), 4, RoundingMode.HALF_UP);

            BigDecimal attendanceSalary = perDay.multiply(BigDecimal.valueOf(payableDays)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal extraDayPay      = perDay.multiply(extraDaysTotal).setScale(2, RoundingMode.HALF_UP);
            BigDecimal overtimePay      = perHour.multiply(overtimeHoursTotal).setScale(2, RoundingMode.HALF_UP);
            BigDecimal finalSalary      = attendanceSalary.add(extraDayPay).add(overtimePay).setScale(2, RoundingMode.HALF_UP);

            report.add(new SalaryReportItem(
                    employee.getId(),
                    employee.getEmployeeCode(),
                    employee.getName(),
                    employee.getDepartment(),
                    employee.getSalary(),
                    totalDays,
                    payableDays,
                    attendanceSalary,
                    extraDaysTotal,
                    extraDayPay,
                    overtimeHoursTotal,
                    overtimePay,
                    finalSalary,
                    employee.getPaymentNumber(),
                    presentDays,
                    halfDays,
                    absentDays,
                    leaveDays
            ));
        }
        return report;
    }
}
