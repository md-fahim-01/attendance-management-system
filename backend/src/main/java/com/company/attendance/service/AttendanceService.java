package com.company.attendance.service;

import com.company.attendance.dto.AttendanceMarkRequest;
import com.company.attendance.entity.Attendance;
import com.company.attendance.entity.Employee;
import com.company.attendance.exception.BadRequestException;
import com.company.attendance.repository.AttendanceRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@Service
public class AttendanceService {
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final AttendanceRepository attendanceRepository;
    private final EmployeeService employeeService;

    public AttendanceService(AttendanceRepository attendanceRepository, EmployeeService employeeService) {
        this.attendanceRepository = attendanceRepository;
        this.employeeService = employeeService;
    }

    public Attendance mark(AttendanceMarkRequest request) {
        Employee employee = employeeService.getById(request.getEmployeeId());
        Attendance attendance = attendanceRepository.findByEmployeeIdAndDate(request.getEmployeeId(), request.getDate())
                .orElseGet(Attendance::new);

        attendance.setEmployee(employee);
        attendance.setDate(request.getDate());
        attendance.setStatus(request.getStatus());
        attendance.setCheckIn(request.getCheckIn());
        attendance.setCheckOut(request.getCheckOut());
        attendance.setExtraDay(normalizeDecimal(request.getExtraDay()));
        attendance.setOvertimeHours(normalizeDecimal(request.getOvertimeHours()));

        validateAttendance(attendance);
        return attendanceRepository.save(attendance);
    }

    public List<Attendance> getByDate(LocalDate date) {
        return attendanceRepository.findByDate(date).stream()
                .sorted(Comparator.comparing(item -> item.getEmployee().getEmployeeCode()))
                .toList();
    }

    public List<Attendance> getMonthly(Integer year, Integer month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return attendanceRepository.findByDateBetween(yearMonth.atDay(1), yearMonth.atEndOfMonth()).stream()
                .sorted(Comparator.comparing(Attendance::getDate)
                        .thenComparing(item -> item.getEmployee().getEmployeeCode()))
                .toList();
    }

    private void validateAttendance(Attendance attendance) {
        if (attendance.getCheckIn() != null && attendance.getCheckOut() != null && attendance.getCheckOut().isBefore(attendance.getCheckIn())) {
            throw new BadRequestException("Check-out cannot be earlier than check-in");
        }
        if (attendance.getExtraDay() != null && attendance.getExtraDay().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Extra day cannot be negative");
        }
        if (attendance.getOvertimeHours() != null && attendance.getOvertimeHours().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Overtime hours cannot be negative");
        }
    }

    private BigDecimal normalizeDecimal(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
