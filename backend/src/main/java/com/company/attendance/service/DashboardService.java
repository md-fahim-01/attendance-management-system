package com.company.attendance.service;

import com.company.attendance.dto.DashboardSummaryResponse;
import com.company.attendance.entity.AttendanceStatus;
import com.company.attendance.repository.AttendanceRepository;
import com.company.attendance.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class DashboardService {
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    public DashboardService(EmployeeRepository employeeRepository, AttendanceRepository attendanceRepository) {
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public DashboardSummaryResponse summary() {
        LocalDate today = LocalDate.now();
        BigDecimal totalSalary = employeeRepository.findAll().stream()
                .map(e -> e.getSalary())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardSummaryResponse(
                employeeRepository.count(),
                attendanceRepository.countByDateAndStatus(today, AttendanceStatus.PRESENT),
                attendanceRepository.countByDateAndStatus(today, AttendanceStatus.ABSENT),
                attendanceRepository.countByDateAndStatus(today, AttendanceStatus.LEAVE),
                totalSalary
        );
    }
}
