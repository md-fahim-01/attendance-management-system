package com.company.attendance.dto;

import java.math.BigDecimal;

public record SalaryReportItem(
        Long employeeId,
        String employeeCode,
        String employeeName,
        String department,
        BigDecimal monthlySalary,
        int totalWorkingDays,
        double payableDays,
        BigDecimal attendanceSalary,
        BigDecimal extraDays,
        BigDecimal extraDayPay,
        BigDecimal overtimeHours,
        BigDecimal overtimePay,
        BigDecimal finalSalary,
        String paymentNumber,
        long presentDays,
        long halfDays,
        long absentDays,
        long leaveDays
) {
}
